import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiPlusCircle, FiSettings, FiCheck, 
  FiClock, FiCheckCircle, FiChevronDown, FiArrowRight,
  FiTag, FiGift, FiTrash2, FiMapPin, FiDownload
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { addToCart, removeFromCart, clearCart } from '../../store/cartSlice';
import { setActiveOrder } from '../../store/orderSlice';
import AddressCard from '../../components/student/AddressCard';
import CartItem from '../../components/student/CartItem';
import CartBillSummary from '../../components/student/CartBillSummary';
import api from '../../services/api';
import toast from 'react-hot-toast';
import OrderTypeSelector from '../../components/student/OrderTypeSelector';

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

const CartPage = () => {
  const { items, vendorId } = useSelector(state => state.cart);
  const { user, token } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const handleAddToCart = useCallback((item) => {
    dispatch(addToCart(item));
  }, [dispatch]);

  const handleRemoveFromCart = useCallback((id) => {
    dispatch(removeFromCart(id));
  }, [dispatch]);

  const timeSlots = useMemo(() => getTimeSlots(), []);

  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [bill, setBill] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [saveThisAddress, setSaveThisAddress] = useState(false);
  const [addressTag, setAddressTag] = useState('Other');
  const [isManageMode, setIsManageMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [orderType, setOrderType] = useState('delivery'); // 'delivery' or 'take_away'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponError, setCouponError] = useState('');
  const [addressError, setAddressError] = useState('');


  useEffect(() => {
    if (items.length === 0) return;
    const fetchBill = async () => {
      setCalculating(true);
      setAddressError(''); // Clear address error on recalculate
      try {
        const payload = { 
          vendorId, 
          orderType,
          items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
          couponCode: appliedCoupon?.code
        };
        const { data } = await api.post('/student/calculate-bill', payload);
        setBill(data);
      } catch (error) { 
        console.error("Error computing live bill", error); 
      } finally { 
        setCalculating(false); 
      }
    };
    
    const timeout = setTimeout(() => fetchBill(), 300);
    return () => clearTimeout(timeout);
  }, [items, vendorId, orderType, appliedCoupon]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setApplyingCoupon(true);
    setCouponError('');
    try {
      const { data } = await api.post('/student/apply-coupon', { 
        code: couponCode, 
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity })) 
      });
      setAppliedCoupon(data);
      // No toast needed - successfully applied state will animate
    } catch (error) {
      setCouponError(error.response?.data?.message || 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  useEffect(() => {
    const fetchSavedAddresses = async () => {
      try {
        const { data } = await api.get('/student/addresses');
        setSavedAddresses(data);
        const defaultAddr = data.find(a => a.isDefault);
        if (defaultAddr && !address) {
          setAddress(defaultAddr.address);
        }
      } catch (error) {
        console.error("Error fetching saved addresses", error);
      }
    };
    fetchSavedAddresses();
  }, []);

  const localSubtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [items]);

  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      try {
        const { data } = await api.get('/student/coupons/available');
        setAvailableCoupons(data);
      } catch (error) {
        console.error("Error fetching available coupons", error);
      }
    };
    fetchAvailableCoupons();
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handlePayment = async () => {
    if (orderType === 'delivery' && !address) { 
      toast.error("Select address"); 
      // Scroll to address section
      const addrSection = document.getElementById('delivery-section');
      if (addrSection) addrSection.scrollIntoView({ behavior: 'smooth' });
      return; 
    }
    if (!bill) return; 

    setLoading(true);
    try {
      if (saveThisAddress && orderType === 'delivery') {
        try {
          await api.post('/student/address', { address, tag: addressTag });
        } catch (e) { console.error("Could not save address", e); }
      }

      const orderPayload = {
        vendorId,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price })),
        deliveryAddress: orderType === 'take_away' ? undefined : address,
        orderType,
        specialInstructions: instructions || '',
        scheduledFor: scheduledFor ? scheduledFor : undefined,
        couponCode: appliedCoupon?.code
      };
      
      const { data: order } = await api.post('/student/order', orderPayload);
      const { data: initData } = await api.post('/payment/initiate', { orderId: order._id });

      const options = {
        key: initData.keyId,
        amount: initData.amount,
        currency: initData.currency,
        name: "CampusEats",
        description: "Food Ordering",
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
            setTimeout(() => dispatch(clearCart()), 100);
          } catch (err) {
            console.error('Payment Verification Failed', err);
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
      razorpayInstance.on('payment.failed', (response) => console.error(response.error.description));
      razorpayInstance.open();

    } catch (error) { 
      console.error('Failed to initiate checkout', error); 
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
      if (savedAddresses.find(a => a._id === id)?.address === address) {
        setAddress('');
      }
    } catch (error) {
      console.error("Failed to delete address", error);
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
      <div className="max-w-6xl mx-auto flex flex-row gap-8 max-sm:flex-col items-stretch max-sm:gap-6">
        {/* Left Column: Order Summary & Delivery */}
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-sm:p-5">
          <h2 className="text-2xl font-bold font-heading mb-6 border-b border-gray-50 pb-4 max-sm:text-xl">Order Summary</h2>
          <div className="space-y-6">
            {(items || []).map(item => (
              <CartItem 
                key={item.menuItemId} 
                item={item} 
                onAdd={handleAddToCart}
                onRemove={handleRemoveFromCart}
              />
            ))}
          </div>

          <div className="mt-10 pt-8 border-t border-gray-100 space-y-8">
            <OrderTypeSelector orderType={orderType} setOrderType={setOrderType} />

            <AnimatePresence mode="wait">
              {orderType === 'delivery' ? (
                <motion.div 
                   key="delivery-section"
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: 10 }}
                   className="space-y-6"
                >
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
                        onChange={e => { setAddress(e.target.value); setAddressError(''); }} 
                        placeholder="Street, Building, Room No..." 
                        className={`w-full pl-5 pr-12 py-3.5 rounded-xl border-2 outline-none transition-all font-medium text-sm ${
                          addressError 
                          ? 'border-red-500 bg-red-50/30'
                          : address 
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
                               <span className="text-xs font-bold text-gray-600 tracking-tight">Save address</span>
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
                                    ? 'bg-primary text-white shadow-md' 
                                    : 'bg-white text-gray-400 border border-gray-100'
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
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                   key="takeaway-section"
                   initial={{ opacity: 0, x: 10 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -10 }}
                   className="space-y-6 bg-orange-50/30 p-6 rounded-2xl border border-orange-100/50"
                >
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FiDownload className="rotate-180" size={24} />
                     </div>
                     <div>
                        <h3 className="font-black text-gray-800 leading-tight">Self Pickup</h3>
                        <p className="text-xs text-textSecondary font-medium">No delivery charges apply</p>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-orange-200/20">
                     <ul className="space-y-2">
                        <li className="flex items-center gap-2 text-xs font-medium text-gray-600">
                           <div className="w-1 h-1 rounded-full bg-primary" />
                           Show Pickup PIN at counter to collect food.
                        </li>
                     </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              <div className="pt-6 border-t border-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider flex items-center gap-2">
                    <FiClock className="text-primary" /> {orderType === 'take_away' ? 'Pickup Schedule' : 'Delivery Schedule'}
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
                    <p className="font-black text-slate-800 text-xs mb-1">{orderType === 'take_away' ? 'Pickup NOW' : 'Deliver NOW'}</p>
                    <p className="text-[10px] font-medium text-slate-400">Ready in 15-25 mins</p>
                  </button>
                  
                  <div className="flex-1 relative">
                    <select 
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                      className={`w-full p-4 rounded-2xl border-2 outline-none appearance-none transition-all font-black text-xs h-full pr-10 ${scheduledFor ? 'border-primary bg-orange-50/20' : 'border-gray-100 bg-white hover:border-gray-200 text-slate-400 font-bold'}`}
                    >
                      <option value="" disabled>Schedule Later...</option>
                      {timeSlots.map((slot, i) => (
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
                  placeholder="e.g. Make it extra spicy..." 
                  className="w-full p-5 bg-gray-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/10 outline-none transition-all h-24 text-xs font-medium resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {isManageMode && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setIsManageMode(false)}
                  className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60]"
                />
                <motion.div 
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  className="fixed bottom-0 left-0 right-0 max-w-4xl mx-auto bg-white rounded-t-3xl p-6 z-[70] shadow-2xl overflow-hidden"
                >
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-800">Manage Saved Locations</h3>
                    <button onClick={() => setIsManageMode(false)} className="text-sm font-bold text-gray-400">DONE</button>
                  </div>
                  <div className="flex gap-6 overflow-x-auto pb-10 pt-4 px-2 scrollbar-hide">
                    {savedAddresses.map((addr) => (
                      <AddressCard key={addr._id} address={addr} isManageMode={true} onDelete={handleDeleteAddress} />
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Offers & Bill Summary */}
        <div className="w-96 flex flex-col gap-6 max-md:w-full">
          {/* Offers Section */}
          <div className="bg-white p-6 md:p-8 rounded-3xl md:rounded-[32px] shadow-sm border border-gray-100">
            <h3 className="text-sm md:text-base font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shrink-0">
                <FiTag size={18} />
              </div>
              <span className="truncate">Offers For You</span>
            </h3>
            
            {!appliedCoupon ? (
              <div className="space-y-6">
                {availableCoupons.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex gap-4 overflow-x-auto pt-4 pb-4 scrollbar-hide snap-x">
                      {(availableCoupons || []).map((coupon) => {
                        const isDisabled = bill && (bill.subtotal || 0) < (coupon.minOrderAmount || 0);
                        return (
                          <motion.button
                            key={coupon?._id}
                            whileHover={!isDisabled ? { scale: 1.02 } : {}}
                            whileTap={!isDisabled ? { scale: 0.98 } : {}}
                            onClick={() => {
                              if (!isDisabled) {
                                setCouponCode(coupon.code);
                                setTimeout(() => {
                                   const btn = document.getElementById('apply-coupon-btn');
                                   if (btn) btn.click();
                                }, 50);
                              }
                            }}
                            className={`flex-shrink-0 w-48 md:w-56 p-4 md:p-5 rounded-2xl border-2 transition-all text-left snap-start relative ${
                              isDisabled 
                              ? 'bg-gray-50 border-gray-200 opacity-60 grayscale' 
                              : 'bg-white border-slate-100 hover:border-primary shadow-sm'
                            }`}
                          >
                             <div className="flex items-center gap-2 mb-3">
                               <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isDisabled ? 'bg-gray-200 text-gray-400' : 'bg-primary/10 text-primary'}`}>
                                  <FiGift size={14} />
                               </div>
                               <p className="text-xs font-black text-slate-800 font-mono tracking-tight">{coupon?.code}</p>
                             </div>
                             
                             <p className="text-lg font-black text-slate-900 leading-none mb-1">
                                {coupon?.discountValue}{coupon?.discountType === 'percentage' ? '%' : '₹'} <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">OFF</span>
                             </p>
                             
                             <div className="pt-2 mt-3 border-t border-slate-50 flex items-center justify-between">
                                {isDisabled ? (
                                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">Min ₹{coupon?.minOrderAmount}</p>
                                ) : (
                                  <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                     UNLOCKED
                                  </p>
                                )}
                                <div className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                                   <FiArrowRight size={10} />
                                </div>
                             </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                <div className={`h-12 md:h-14 flex bg-slate-50 rounded-2xl border overflow-hidden transition-all ${couponError ? 'border-red-500 animate-shake bg-red-50/50' : 'border-gray-100 focus-within:border-primary/20 focus-within:bg-white'}`}>
                  <input 
                    type="text"
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    placeholder="ENTER CODE"
                    className="flex-1 bg-transparent px-5 outline-none font-mono font-black text-xs md:text-sm tracking-widest placeholder:text-gray-300 w-0"
                  />
                  <button
                    id="apply-coupon-btn"
                    onClick={handleApplyCoupon}
                    disabled={applyingCoupon || !couponCode}
                    className={`px-6 md:px-8 h-full text-white font-black text-[10px] md:text-xs transition-all active:scale-95 disabled:opacity-50 tracking-widest shrink-0 ${couponError ? 'bg-red-500' : 'bg-slate-900 hover:bg-black'}`}
                  >
                    {applyingCoupon ? '...' : 'APPLY'}
                  </button>
                </div>
                {couponError && (
                  <p className="mt-2 ml-4 text-[10px] font-black text-red-500 uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                    {couponError}
                  </p>
                )}
              </div>
            ) : (
              <motion.div 
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center justify-between bg-slate-900 p-5 rounded-2xl relative overflow-hidden"
              >
                <div className="flex items-center gap-4 relative z-10">
                   <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-primary">
                      <FiCheck size={20} strokeWidth={3} />
                   </div>
                   <div>
                      <p className="text-white text-xs font-black tracking-widest font-mono line-clamp-1">{appliedCoupon.code}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Applied · Saved ₹{bill?.discountAmount || 0}</p>
                   </div>
                </div>
                <button 
                   onClick={removeCoupon} 
                   className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all relative z-10"
                >
                   <FiTrash2 size={18} />
                </button>
              </motion.div>
            )}
          </div>

          <CartBillSummary 
            bill={bill}
            calculating={calculating}
            localSubtotal={localSubtotal}
            orderType={orderType}
            loading={loading}
            onPayment={handlePayment}
            className="flex-1"
          />
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] max-sm:rounded-[2rem] shadow-2xl p-12 max-sm:p-6 max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-3 bg-primary"></div>
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100/50">
                <FiCheckCircle size={32} />
              </div>

              <h2 className="text-3xl max-sm:text-2xl font-black text-slate-900 mb-2">Ordered Successfully!</h2>
              <p className="text-slate-500 font-bold text-sm mb-10 max-sm:mb-6">Order ID: #{placedOrder?.orderId || 'N/A'}</p>
              <div className="grid grid-cols-2 gap-4 mb-10 max-sm:mb-6">
                <div className="bg-slate-50 p-4 rounded-3xl">
                  <FiClock className="mx-auto mb-2 text-primary" size={18} />
                  <p className="text-xs font-black text-slate-900">~{orderType === 'take_away' ? '15' : '25'} Mins</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl">
                  <FiMapPin className="mx-auto mb-2 text-primary" size={18} />
                  <p className="text-xs font-black text-slate-900">{orderType === 'take_away' ? 'Pickup' : 'Delivery'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <button onClick={() => placedOrder && navigate(`/student/tracking/${placedOrder._id}`)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all">Track Live</button>
                <button onClick={() => { setShowSuccessModal(false); navigate('/student/home'); }} className="w-full py-4 text-slate-400 font-black uppercase text-xs tracking-widest">Back to Menu</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CartPage;
