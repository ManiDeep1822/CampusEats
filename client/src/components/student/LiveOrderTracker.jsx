import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiPackage, FiTruck, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import api from '../../services/api';
import { useSocketContext } from '../../context/SocketContext';

const LiveOrderTracker = () => {
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const socket = useSocketContext();
  const navigate = useNavigate();

  const fetchActiveOrder = async () => {
    try {
      const { data } = await api.get('/student/orders');
      // Find the most recent order that is not delivered or cancelled
      const active = data.find(order => !['delivered', 'cancelled'].includes(order.status));
      setActiveOrder(active);
    } catch (error) {
      console.error('Error fetching active order:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrder();

    if (socket) {
      const handleStatusUpdate = (data) => {
        // If the update is for our current order, update it locally for instant feedback
        if (activeOrder && data.orderId === activeOrder._id) {
          setActiveOrder(prev => ({ ...prev, status: data.status || prev.status }));
        } else {
          // If we don't have an active order loaded yet, or it's a different one, refresh
          fetchActiveOrder();
        }
      };

      socket.on('order:confirmed', (data) => handleStatusUpdate({ ...data, status: 'confirmed' }));
      socket.on('order:preparing', (data) => handleStatusUpdate({ ...data, status: 'preparing' }));
      socket.on('order:ready',     (data) => handleStatusUpdate({ ...data, status: 'ready' }));
      socket.on('order:rider_assigned', (data) => handleStatusUpdate({ ...data, status: 'confirmed' })); // Show progress
      socket.on('order:picked_up', (data) => handleStatusUpdate({ ...data, status: 'picked_up' }));
      socket.on('order:delivered', () => setActiveOrder(null));
      socket.on('order:cancelled', (data) => {
          if (activeOrder && data.orderId === activeOrder._id) setActiveOrder(null);
          else fetchActiveOrder();
      });

      return () => {
        socket.off('order:confirmed');
        socket.off('order:preparing');
        socket.off('order:ready');
        socket.off('order:rider_assigned');
        socket.off('order:picked_up');
        socket.off('order:delivered');
        socket.off('order:cancelled');
      };
    }
    // Only re-run if socket changes; internal state updates handle the rest
  }, [socket, activeOrder?._id]);

  if (loading || !activeOrder) return null;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'placed': return { label: 'Order Placed', icon: <FiPackage />, color: 'text-blue-500', bg: 'bg-blue-50', progress: 20 };
      case 'confirmed': return { label: 'Confirmed', icon: <FiCheckCircle />, color: 'text-indigo-500', bg: 'bg-indigo-50', progress: 40 };
      case 'preparing': return { label: 'Cooking', icon: <span className="animate-pulse">🍳</span>, color: 'text-orange-500', bg: 'bg-orange-50', progress: 60 };
      case 'ready': return { label: 'Ready for Pickup', icon: <FiPackage className="animate-bounce" />, color: 'text-green-500', bg: 'bg-green-50', progress: 80 };
      case 'picked_up': return { label: 'Out for Delivery', icon: <FiTruck className="translate-x-1" />, color: 'text-primary', bg: 'bg-orange-100', progress: 90 };
      default: return { label: 'Processing', icon: <FiClock />, color: 'text-gray-500', bg: 'bg-gray-50', progress: 10 };
    }
  };

  const statusInfo = getStatusInfo(activeOrder.status);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 mb-2"
      >
        <motion.div 
          onClick={() => navigate(`/student/tracking/${activeOrder._id}`)}
          whileTap={{ scale: 0.98 }}
          className="cursor-pointer group bg-white rounded-3xl border border-orange-100 shadow-xl shadow-orange-500/5 hover:shadow-orange-500/10 transition-all overflow-hidden"
        >
          <div className="flex items-center p-4 sm:p-6 gap-4 sm:gap-6 pointer-events-none">
            {/* Status Icon Bubble */}
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl ${statusInfo.bg} ${statusInfo.color} flex items-center justify-center text-2xl sm:text-3xl shrink-0 shadow-inner`}>
              {statusInfo.icon}
            </div>

            {/* Info Text */}
            <div className="flex-grow min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Live Order Status</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-800 truncate">
                {statusInfo.label} from {activeOrder.vendorId?.shopName || 'Restaurant'}
              </h3>
              
              {/* Progress Bar Container */}
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-grow h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${statusInfo.progress}%` }}
                    className="h-full bg-gradient-to-r from-orange-400 to-primary"
                  />
                </div>
                <span className="text-xs font-bold text-primary shrink-0 opacity-80 whitespace-nowrap">
                   Estimated: {new Date(activeOrder.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Action Arrow */}
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
              <FiChevronRight size={20} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveOrderTracker;
