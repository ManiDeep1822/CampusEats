const jwt = require('jsonwebtoken');
const xss = require('xss');
const Vendor = require('../models/Vendor');
const DeliveryBoy = require('../models/DeliveryBoy');

const socketHandler = (io) => {
  // H2: Socket.IO Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      if (!process.env.JWT_SECRET) {
        return next(new Error('Authentication error: Server configuration issue'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.decoded = decoded; // Store for later use
      next();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Socket Auth] Rejected: ${err.message}`);
      }
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log('⚡ Authenticated client connected:', socket.id, '(User:', socket.decoded.id, ')');

    socket.on('join_room', async ({ userId, role }) => {
      // H2: Verify the userId matches the token ID
      if (!userId || userId !== socket.decoded.id) {
         console.log(`❌ Socket ${socket.id} tried to join unauthorized room: ${userId}`);
         return;
      }
      const room = `${role}:${userId}`;
      socket.join(room);
      
      // Join a role-wide room for broad broadcasts
      const roleRoom = `role:${role}`;
      socket.join(roleRoom);

      try {
        if (role === 'vendor') {
          const vendor = await Vendor.findOne({ userId });
          if (vendor) {
            const vendorEntityRoom = `vendor:${vendor._id}`;
            socket.join(vendorEntityRoom);
          }
        } else if (role === 'delivery') {
          const boy = await DeliveryBoy.findOne({ userId });
          if (boy) {
            const deliveryEntityRoom = `delivery:${boy._id}`;
            socket.join(deliveryEntityRoom);
          }
        }
      } catch (err) {
        console.error(`❌ Error joining entity rooms for socket ${socket.id}:`, err.message);
      }
      
      console.log(`✅ Socket ${socket.id} joined rooms: [${room}, ${roleRoom}]`);
    });

    socket.on('send_message', async (data) => {
      const { to, message, sender, orderId, replyTo } = data;
      
      // H3: Sanitize message to prevent XSS
      const cleanMessage = xss(message);
      
      // SECURITY: Ensure sender ID matches the token ID
      if (sender !== socket.decoded.id) {
        console.warn(`⚠️ Spoofing attempt detected: ${socket.id} tried to send as ${sender}`);
        return;
      }

      console.log(`[SOCKET] Message from ${sender} to room ${to}: ${cleanMessage}`);

      try {
        const Order = require('../models/Order');
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            $push: { chatHistory: { sender, message: cleanMessage, timestamp: Date.now() } }
          });
        }

        io.to(to).emit('receive_message', {
          orderId,
          message: cleanMessage,
          sender,
          timestamp: Date.now(),
          replyTo,
          to,
          isMe: false
        });
      } catch (err) {
        console.error('[SOCKET] Message delivery/persistence failed:', err);
      }
    });

    socket.on('rider_location_update', (data) => {
      if (data.to && data.lat && data.lng) {
        // Ensure only riders can broadcast location
        // ... (can add more restrictive role check here if needed)
        io.to(data.to).emit('rider_location_update', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
