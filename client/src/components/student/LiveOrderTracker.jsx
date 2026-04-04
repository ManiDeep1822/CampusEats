import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiPackage, FiTruck, FiCheckCircle, FiChevronRight } from 'react-icons/fi';
import api from '../../services/api';
import { useSocketContext } from '../../context/SocketContext';

const LiveOrderTracker = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef(null);

  const socket = useSocketContext();
  const navigate = useNavigate();

  const fetchActiveOrders = async () => {
    try {
      const { data } = await api.get('/student/orders');
      const active = data.filter(order => !['delivered', 'cancelled'].includes(order.status));
      setActiveOrders(active);
    } catch (error) {
      console.error('Error fetching active orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();

    if (socket) {
      const handleStatusUpdate = () => {
        fetchActiveOrders(); // Refresh safely on any update
      };

      socket.on('order:confirmed', handleStatusUpdate);
      socket.on('order:preparing', handleStatusUpdate);
      socket.on('order:ready',     handleStatusUpdate);
      socket.on('order:rider_assigned', handleStatusUpdate);
      socket.on('order:picked_up', handleStatusUpdate);
      socket.on('order:delivered', handleStatusUpdate);
      socket.on('order:cancelled', handleStatusUpdate);

      return () => {
        socket.off('order:confirmed', handleStatusUpdate);
        socket.off('order:preparing', handleStatusUpdate);
        socket.off('order:ready', handleStatusUpdate);
        socket.off('order:rider_assigned', handleStatusUpdate);
        socket.off('order:picked_up', handleStatusUpdate);
        socket.off('order:delivered', handleStatusUpdate);
        socket.off('order:cancelled', handleStatusUpdate);
      };
    }
  }, [socket]);

  // Dot Pagination Logic
  useEffect(() => {
    if (!trackRef.current || activeOrders.length <= 1) return;
    
    // Find valid order cards
    const cards = Array.from(trackRef.current.children).filter(el => el.getAttribute('data-is-card') === 'true');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = cards.indexOf(entry.target);
          if (index !== -1) setActiveIndex(index);
        }
      });
    }, {
      root: trackRef.current,
      threshold: 0.6
    });

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [activeOrders]);

  const scrollToCard = (index) => {
    if (!trackRef.current) return;
    const cards = Array.from(trackRef.current.children).filter(el => el.getAttribute('data-is-card') === 'true');
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  if (loading || activeOrders.length === 0) return null;

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full bg-slate-50/50 border-b border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex justify-center">
          <div className="pointer-events-auto relative group">
            {/* Horizontal Track for Cards */}
            <div 
              ref={trackRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 w-screen max-w-[440px] px-4 py-4"
            >
              {activeOrders.map(order => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <div 
                    key={order._id} 
                    data-is-card="true" 
                    className="snap-center shrink-0 w-full cursor-pointer"
                    onClick={() => navigate(`/student/tracking/${order._id}`)}
                  >
                    <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-sm rounded-[2rem] p-3 flex items-center gap-4 active:scale-[0.98] transition-all hover:border-primary/30">
                      {/* Status Icon with animated background */}
                      <div className={`relative w-12 h-12 ${statusInfo.bg} ${statusInfo.color} rounded-2xl flex items-center justify-center shrink-0 overflow-hidden`}>
                        <motion.div 
                          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="absolute inset-0 bg-current rounded-full"
                        />
                        <span className="relative z-10 text-xl">{statusInfo.icon}</span>
                      </div>

                      {/* Info & Progress */}
                      <div className="flex-grow min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                          <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest truncate">
                            {order.vendorId?.shopName || 'Restaurant'}
                          </span>
                        </div>
                        
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate tracking-tight">{statusInfo.label}</h3>
                          <span className="text-[10px] font-black text-primary bg-orange-50 px-2 py-0.5 rounded-full">
                            {order.estimatedDeliveryTime 
                              ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '~25 min'}
                          </span>
                        </div>

                        {/* Minimalist Progress Bar */}
                        <div className="mt-2.5 h-1.5 bg-slate-100/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${statusInfo.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-orange-400 via-primary to-rose-500"
                          />
                        </div>
                      </div>

                      {/* Action Chevron */}
                      <div className="w-8 h-8 bg-slate-100/50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-all">
                        <FiChevronRight size={16} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Dots (if multiple orders) */}
            {activeOrders.length > 1 && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-white/50 backdrop-blur-md rounded-full border border-white/20">
                {activeOrders.map((_, idx) => (
                  <button 
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); scrollToCard(idx); }}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      idx === activeIndex ? 'w-4 bg-slate-800' : 'w-1.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveOrderTracker;
