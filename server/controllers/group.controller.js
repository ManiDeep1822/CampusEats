const asyncHandler = require('express-async-handler');
const GroupCart = require('../models/GroupCart');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Notification = require('../models/Notification');

// Helper to generate unique 6-character code
const generateJoinCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// @desc    Create a new group cart
// @route   POST /api/group/create
// @access  Private/Student
const createGroupCart = asyncHandler(async (req, res) => {
  const { vendorId, initialItems } = req.body;

  if (!vendorId) {
    res.status(400);
    throw new Error('Vendor ID is required');
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  // Remove any previous active group for this host
  const existingCart = await GroupCart.findOne({ hostId: req.user._id, status: 'active' });
  if (existingCart) {
    await GroupCart.deleteOne({ _id: existingCart._id });
  }

  const joinCode = generateJoinCode();

  // Seed host's items from their local cart if provided
  let hostItems = [];
  let totalAmount = 0;
  if (Array.isArray(initialItems) && initialItems.length > 0) {
    for (const cartItem of initialItems) {
      const menuItem = await MenuItem.findById(cartItem.menuItemId);
      if (menuItem) {
        const qty = cartItem.quantity || 1;
        hostItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: qty
        });
        totalAmount += menuItem.price * qty;
      }
    }
  }

  const groupCart = await GroupCart.create({
    hostId: req.user._id,
    vendorId,
    joinCode,
    totalAmount,
    members: [{
      userId: req.user._id,
      name: req.user.name,
      items: hostItems
    }]
  });

  const populatedCart = await GroupCart.findById(groupCart._id).populate('members.userId', 'name profilePic');
  res.status(201).json(populatedCart);
});

// @desc    Join an existing group cart
// @route   POST /api/group/join
// @access  Private/Student
const joinGroupCart = asyncHandler(async (req, res) => {
  const { joinCode } = req.body;

  const groupCart = await GroupCart.findOne({ joinCode, status: 'active' });
  if (!groupCart) {
    res.status(404);
    throw new Error('Invalid or expired join code');
  }

  if (groupCart.members.length >= 5) {
    res.status(400);
    throw new Error('Group is full (Max 5 members)');
  }

  // Check if already a member
  const isMember = groupCart.members.find(m => m.userId.toString() === req.user._id.toString());
  if (isMember) {
    return res.json(groupCart);
  }

  groupCart.members.push({
    userId: req.user._id,
    name: req.user.name,
    items: []
  });

  await groupCart.save();
  const populatedCart = await GroupCart.findById(groupCart._id).populate('members.userId', 'name profilePic');

  // Socket notification will be handled in the socket.js layer or after returning
  res.json(populatedCart);
});

// @desc    Get group cart status
// @route   GET /api/group/:joinCode
// @access  Private/Student
const getGroupCart = asyncHandler(async (req, res) => {
  const groupCart = await GroupCart.findOne({ joinCode: req.params.joinCode })
    .populate('vendorId', 'shopName location isOpen shopImage')
    .populate('members.userId', 'name profilePic');

  if (!groupCart) {
    res.status(404);
    throw new Error('Group cart not found');
  }

  res.json(groupCart);
});

// @desc    Add item to one's own list in a group cart
// @route   POST /api/group/add-item
// @access  Private/Student
const addItemToGroup = asyncHandler(async (req, res) => {
  const { joinCode, menuItemId, quantity } = req.body;

  const groupCart = await GroupCart.findOne({ joinCode, status: 'active' });
  if (!groupCart) {
    res.status(404);
    throw new Error('Group cart not active or found');
  }

  const member = groupCart.members.find(m => m.userId.toString() === req.user._id.toString());
  if (!member) {
    res.status(403);
    throw new Error('You are not a member of this group');
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    res.status(404);
    throw new Error('Menu item not found');
  }

  // Check if item already exists for this member
  const existingItem = member.items.find(i => i.menuItemId.toString() === menuItemId.toString());
  if (existingItem) {
    existingItem.quantity += (quantity || 1);
  } else {
    member.items.push({
      menuItemId: menuItem._id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: quantity || 1
    });
  }

  // Update total amount
  groupCart.totalAmount += menuItem.price * (quantity || 1);
  await groupCart.save();
  
  const populatedCart = await GroupCart.findById(groupCart._id).populate('members.userId', 'name profilePic');
  res.json(populatedCart);
});

// @desc    Remove item from one's own list in a group cart
// @route   POST /api/group/remove-item
// @access  Private/Student
const removeItemFromGroup = asyncHandler(async (req, res) => {
  const { joinCode, menuItemId } = req.body;

  const groupCart = await GroupCart.findOne({ joinCode, status: 'active' });
  if (!groupCart) {
    res.status(404);
    throw new Error('Group cart not active or found');
  }

  const member = groupCart.members.find(m => m.userId.toString() === req.user._id.toString());
  if (!member) {
    res.status(403);
    throw new Error('You are not a member of this group');
  }

  const itemIndex = member.items.findIndex(i => i.menuItemId.toString() === menuItemId.toString());
  if (itemIndex === -1) {
    res.status(404);
    throw new Error('Item not found in your cart');
  }

  const item = member.items[itemIndex];
  groupCart.totalAmount -= item.price * item.quantity;
  member.items.splice(itemIndex, 1);

  await groupCart.save();
  const populatedCart = await GroupCart.findById(groupCart._id).populate('members.userId', 'name profilePic');
  res.json(populatedCart);
});

// @desc    Convert group cart to order (Host only)
// @route   POST /api/group/checkout
// @access  Private/Student
const checkoutGroupCart = asyncHandler(async (req, res) => {
  const { joinCode, deliveryAddress, paymentId, orderType } = req.body;

  const groupCart = await GroupCart.findOne({ joinCode, status: 'active' });
  if (!groupCart) {
    res.status(404);
    throw new Error('Group cart not found');
  }

  if (groupCart.hostId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Only the host can initiate checkout');
  }

  // Combine all items into one list for the main Order
  const allItems = [];
  const groupSplits = [];

  groupCart.members.forEach(member => {
    let memberSubtotal = 0;
    const memberItems = member.items.map(i => {
      memberSubtotal += i.price * i.quantity;
      return {
        menuItemId: i.menuItemId,
        quantity: i.quantity,
        price: i.price
      };
    });

    allItems.push(...memberItems);
    groupSplits.push({
      studentId: member.userId,
      items: memberItems,
      subtotal: memberSubtotal
    });
  });

  if (allItems.length === 0) {
    res.status(400);
    throw new Error('Group cart is empty');
  }

  // Calculate fees (Simplified - platform fee 5, delivery fee based on total)
  const subtotal = groupCart.totalAmount;
  const deliveryFee = orderType === 'take_away' ? 0 : (subtotal > 200 ? 0 : 15);
  const platformFee = 5;
  const taxes = Number((subtotal * 0.05).toFixed(2));
  const finalTotal = Number((subtotal + deliveryFee + platformFee + taxes).toFixed(2));

  // Create the Order
  const orderId = 'ORD' + Date.now();
  const order = new Order({
    orderId,
    studentId: req.user._id, // Host pays all
    vendorId: groupCart.vendorId,
    items: allItems,
    orderType: orderType || 'delivery',
    deliveryAddress: orderType === 'take_away' ? 'Pickup from Restaurant' : (deliveryAddress || 'Campus Central'),
    totalAmount: finalTotal,
    taxAmount: taxes,
    deliveryFee,
    platformFee,
    // paymentId is intentionally omitted here — set by payment.controller.js after Razorpay verification
    status: 'pending_payment',
    isGroupOrder: true,
    groupSplits
  });

  const createdOrder = await order.save();

  // NOTE: We do NOT mark the group as 'converted' here.
  // The group cart will be marked converted only after Razorpay payment verification succeeds.
  // This prevents the group from being destroyed if the user closes the payment modal.

  res.status(201).json({ ...createdOrder.toObject(), joinCode });
});

module.exports = {
  createGroupCart,
  joinGroupCart,
  getGroupCart,
  addItemToGroup,
  removeItemFromGroup,
  checkoutGroupCart
};
