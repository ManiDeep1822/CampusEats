const generateReceiptHTML = (order) => {
  return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">CampusEats Receipt</h1>
        <p style="color: #d1fae5; font-size: 16px; margin-top: 8px; font-weight: 400;">Thank you for your order!</p>
      </div>
      <div style="padding: 40px 30px;">
        <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin-bottom: 20px;">Hi ${order.studentId?.name || 'Customer'},</h2>
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Your order from <strong>${order.vendorId?.shopName || 'CampusEats Vendor'}</strong> has been delivered. Below is your detailed receipt.
        </p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px;">
          <h3 style="margin-top: 0; margin-bottom: 15px; color: #374151; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Summary</h3>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b; font-weight: 500;">Order ID</span>
            <span style="color: #1e293b; font-weight: 700;">#${order.orderId}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b; font-weight: 500;">Date</span>
            <span style="color: #1e293b; font-weight: 700;">${new Date(order.deliveredAt || order.createdAt).toLocaleString()}</span>
          </div>

          <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
            <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 15px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Items</h4>
            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 2px solid #e2e8f0; color: #475569;">
                  <th style="padding: 8px 0; font-weight: 600;">Item</th>
                  <th style="padding: 8px 0; font-weight: 600; text-align: center;">Qty</th>
                  <th style="padding: 8px 0; font-weight: 600; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map(i => `
                  <tr style="border-bottom: 1px solid #f1f5f9; color: #334155;">
                    <td style="padding: 10px 0;">${i.menuItemId?.name || 'Item'}</td>
                    <td style="padding: 10px 0; text-align: center;">${i.quantity || 0}</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 600;">₹${((i.price || 0) * (i.quantity || 0)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 15px;">
            <h4 style="margin: 0 0 12px 0; color: #374151; font-size: 15px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Bill Breakdown</h4>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 500;">Item Total</span>
              <span style="color: #1e293b; font-weight: 600;">₹${(order.items.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 0), 0)).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 500;">Delivery Fee</span>
              <span style="color: #1e293b; font-weight: 600;">₹${(order.deliveryFee || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 500;">Platform Fee</span>
              <span style="color: #1e293b; font-weight: 600;">₹${(order.platformFee || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #64748b; font-weight: 500;">Taxes & GST (5%)</span>
              <span style="color: #1e293b; font-weight: 600;">₹${(order.taxAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 1px dashed #cbd5e1;">
            <span style="color: #0f172a; font-weight: 800; font-size: 18px;">Total Paid</span>
            <span style="color: #10b981; font-weight: 800; font-size: 18px;">₹${(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #94a3b8; font-size: 12px;">© ${new Date().getFullYear()} CampusEats. Digital Receipt.</p>
        </div>
      </div>
    </div>
  `;
};

module.exports = { generateReceiptHTML };
