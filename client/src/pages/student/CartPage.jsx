import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiMinus, FiPlus, FiMapPin, FiPlusCircle, FiSettings, FiCheck, 
  FiClock, FiCheckCircle, FiChevronDown, FiArrowRight, FiShield, FiTag, FiSmartphone, FiTruck, FiInfo, FiDownload
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { addToCart, removeFromCart, clearCart } from '../../store/cartSlice';
import { setActiveOrder } from '../../store/orderSlice';
import AddressCard from '../../components/student/AddressCard';
import api from '../../services/api';
import toast from 'react-hot-toast';

const CartPage = () => {
  const { items, vendorId } = useSelector(state => state.cart);
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [bill, setBill] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [addressTag, setAddressTag] = useState('Other');
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isManageMode, setIsManageMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const getTimeSlots = () => {
    const slots = [];
    let currentTime = new Date();
    currentTime.setMinutes(currentTime.getMinutes() < 30 ? 30 : 60, 0, 0);
    for(let i=0; i<4; i++) {
        currentTime.setMinutes(currentTime.getMinutes() + 30);
        slots.push({
           value: new Date(currentTime).toISOString(),
           label: `Today at ${currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
        });
    }
    return slots;
  };

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

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const { data } = await api.get('/student/addresses');
        setSavedAddresses(data);
        // Auto-select default address if exists and current address is empty
        const defaultAddr = data.find(a => a.isDefault);
        if (defaultAddr && !address) {
          setAddress(defaultAddr.address);
        }
      } catch (error) {
        console.error("Error fetching saved addresses", error);
      } finally {
        setLoadingAddresses(false);
      }
    };
    fetchSavedAddresses();
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = async () => {
    if (!address) { toast.error("Please enter a delivery address"); return; }
    if (!bill) { toast.error("Please wait for the bill to finish calculating"); return; }

    setLoading(true);
    try {
      // Save address if requested
      if (saveThisAddress) {
        try {
          await api.post('/student/address', { address, tag: addressTag });
        } catch (e) { console.error("Could not save address", e); }
      }

      const orderPayload = {
        vendorId,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price })),
        deliveryAddress: address,
        specialInstructions: instructions || '',
        scheduledFor: scheduledFor ? scheduledFor : undefined
      };
      
      const { data: order } = await api.post('/student/order', orderPayload);
      const { data: initData } = await api.post('/payment/initiate', { orderId: order._id });

      const options = {
        key: initData.keyId,
        amount: initData.amount,
        currency: initData.currency,
        name: "CampusEats",
        description: "Food Delivery Order",
        order_id: initData.razorpayOrderId,
        handler: async function (response) {
          try {
            await api.post('/payment/verify', {
              paymentId: initData.payment._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            setPlacedOrder(order);
            setShowSuccessModal(true);
            dispatch(setActiveOrder(order));
            // Tiny delay to ensure React commits the modal state before we empty the store
            setTimeout(() => dispatch(clearCart()), 100);
          } catch (err) {
            toast.error(err.response?.data?.message || 'Payment Verification Failed');
          }
        },
        prefill: {
          name: user?.name || "Student",
          email: user?.email || "student@campuseats.com",
          contact: user?.phone || "9999999999"
        },
        theme: { color: "#F97316" }
      };

      const razorpayInstance = new window.Razorpay(options);
      razorpayInstance.on('payment.failed', (response) => toast.error(response.error.description));
      razorpayInstance.open();

    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to initiate checkout'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDownloadReceipt = (orderId) => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/student/orders/${orderId}/receipt?token=${token}`, '_blank');
  };

  const handleDeleteAddress = async (id) => {
    try {
      const { data } = await api.delete(`/student/address/${id}`);
      setSavedAddresses(data);
      toast.success("Address deleted");
      if (savedAddresses.find(a => a._id === id)?.address === address) {
        setAddress('');
      }
    } catch (error) {
      toast.error("Failed to delete address");
    }
  };

  if (items.length === 0 && !showSuccessModal) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold font-heading mb-2">Your cart is empty</h2>
        <p className="text-textSecondary mb-6">Looks like you haven&apos;t added anything yet.</p>
        <Link to="/student/home" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition">Browse Restaurants</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 max-sm:py-6">
      <div className="max-w-4xl mx-auto flex flex-row gap-8 max-sm:flex-col items-stretch max-sm:gap-6">
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

          <div className="mt-10 pt-8 border-t border-gray-100 space-y-6">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-gray-800 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <FiMapPin size={18} />
                </div>
                <span>Deliver To</span>
              </h3>
              <div className="flex items-center gap-3">
                <button 
                   onClick={() => setIsManageMode(true)}
                   className="text-xs font-bold text-gray-400 hover:text-primary transition-colors flex items-center gap-1"
                >
                   <FiSettings size={12} />
                   MANAGE
                </button>
              </div>
            </div>

            {/* Premium Address Selection Slider */}
            {savedAddresses.length > 0 && (
              <div className="relative group">
                <div className="flex gap-4 overflow-x-auto pb-8 pt-4 px-2 scrollbar-hide snap-x select-none">
                  {savedAddresses.map((addr) => (
                    <AddressCard 
                      key={addr._id}
                      address={addr}
                      isSelected={address === addr.address}
                      onClick={setAddress}
                    />
                  ))}
                  
                  {/* Add New Quick Selection */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setAddress(''); setSaveThisAddress(true); }}
                    className="flex-shrink-0 w-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/30 hover:bg-white hover:border-primary/20 transition-all p-3 text-center group h-[92px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-300 group-hover:text-primary mb-1.5 transition-colors">
                      <FiPlusCircle size={18} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:text-primary transition-colors uppercase tracking-wider">Add New</span>
                  </motion.button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="group relative">
                <input 
                  type="text" 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                  placeholder="Street, Building, Room No..." 
                  className={`w-full pl-5 pr-12 py-3.5 rounded-xl border-2 outline-none transition-all font-medium text-sm ${
                    address 
                    ? 'bg-white border-primary/20 text-gray-800' 
                    : 'bg-gray-50 border-gray-100 focus:bg-white focus:border-primary/30 text-gray-400'
                  }`}
                />
                <div className={`absolute right-5 top-1/2 -translate-y-1/2 transition-all duration-500 ${address ? 'text-primary scale-100' : 'text-transparent scale-50'}`}>
                  <FiCheck size={18} strokeWidth={3} />
                </div>
              </div>

              <AnimatePresence>
                {address && !savedAddresses.some(a => a.address === address) && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.98 }}
                    className="p-4 bg-gradient-to-br from-orange-50/50 to-white rounded-xl border border-orange-100/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                       <label className="flex items-center gap-3 cursor-pointer select-none">
                         <div className="relative">
                            <input 
                              type="checkbox" 
                              checked={saveThisAddress}
                              onChange={e => setSaveThisAddress(e.target.checked)}
                              className="peer sr-only"
                            />
                            <div className="w-4 h-4 border-2 border-gray-300 rounded peer-checked:border-primary peer-checked:bg-primary transition-all">
                                {saveThisAddress && <FiCheck className="text-white w-full h-full p-0.5" />}
                            </div>
                         </div>
                         <span className="text-xs font-bold text-gray-600 tracking-tight">Save for future orders</span>
                       </label>
                    </div>
                    
                    {saveThisAddress && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="flex flex-wrap gap-2 overflow-hidden"
                      >
                        {['Home', 'Hostel', 'Office', 'Other'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setAddressTag(tag)}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                              addressTag === tag 
                              ? 'bg-primary text-white shadow-md shadow-orange-500/20' 
                              : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-gray-100'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Prominent Delivery Schedule Section */}
              <div className="pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <FiClock className="text-primary" /> Delivery Schedule
                  </h3>
                  {scheduledFor && (
                    <span className="text-[10px] font-bold text-primary bg-orange-50 px-2 py-1 rounded-md animate-pulse">
                      Scheduled
                    </span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <button 
                    onClick={() => setScheduledFor('')}
                    className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${!scheduledFor ? 'border-primary bg-orange-50/20' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                  >
                    {!scheduledFor && <div className="absolute top-0 right-0 w-8 h-8 bg-primary text-white flex items-center justify-center rounded-bl-xl"><FiCheck size={14} /></div>}
                    <p className="font-black text-slate-800 text-xs mb-1">Deliver NOW</p>
                    <p className="text-[10px] font-medium text-slate-400">Arriving in 25-35 mins</p>
                  </button>
                  
                  <div className="flex-1 relative">
                    <select 
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className={`w-full p-4 rounded-2xl border-2 outline-none appearance-none transition-all font-black text-xs h-full pr-10 ${scheduledFor ? 'border-primary bg-orange-50/20' : 'border-gray-100 bg-white hover:border-gray-200 text-slate-400 font-bold'}`}
                    >
                      <option value="" disabled>Schedule Later...</option>
                      {getTimeSlots().map((slot, i) => (
                        <option key={i} value={slot.value}>{slot.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <FiChevronDown size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                   <FiPlusCircle className="text-primary" /> Cooking Instructions
                </h3>
                <textarea 
                  value={instructions} 
                  onChange={e => setInstructions(e.target.value)} 
                  placeholder="e.g. Make it extra spicy, Don't ring the bell..." 
                  className="w-full p-5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/10 outline-none transition-all h-24 text-xs font-medium resize-none shadow-inner shadow-gray-100/30"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Manage Addresses Modal */}
          <AnimatePresence>
            {isManageMode && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsManageMode(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
                />
                <motion.div 
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white rounded-t-3xl p-6 z-[70] shadow-2xl overflow-hidden"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold font-heading text-gray-800">Manage Saved Locations</h3>
                    <button 
                      onClick={() => setIsManageMode(false)}
                      className="text-sm font-bold text-gray-400 hover:text-gray-600"
                    >
                      DONE
                    </button>
                  </div>
                  
                  <div className="flex gap-6 overflow-x-auto pb-10 pt-4 px-2 scrollbar-hide">
                    {savedAddresses.map((addr) => (
                      <AddressCard 
                        key={addr._id}
                        address={addr}
                        isManageMode={true}
                        onDelete={handleDeleteAddress}
                      />
                    ))}
                    {savedAddresses.length === 0 && (
                      <div className="py-12 w-full text-center text-gray-400 font-medium">
                        No saved addresses found.
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="w-80 bg-white p-7 rounded-3xl shadow-xl shadow-slate-200/40 border border-gray-50 h-auto max-md:w-full flex flex-col">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-800">Bill Summary</h2>
              <div className="text-[10px] font-extrabold bg-green-50 text-green-600 px-2 py-1 rounded-md tracking-wider">SAVING ₹15</div>
            </div>
            
            {calculating || !bill ? (
               <div className="py-12 text-center text-sm text-gray-400 flex flex-col items-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="font-bold text-gray-400">Computing Bill...</p>
               </div>
            ) : (
               <>
                 <div className="space-y-4 mb-8">
                   <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                      <span>Subtotal</span>
                      <span className="text-gray-800 font-bold">₹{bill.subtotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                      <div className="flex items-center gap-2">
                         <span>Delivery</span>
                         {bill.deliveryFee === 0 && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full font-bold">FREE</span>}
                      </div>
                      <span className={`font-bold ${bill.deliveryFee === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                         {bill.deliveryFee === 0 ? '₹0.00' : `₹${bill.deliveryFee.toFixed(2)}`}
                      </span>
                   </div>
                   <div className="flex justify-between items-center text-sm text-gray-500 font-medium font-heading">
                      <span>Platform Fee</span>
                      <span className="text-gray-800 font-bold">₹{bill.platformFee.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                      <span>GST (5%)</span>
                      <span className="text-gray-800 font-bold">₹{bill.taxes.toFixed(2)}</span>
                   </div>
                 </div>
                 
                 <div className="border-t-2 border-dashed border-gray-100 pt-6 mb-8 group cursor-default">
                   <div className="flex justify-between items-end mb-1">
                      <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Grand Total</span>
                      <span className="text-primary font-black text-3xl group-hover:scale-110 transition-transform origin-right tracking-tight">₹{bill.finalTotal.toFixed(2)}</span>
                   </div>
                   <p className="text-right text-[10px] text-gray-400 font-medium italic">Inclusive of all taxes</p>
                 </div>
               </>
            )}
          </div>
          
          {bill && !calculating && (
            <div className="mt-8 space-y-4">
               <motion.button 
                 whileHover={{ scale: 1.02, backgroundColor: '#ea580c' }}
                 whileTap={{ scale: 0.98 }}
                 disabled={loading || calculating}
                 onClick={handlePayment} 
                 className="w-full bg-primary text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 transition-all uppercase tracking-wider flex items-center justify-center gap-2 group"
               >
                 {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                    <>Pay Securely <FiArrowRight className="group-hover:translate-x-1 transition-transform" /></>
                 )}
               </motion.button>
               
               <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary shadow-sm">
                    <FiCheck size={14} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500 leading-tight">
                    Safe & Secure payments. Trusted by 10,000+ students.
                  </p>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── SUCCESS MODAL ─── */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-primary via-orange-400 to-primary"></div>
              
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                className="w-28 h-28 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-lg shadow-green-100/50"
              >
                <FiCheckCircle size={56} strokeWidth={2.5} />
              </motion.div>

              <div className="space-y-4 mb-12 px-2">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Ordered Successfully!</h2>
                <p className="text-slate-500 font-bold text-lg leading-snug">
                  Check your stats for order <span className="text-primary">#{placedOrder?.orderId}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <FiClock className="mx-auto mb-3 text-primary" size={24} />
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">Estimate</p>
                    <p className="text-sm font-black text-slate-900">~25 Mins</p>
                  </div>
                  <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                    <FiMapPin className="mx-auto mb-3 text-primary" size={24} />
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">Delivering To</p>
                    <p className="text-sm font-black text-slate-900 truncate px-1">Hostel</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={() => navigate(`/student/tracking/${placedOrder?._id}`)}
                  className="w-full bg-slate-900 text-white py-6 rounded-[1.5rem] font-black text-xl hover:bg-black transition-all flex items-center justify-center gap-4 group shadow-xl shadow-slate-200 active:scale-95"
                >
                  Track Live <FiArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>
                <button 
                  onClick={() => handleDownloadReceipt(placedOrder?._id)}
                  className="w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-2 group active:scale-95 border border-slate-200"
                >
                   <FiDownload size={18} /> Save Receipt
                </button>
                <button 
                  onClick={() => { setShowSuccessModal(false); navigate('/student/home'); }}
                  className="w-full py-4 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition-colors"
                >
                  Back to Menu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default CartPage;
