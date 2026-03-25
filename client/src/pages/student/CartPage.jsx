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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold font-heading mb-2">Your cart is empty</h2>
        <p className="text-textSecondary mb-6">Looks like you haven't added anything yet.</p>
        <Link to="/student/home" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition">Browse Restaurants</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
        <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold font-heading mb-6 border-b pb-4">Order Summary</h2>
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.menuItemId} className="flex justify-between items-center">
                <div className="flex-1 pr-4">
                  <div className={`w-3 h-3 rounded-sm border inline-block mr-2 align-middle ${item.isVeg ? 'border-accent' : 'border-red-500'}`}><div className={`w-1.5 h-1.5 rounded-full m-auto mt-0.5 ${item.isVeg ? 'bg-accent' : 'bg-red-500'}`}></div></div>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center bg-gray-50 border rounded-lg px-2 py-1">
                    <button onClick={() => dispatch(removeFromCart(item.menuItemId))} className="p-1 hover:text-primary"><FiMinus size={14}/></button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => dispatch(addToCart(item))} className="p-1 hover:text-primary"><FiPlus size={14}/></button>
                  </div>
                  <div className="w-16 text-right font-medium">₹{item.price * item.quantity}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t space-y-4">
            <h3 className="font-bold">Delivery Details</h3>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-3 text-gray-400" />
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Hostel Block, Room No..." className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Instructions..." className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none h-20"></textarea>
          </div>
        </div>
        <div className="w-full md:w-80 bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-lg font-bold mb-4">Live Bill Details</h2>
          {calculating || !bill ? (
             <div className="py-10 text-center text-sm text-gray-400 flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                Calculating best prices...
             </div>
          ) : (
             <>
               <div className="space-y-3 text-sm text-textSecondary mb-4">
                 <div className="flex justify-between"><span>Item Total</span><span>₹{bill.subtotal.toFixed(2)}</span></div>
                 <div className="flex justify-between">
                   <span>Distance Fee <span className="text-[10px] bg-orange-100 text-orange-600 px-1 py-0.5 rounded ml-1 font-bold">{bill.distance}km</span></span>
                   <span>₹{bill.deliveryFee.toFixed(2)}</span>
                 </div>
                 <div className="flex justify-between"><span>Platform Fee</span><span>₹{bill.platformFee.toFixed(2)}</span></div>
                 <div className="flex justify-between"><span>Taxes & GST (5%)</span><span>₹{bill.taxes.toFixed(2)}</span></div>
               </div>
               <div className="border-t pt-4 flex justify-between font-bold text-lg mb-6"><span>To Pay</span><span>₹{bill.finalTotal.toFixed(2)}</span></div>
               <button onClick={handleProceed} className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition">Proceed to Payment</button>
             </>
          )}
        </div>
      </div>
    </div>
  );
};
export default CartPage;
