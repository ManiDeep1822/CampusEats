import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiArrowRight } from 'react-icons/fi';

const CartFloatingButton = () => {
  const { items } = useSelector(state => state.cart);
  const navigate = useNavigate();

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (items.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 w-[calc(100%-90px)] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md z-50"
      >

        <button 
          onClick={() => navigate('/student/cart')}
          className="w-full bg-primary text-white p-3 sm:p-4 rounded-2xl shadow-2xl flex items-center justify-between hover:bg-orange-600 transition-all active:scale-[0.98] group"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <FiShoppingCart size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="text-left">
              <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest opacity-80 leading-none mb-1">{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</p>
              <p className="text-base sm:text-lg font-bold leading-none">₹{totalAmount.toFixed(2)}</p>
            </div>
          </div>

          
          <div className="flex items-center gap-2 font-bold">
            <span>Pay</span>
            <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default CartFloatingButton;
