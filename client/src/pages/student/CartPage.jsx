import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { FiMinus, FiPlus, FiMapPin } from 'react-icons/fi';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CartPage = () => {
  const { items, vendorId } = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [bill, setBill] = useState(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const fetchBill = async () => {
      setCalculating(true);
      try {
        const payload = { vendorId, items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })) };
        const { data } = await api.post('/student/calculate-bill', payload);
        setBill(data);
      } catch (error) { toast.error("Error computing live bill"); } finally { setCalculating(false); }
    };
    
    // Auto debounce fetching slightly so fast clickers don't spam the server
    const timeout = setTimeout(() => fetchBill(), 300);
    return () => clearTimeout(timeout);
  }, [items, vendorId]);

  const handleProceed = () => {
    if (!address) { alert("Please enter a delivery address"); return; }
    if (!bill) { alert("Please wait for the bill to finish calculating"); return; }
    navigate('/student/checkout', { state: { address, instructions, finalTotal: bill.finalTotal } });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold font-heading mb-2">Your cart is empty</h2>
        <p className="text-textSecondary mb-6">Looks like you haven't added anything yet.</p>
        <Link to="/student/home" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition">Browse Restaurants</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 max-sm:py-6">
      <div className="max-w-4xl mx-auto flex flex-row gap-8 max-sm:flex-col max-sm:gap-6">
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-sm:p-5">
          <h2 className="text-2xl font-bold font-heading mb-6 border-b border-gray-50 pb-4 max-sm:text-xl">Order Summary</h2>
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.menuItemId} className="flex flex-row justify-between items-center gap-3 max-sm:flex-col max-sm:items-start">
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
                    <button onClick={() => dispatch(removeFromCart(item.menuItemId))} className="p-1.5 text-gray-500 hover:text-primary transition-colors"><FiMinus size={14}/></button>
                    <span className="w-8 text-center text-sm font-extrabold text-gray-800">{item.quantity}</span>
                    <button onClick={() => dispatch(addToCart(item))} className="p-1.5 text-gray-500 hover:text-primary transition-colors"><FiPlus size={14}/></button>
                  </div>
                  <div className="w-20 text-right font-bold text-textPrimary">₹{item.price * item.quantity}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-gray-50 space-y-5">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <FiMapPin className="text-primary" /> Delivery Details
            </h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Hostel Block, Room No..." 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium" 
              />
              <textarea 
                value={instructions} 
                onChange={e => setInstructions(e.target.value)} 
                placeholder="Cooking instructions (e.g. Make it spicy, Don't ring bell)..." 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-24 text-sm font-medium resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="w-80 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50 border border-gray-100 h-fit max-md:w-full max-sm:sticky max-sm:bottom-4">
          <h2 className="text-lg font-bold mb-5 text-gray-800">Live Bill Details</h2>
          {calculating || !bill ? (
             <div className="py-12 text-center text-sm text-gray-400 flex flex-col items-center">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-medium">Calculating best prices...</p>
             </div>
          ) : (
             <>
               <div className="space-y-3.5 text-sm text-textSecondary mb-6">
                 <div className="flex justify-between items-center"><span>Item Total</span><span className="font-bold text-textPrimary">₹{bill.subtotal.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-1.5">
                     <span>Delivery Fee</span>
                     <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">{bill.distance}km</span>
                   </div>
                   <span className="font-bold text-textPrimary">₹{bill.deliveryFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between items-center"><span>Platform Fee</span><span className="font-bold text-textPrimary">₹{bill.platformFee.toFixed(2)}</span></div>
                 <div className="flex justify-between items-center"><span>Taxes & GST (5%)</span><span className="font-bold text-textPrimary">₹{bill.taxes.toFixed(2)}</span></div>
               </div>
               <div className="border-t border-dashed border-gray-200 pt-5 flex justify-between font-extrabold text-xl mb-6 text-textPrimary">
                 <span>To Pay</span>
                 <span className="text-primary">₹{bill.finalTotal.toFixed(2)}</span>
               </div>
               <button 
                 onClick={handleProceed} 
                 className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 active:scale-[0.98]"
               >
                 Proceed to Checkout
               </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
export default CartPage;
