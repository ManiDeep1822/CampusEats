import React from 'react';
import { useToaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const SwipeableToaster = () => {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;
  
  // For collective swipe logic
  const groupY = useMotionValue(0);
  const groupOpacity = useTransform(groupY, [-150, 0], [0, 1]);

  // Limit visible toasts to 3 for performance and UI clarity
  const visibleToasts = toasts.slice(0, 3);
  const remainingCount = toasts.length - 3;

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
        overflow: 'hidden',
      }}
      onMouseEnter={startPause}
      onMouseLeave={endPause}
    >
      <motion.div
        style={{ 
          y: groupY, 
          opacity: groupOpacity,
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          padding: '24px',
          width: '100%',
          maxWidth: '500px',
        }}
        drag={toasts.length > 0 ? "y" : false}
        dragConstraints={{ top: -500, bottom: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.05 }}
        onDragEnd={(_, info) => {
          if (info.offset.y < -120 || info.velocity.y < -600) {
            toast.dismiss();
          }
          groupY.set(0);
        }}
      >
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', height: '80px' }}>
          <AnimatePresence mode="popLayout">
            {visibleToasts.map((t, index) => {
              const scale = 1 - index * 0.05;
              const yOffset = index * 12;
              const zIndex = 100 - index;
              const opacity = 1 - index * 0.25;

              return (
                <motion.div
                  key={t.id}
                  layout
                  // Performance: Removed 'filter: blur()'
                  initial={{ opacity: 0, y: -60, scale: 0.8 }}
                  animate={{ 
                    opacity: opacity, 
                    y: yOffset, 
                    scale: scale, 
                    zIndex: zIndex,
                    transition: { 
                      type: 'spring', 
                      stiffness: 350, 
                      damping: 30,
                    } 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -80, 
                    scale: 0.9, 
                    transition: { duration: 0.2, ease: "easeIn" } 
                  }}
                  whileHover={index === 0 ? { scale: 1.02, y: -2 } : {}}
                  whileTap={index === 0 ? { scale: 0.98 } : {}}
                  drag={index === 0 ? "y" : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0.6, bottom: 0.1 }}
                  onDragEnd={(_, info) => {
                    if (index === 0 && (info.offset.y < -60 || info.velocity.y < -300)) {
                      toast.dismiss(t.id);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    cursor: index === 0 ? 'grab' : 'default',
                    // Performance: Using high-opacity solid color instead of backdropFilter: blur()
                    backgroundColor: 'white',
                    boxShadow: index === 0 
                      ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    padding: '14px 24px',
                    borderRadius: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    minWidth: '320px',
                    maxWidth: '420px',
                    width: '90%',
                    border: '1px solid #f1f5f9',
                    pointerEvents: index === 0 ? 'auto' : 'none',
                    willChange: 'transform, opacity', // Performance hints for the browser
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-50 shadow-inner">
                    {t.type === 'success' && <span className="text-green-500 text-2xl font-bold">✓</span>}
                    {t.type === 'error' && <span className="text-red-500 text-2xl font-bold">✕</span>}
                    {t.type === 'loading' && <div className="animate-spin h-6 w-6 border-3 border-primary border-t-transparent rounded-full" />}
                    {t.type === 'blank' && <span className="text-orange-500 text-2xl">🔔</span>}
                  </div>
                  <div className="flex-grow flex flex-col overflow-hidden">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-black mb-0.5">Notification</span>
                    <div className="text-sm font-bold text-slate-800 leading-tight truncate">
                      {typeof t.message === 'function' ? t.message(t) : t.message}
                    </div>
                  </div>
                  
                  {index === 0 && remainingCount > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }}
                      className="flex-shrink-0 bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black border border-primary/20"
                    >
                      +{remainingCount + 1}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SwipeableToaster;
