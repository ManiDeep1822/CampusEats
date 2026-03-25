const asyncHandler = require('express-async-handler');
const DeliveryBoy = require('../models/DeliveryBoy');
const Order = require('../models/Order');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');

const getMyDeliveryId = async (userId) => {
  const boy = await DeliveryBoy.findOne({ userId });
  if (!boy) throw new Error('Delivery profile not found');
  return boy._id;
};

const getDashboardStats = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId).populate('activeOrderId');
  
  res.json({
    profile: deliveryBoy,
    stats: {
      totalDeliveries: deliveryBoy.totalDeliveries,
      rating: deliveryBoy.rating,
      earnings: deliveryBoy.totalDeliveries * 20
    }
  });
});

const toggleAvailability = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
  deliveryBoy.isAvailable = !deliveryBoy.isAvailable;
  await deliveryBoy.save();
  res.json({ isAvailable: deliveryBoy.isAvailable });
});

const getAvailableOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ status: { $in: ['placed', 'confirmed', 'preparing', 'ready'] }, deliveryBoyId: null })
    .populate('vendorId', 'shopName location')
    .populate('studentId', 'name phone')
    .sort({ updatedAt: -1 });
  res.json(orders);
});

const acceptOrder = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);
  
  if (order && ['placed', 'confirmed', 'preparing', 'ready'].includes(order.status) && !order.deliveryBoyId) {
    order.deliveryBoyId = deliveryBoyId;
    await order.save();
    
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = order._id;
    deliveryBoy.isAvailable = false;
    await deliveryBoy.save();

    res.json(order);
  } else { res.status(400); throw new Error('Order not available for acceptance'); }
});

const pickUpOrder = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id);
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    // Security Check: Order MUST be ready or preparing to be picked up
    if (order.status !== 'ready' && order.status !== 'preparing') {
      res.status(400);
      throw new Error(`Cannot pick up order. Current status is ${order.status}`);
    }

    order.status = 'picked_up';
    await order.save();
    
    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const msg = '🛵 Zoom zoom! Your rider just picked up your food and is on the way!';
      io.to(studentRoom).emit('order:picked', { orderId: order._id, message: msg });

      // Persist
      await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'order_update',
        orderId: order._id
      });
    }
    
    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found or not assigned to you'); 
  }
});

const deliverOrder = asyncHandler(async (req, res) => {
  const { otp } = req.body;
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id)
    .populate('studentId', 'name email')
    .populate('vendorId', 'shopName')
    .populate('items.menuItemId', 'name price');
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    // Security Check: Order MUST be picked up to be delivered
    if (order.status !== 'picked_up') {
      res.status(400);
      throw new Error(`Cannot deliver order. Current status is ${order.status}`);
    }

    if (!order.deliveryOtp || order.deliveryOtp !== otp) {
      res.status(400); 
      throw new Error('Invalid Verification Code. Please get the correct 6-digit PIN from the student.');
    }

    order.status = 'delivered';
    order.deliveredAt = Date.now();
    order.deliveryOtp = undefined; 
    await order.save();
    
    const deliveryBoy = await DeliveryBoy.findById(deliveryBoyId);
    deliveryBoy.activeOrderId = null;
    deliveryBoy.isAvailable = true;
    deliveryBoy.totalDeliveries += 1;
    await deliveryBoy.save();

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const vendorRoom = `vendor:${order.vendorId?._id || order.vendorId}`;
      const studentMsg = '✅ Delivered! Enjoy your CampusEats meal!';
      const vendorMsg = `✅ Order #${order.orderId} was successfully delivered by the rider.`;
      
      io.to(studentRoom).emit('order:delivered', { orderId: order._id, message: studentMsg });
      io.to(vendorRoom).emit('order:delivered', { orderId: order._id, message: vendorMsg });

      // Persist for student
      await Notification.create({ recipient: order.studentId, message: studentMsg, type: 'order_update', orderId: order._id });
      // Persist for vendor
      await Notification.create({ recipient: order.vendorId, message: vendorMsg, type: 'order_update', orderId: order._id });
    }

    // Generate and dispatch beautiful HTML Email Receipt asynchronously
    const htmlReceipt = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">Order Delivered! 🎉</h1>
          <p style="color: #d1fae5; font-size: 16px; margin-top: 8px; font-weight: 400;">Thank you for choosing CampusEats</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Hi ${order.studentId?.name || 'Customer'},</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Your food from <strong>${order.vendorId?.shopName || 'CampusEats Vendor'}</strong> has been successfully handed over by your rider. We hope you enjoy your meal!
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #374151; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Receipt Summary</h3>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-weight: 500;">Order ID</span>
              <span style="color: #1e293b; font-weight: 700;">#${order.orderId}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span style="color: #64748b; font-weight: 500;">Restaurant</span>
              <span style="color: #1e293b; font-weight: 700;">${order.vendorId?.shopName || 'CampusEats Vendor'}</span>
            </div>

            <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
              <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 15px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Items Delivered</h4>
              <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
                <thead>
                  <tr style="border-bottom: 2px solid #e2e8f0; color: #475569;">
                    <th style="padding: 8px 0; font-weight: 600;">Item</th>
                    <th style="padding: 8px 0; font-weight: 600; text-align: center;">Qty</th>
                    <th style="padding: 8px 0; font-weight: 600; text-align: right;">Rate</th>
                    <th style="padding: 8px 0; font-weight: 600; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map(i => `
                    <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
                      <td style="padding: 10px 0;">${i.menuItemId?.name || 'Item'}</td>
                      <td style="padding: 10px 0; text-align: center;">${i.quantity}</td>
                      <td style="padding: 10px 0; text-align: right;">₹${i.price.toFixed(2)}</td>
                      <td style="padding: 10px 0; text-align: right; font-weight: 600;">₹${(i.price * i.quantity).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
              <span style="color: #0f172a; font-weight: 800; font-size: 18px;">Total Paid</span>
              <span style="color: #10b981; font-weight: 800; font-size: 18px;">₹${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    if (order.studentId?.email) {
      sendEmail({
        email: order.studentId.email,
        subject: `CampusEats Receipt: Order #${order.orderId} Delivered`,
        html: htmlReceipt
      }).catch(err => console.error("Receipt email failed to send:", err));
    }

    res.json(order);
  } else { 
    res.status(404); 
    throw new Error('Order not found or not assigned to you'); 
  }
});

const getOrderById = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id)
    .populate('vendorId', 'shopName location')
    .populate('studentId', 'name phone _id');
    
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    res.json(order);
  } else { 
    res.status(404); throw new Error('Order not found or not assigned to you'); 
  }
});

const sendDeliveryOTP = asyncHandler(async (req, res) => {
  const deliveryBoyId = await getMyDeliveryId(req.user._id);
  const order = await Order.findById(req.params.id).populate('studentId', 'name email');
  
  if (order && order.deliveryBoyId && order.deliveryBoyId.toString() === deliveryBoyId.toString()) {
    if (order.status !== 'picked_up') {
      res.status(400); throw new Error(`Order must be picked up before sending delivery OTP.`);
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOtp = otpCode;
    await order.save();

    const io = req.app.get('io');
    if (io) {
      const studentRoom = `student:${order.studentId?._id || order.studentId}`;
      const msg = `🚚 Your rider is waiting! Secure PIN: ${otpCode}`;
      io.to(studentRoom).emit('delivery:otp', { 
        orderId: order._id, 
        message: msg 
      });

      // Persist
      await Notification.create({
        recipient: order.studentId,
        message: msg,
        type: 'system',
        orderId: order._id
      });
    }

    res.status(200).json({ message: 'Delivery PIN pushed to Student App Notifications' });
  } else { 
    res.status(404); throw new Error('Order not found or not assigned to you'); 
  }
});

module.exports = { getDashboardStats, toggleAvailability, getAvailableOrders, acceptOrder, pickUpOrder, deliverOrder, getOrderById, sendDeliveryOTP };
