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
      {/* MOBILE VIEW: Premium Full-Width Bottom Bar */}
      <div className="md:hidden">
        <motion.div 
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          className="fixed bottom-0 left-0 w-full z-50"
        >
          <div className="bg-slate-950 text-white p-6 pb-9 rounded-t-[2.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.4)] border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl text-primary border border-primary/20">
                <FiShoppingCart size={22} />
              </div>
              <div className="text-left">
                <p className="text-[11px] uppercase font-bold tracking-widest text-primary leading-none mb-1.5">{totalItems} Items Added</p>
                <p className="text-2xl font-black leading-none tracking-tight">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/student/cart')}
              className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/40 active:scale-95 transition-all flex items-center gap-2"
            >
              <span>Pay</span>
              <FiArrowRight size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* DESKTOP VIEW: Sidebar Window (Small & Elegant) */}
      <div className="hidden md:block">
        <motion.div 
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className="fixed top-24 right-8 w-72 bg-white/80 backdrop-blur-xl shadow-[0_30px_60px_rgba(0,0,0,0.12)] rounded-[2.5rem] border border-white overflow-hidden z-40 flex flex-col p-2"
        >
          <div className="bg-slate-900 text-white p-5 rounded-[2rem] mb-2">
            <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-widest opacity-90">
              <FiShoppingCart className="text-primary" /> Active Cart
            </h3>
            <div className="mt-4 flex justify-between items-end">
              <span className="text-3xl font-black tracking-tighter">₹{totalAmount.toFixed(2)}</span>
              <span className="bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold">{totalItems} ITEMS</span>
            </div>
          </div>

          <div className="px-4 py-2 max-h-[30vh] overflow-y-auto space-y-3">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700 truncate pr-2">{item.name}</span>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-gray-500 shrink-0">x{item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="p-2 pt-4">
            <button 
              onClick={() => navigate('/student/cart')}
              className="w-full bg-primary text-white py-4 rounded-[1.5rem] font-bold hover:bg-orange-600 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-orange-500/20"
            >
              <span>Pay Now</span>
              <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );


};

export default CartFloatingButton;
