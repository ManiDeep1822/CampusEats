import React from 'react';
import { FiMinus, FiPlus } from 'react-icons/fi';
import { motion } from 'framer-motion';

const CartItem = React.memo(({ item, onAdd, onRemove }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-row justify-between items-center gap-3 max-sm:flex-col max-sm:items-start"
    >
      <div className="flex-1 pr-4">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${item.isVeg ? 'border-accent' : 'border-red-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-accent' : 'bg-red-500'}`}></div>
          </div>
          <span className="font-bold text-textPrimary leading-tight">{item.name}</span>
        </div>
        <div className="hidden max-sm:block text-xs text-textSecondary">₹{item.price} per item</div>
      </div>
      <div className="flex items-center justify-between gap-4 max-sm:w-full">
        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-xl px-2 py-1">
          <button 
            type="button"
            onClick={() => onRemove(item.menuItemId)} 
            className="p-1.5 text-gray-500 hover:text-primary transition-colors active:scale-90"
          >
            <FiMinus size={14}/>
          </button>
          <span className="w-8 text-center text-sm font-extrabold text-gray-800">{item.quantity}</span>
          <button 
            type="button"
            onClick={() => onAdd(item)} 
            className="p-1.5 text-gray-500 hover:text-primary transition-colors active:scale-90"
          >
            <FiPlus size={14}/>
          </button>
        </div>
        <div className="w-20 text-right font-bold text-textPrimary">₹{item.price * item.quantity}</div>
      </div>
    </motion.div>
  );
});

CartItem.displayName = 'CartItem';

export default CartItem;
