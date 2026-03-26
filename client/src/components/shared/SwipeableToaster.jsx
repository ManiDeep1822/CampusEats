import React from 'react';
import { useToaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const SwipeableToaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: 16,
        left: 16,
        right: 16,
        bottom: 16,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.8, transition: { duration: 0.2 } }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.5, bottom: 0.1 }}
            onDragEnd={(_, info) => {
              // If the user drags up more than 50px, dismiss the toast
              if (info.offset.y < -50) {
                toast.dismiss(t.id);
              }
            }}
            whileTap={{ scale: 0.95 }}
            style={{
              pointerEvents: 'auto',
              cursor: 'grab',
              backgroundColor: 'white',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px 20px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: '280px',
              maxWidth: '90vw',
              border: '1px solid #f1f5f9',
            }}
          >
            <div className="flex-shrink-0">
               {t.type === 'success' && <span className="text-green-500 text-xl">✓</span>}
               {t.type === 'error' && <span className="text-red-500 text-xl">✕</span>}
               {t.type === 'loading' && <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />}
            </div>
            <div className="flex-grow text-sm font-semibold text-slate-800">
              {typeof t.message === 'function' ? t.message(t) : t.message}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SwipeableToaster;
