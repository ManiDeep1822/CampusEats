const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('⚡ New client connected:', socket.id);

    socket.on('join_room', ({ userId, role }) => {
      if (!userId) {
         console.log(`❌ Socket ${socket.id} tried to join without userId`);
         return;
      }
      const room = `${role}:${userId}`;
      socket.join(room);
      
      // Join a role-wide room for broad broadcasts (e.g., all riders see ready orders)
      const roleRoom = `role:${role}`;
      socket.join(roleRoom);
      
      console.log(`✅ Socket ${socket.id} joined rooms: [${room}, ${roleRoom}]`);
    });

    socket.on('send_message', async (data) => {
      const { to, message, sender, orderId, replyTo } = data;
      console.log(`[SOCKET] Message from ${sender} (${socket.id}) to room ${to}: ${message}`);

      try {
        // Persist message to database chatHistory so it survives refreshes
        const Order = require('../models/Order');
        if (orderId) {
          await Order.findByIdAndUpdate(orderId, {
            $push: { chatHistory: { sender, message, timestamp: Date.now() } }
          });
        }

        // Broadcast to the target room
        io.to(to).emit('receive_message', {
          orderId,
          message,
          sender,
          timestamp: Date.now(),
          replyTo,
          to, // original target room helper
          isMe: false
        });
        
        console.log(`🎯 Successfully routed message to ${to}`);
      } catch (err) {
        console.error('[SOCKET] Message delivery/persistence failed:', err);
      }
    });

    socket.on('rider_location_update', (data) => {
      if (data.to && data.lat && data.lng) {
        io.to(data.to).emit('rider_location_update', data);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Client disconnected:', socket.id);
    });
  });
};

module.exports = socketHandler;
