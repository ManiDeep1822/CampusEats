import React from 'react';
import { useToaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const SwipeableToaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;
  
  // For collective swipe logic
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-150, 0], [0, 1]);
  const scale = useTransform(y, [-150, 0], [0.9, 1]);

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: 24,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        overflow: 'hidden', // Prevent scrollbars during swipe
      }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      <motion.div
        style={{ 
          y, 
          opacity, 
          scale,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          padding: '20px',
          width: '100%',
        }}
        drag={toasts.length > 0 ? "y" : false}
        dragConstraints={{ top: -500, bottom: 0 }}
        dragElastic={{ top: 0.2, bottom: 0.05 }}
        onDragEnd={(_, info) => {
          // If the whole stack is swiped up strongly
          if (info.offset.y < -100 || info.velocity.y < -500) {
            toast.dismiss();
          }
          y.set(0); // Reset position
        }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t, index) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -40, scale: 0.85, filter: 'blur(4px)' }}
              animate={{ 
                opacity: 1, 
                y: 0, 
                scale: 1, 
                filter: 'blur(0px)',
                transition: { 
                  type: 'spring', 
                  stiffness: 300, 
                  damping: 25,
                  delay: index * 0.05 // Cascading enter
                } 
              }}
              exit={{ 
                opacity: 0, 
                y: -60, 
                scale: 0.9, 
                filter: 'blur(10px)',
                transition: { duration: 0.25, ease: 'easeIn' } 
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.6, bottom: 0.1 }}
              onDragEnd={(_, info) => {
                // Individual swipe up threshold
                if (info.offset.y < -60 || info.velocity.y < -300) {
                  toast.dismiss(t.id);
                }
              }}
              style={{
                cursor: 'grab',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0,0,0,0.05)',
                padding: '14px 24px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                minWidth: '320px',
                maxWidth: '450px',
                width: 'auto',
                border: '1px solid rgba(255,255,255,0.7)',
                pointerEvents: 'auto',
              }}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 shadow-inner">
                {t.type === 'success' && <span className="text-green-500 text-2xl">✓</span>}
                {t.type === 'error' && <span className="text-red-500 text-2xl">✕</span>}
                {t.type === 'loading' && <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full" />}
                {t.type === 'blank' && <span className="text-orange-500 text-2xl">🔔</span>}
              </div>
              <div className="flex-grow flex flex-col">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">Notification</span>
                <div className="text-sm font-bold text-slate-800 leading-tight">
                  {typeof t.message === 'function' ? t.message(t) : t.message}
                </div>
              </div>
              {toasts.length > 1 && (
                 <div className="text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500 font-bold whitespace-nowrap">
                   {index + 1}/{toasts.length}
                 </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Visual Swipe-Up Handle only for multiple toasts */}
        {toasts.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-1 mt-4 pointer-events-none"
          >
            <div className="w-12 h-1.5 bg-slate-300/50 rounded-full animate-bounce" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400/80">Swipe up to clear all</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default SwipeableToaster;
