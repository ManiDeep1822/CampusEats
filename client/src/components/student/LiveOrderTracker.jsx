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
        className="w-full relative group mt-4 mb-2 max-w-7xl mx-auto"
      >
        {/* Horizonally Scrolling Track */}
        <div 
          ref={trackRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide py-2 px-4 sm:px-[calc(50vw-190px)] gap-3"
        >
          {activeOrders.map(order => {
             const statusInfo = getStatusInfo(order.status);
             return (
               <div key={order._id} data-is-card="true" className="snap-center xl:snap-align-none shrink-0 w-[85vw] sm:w-[380px] cursor-pointer group/card" onClick={() => navigate(`/student/tracking/${order._id}`)}>
                 <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/60 flex items-center gap-3 active:scale-[0.98] transition-transform">
                    {/* Icon */}
                    <div className={`w-10 h-10 ${statusInfo.bg} ${statusInfo.color} rounded-xl flex items-center justify-center shrink-0 group-hover/card:scale-105 transition-transform`}>
                       {statusInfo.icon}
                    </div>
                    {/* Info */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0"></span>
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">{order.vendorId?.shopName || 'Restaurant'}</span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-800 truncate">{statusInfo.label}</h3>
                      <div className="mt-1.5 flex items-center gap-2 pr-2">
                        <div className="h-1 bg-slate-100 flex-grow rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${statusInfo.progress}%` }}
                            className="h-full bg-gradient-to-r from-orange-400 to-primary rounded-full"
                          />
                        </div>
                        <span className="text-[9px] font-black text-primary shrink-0">
                           {order.estimatedDeliveryTime 
                             ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                             : '~30 min'}
                         </span>
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="w-7 h-7 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 shrink-0 group-hover/card:bg-orange-50 group-hover/card:text-primary transition-colors">
                       <FiChevronRight size={14} />
                    </div>
                 </div>
               </div>
             )
          })}
        </div>

        {/* The Dots Pagination Track */}
        {activeOrders.length > 1 && (
          <div className="flex items-center justify-center w-full gap-1.5 mt-2 h-4">
            {activeOrders.map((_, idx) => (
              <div 
                key={idx}
                onClick={() => scrollToCard(idx)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeIndex ? 'w-4 h-1.5 bg-slate-800' : 'w-1.5 h-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default LiveOrderTracker;
