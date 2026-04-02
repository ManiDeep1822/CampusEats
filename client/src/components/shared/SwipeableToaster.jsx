import React from 'react';
import { useToaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SwipeableToaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  // Only show the single top-most visible toast — no ghost stacking
  const visibleToasts = toasts.filter(t => t.visible);
  const topToast = visibleToasts[0];
  const queuedCount = visibleToasts.length - 1;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: 24,
        left: 0,
        right: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      <AnimatePresence mode="wait">
        {topToast && (
          <motion.div
            key={topToast.id}
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
            exit={{ opacity: 0, y: -80, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } }}
            drag="y"
            dragConstraints={{ top: -200, bottom: 10 }}
            dragElastic={{ top: 0.5, bottom: 0.1 }}
            dragTransition={{ bounceStiffness: 400, bounceDamping: 30 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50 || info.velocity.y < -200) {
                toast.dismiss(); // Dismiss ALL on swipe-up
              }
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              cursor: 'grab',
              backgroundColor: 'white',
              boxShadow: '0 15px 35px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05)',
              padding: '10px 18px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: '260px',
              maxWidth: '350px',
              width: '90vw',
              border: '1px solid #f1f5f9',
              pointerEvents: 'auto',
              willChange: 'transform, opacity',
            }}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 shadow-inner">
              {topToast.type === 'success' && <span className="text-green-500 text-lg font-bold">✓</span>}
              {topToast.type === 'error' && <span className="text-red-500 text-lg font-bold">✕</span>}
              {topToast.type === 'loading' && <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />}
              {topToast.type === 'blank' && <span className="text-orange-500 text-lg">🔔</span>}
            </div>

            {/* Message */}
            <div className="flex-grow flex flex-col overflow-hidden py-0.5">
              <span className="text-[8px] uppercase tracking-[0.2em] text-gray-400 font-black mb-0.5">Notification</span>
              <div className="text-[13px] font-bold text-slate-800 leading-[1.3] whitespace-normal">
                {typeof topToast.message === 'function' ? topToast.message(topToast) : topToast.message}
              </div>
            </div>

            {/* Queue Count Badge — shows how many more are waiting */}
            {queuedCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex-shrink-0 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black border border-primary/20"
              >
                +{queuedCount}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SwipeableToaster;
