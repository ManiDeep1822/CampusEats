import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import api from '../../services/api';
import { clearCart } from '../../store/cartSlice';
import { setActiveOrder } from '../../store/orderSlice';
import toast from 'react-hot-toast';

const CheckoutPage = () => {
  const { items, vendorId } = useSelector(state => state.cart);
  const { user } = useSelector(state => state.auth);
  const { state } = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [method, setMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');

  const getTimeSlots = () => {
    const slots = [];
    let currentTime = new Date();
    // Round to next 30 min block
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
    // Load the Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  if (!state?.address || items.length === 0 || !state?.finalTotal) return <Navigate to="/student/cart" />;

  const finalTotal = state.finalTotal;

  const handlePayment = async () => {
    if (method !== 'razorpay') return toast.error("Only Razorpay is currently supported.");
    setLoading(true);
    
    try {
      // 1. Create Order securely in database
      const orderPayload = {
        vendorId,
        items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price })),
        deliveryAddress: state.address,
        specialInstructions: state.instructions || '',
        scheduledFor: scheduledFor ? scheduledFor : undefined
      };
      const { data: order } = await api.post('/student/order', orderPayload);

      // 2. Initiate Razorpay Checkout on backend
      const { data: initData } = await api.post('/payment/initiate', { orderId: order._id });

      // 3. Open Razorpay UI widget
      const options = {
        key: initData.keyId,
        amount: initData.amount,
        currency: initData.currency,
        name: "CampusEats",
        description: "Food Delivery Order",
        order_id: initData.razorpayOrderId,
        handler: async function (response) {
          try {
            // 4. Send signature to backend for cryptographic verification
            await api.post('/payment/verify', {
              paymentId: initData.payment._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            toast.success('Payment successful & Order confirmed!');
            dispatch(clearCart());
            dispatch(setActiveOrder(order));
            navigate(`/student/tracking/${order._id}`);
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
      
      razorpayInstance.on('payment.failed', function (response){
         toast.error(response.error.description || "Payment completely failed");
      });
      
      razorpayInstance.open();

    } catch (error) { 
      toast.error(error.response?.data?.message || 'Failed to initiate payment'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
        <h2 className="text-2xl font-bold font-heading mb-6">Payment</h2>
        <div className="text-3xl font-extrabold text-center mb-8">₹{finalTotal.toFixed(2)}</div>
        <div className="space-y-4 mb-8">
          <label className="flex items-center p-4 border border-primary bg-orange-50 text-primary font-bold rounded-lg cursor-pointer transition">
             <input type="radio" checked readOnly className="mr-3 text-primary focus:ring-primary"/>
             Razorpay (UPI / Cards)
          </label>
          <label className="flex items-center p-4 border border-gray-200 rounded-lg cursor-not-allowed opacity-50 transition">
             <input type="radio" disabled className="mr-3 text-primary focus:ring-primary"/>
             Cash on Delivery (Disabled)
          </label>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Delivery Time</label>
          <select 
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none font-medium bg-gray-50 text-gray-800 transition-colors"
          >
            <option value="">🚀 Deliver Now (Arrives in ~25 mins)</option>
            {getTimeSlots().map((slot, i) => (
              <option key={i} value={slot.value}>⏱️ Schedule: {slot.label}</option>
            ))}
          </select>
        </div>
        
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
           You will be redirected to the secure Razorpay payment gateway to complete your transaction.
        </div>
        
        <button onClick={handlePayment} disabled={loading} className="w-full bg-primary text-white py-4 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-70 text-lg shadow-lg shadow-orange-500/30">
          {loading ? 'Initializing Secure Window...' : `Pay ₹${finalTotal.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};
export default CheckoutPage;
