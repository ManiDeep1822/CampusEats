import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSocketContext } from '../../context/SocketContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { updateOrderStatus, setActiveOrder } from '../../store/orderSlice';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import { fetchOSRMRoute } from '../../utils/routeUtils';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 16);
  }, [lat, lng, map]);
  return null;
};

const VENDOR_LATLNG = [28.7041, 77.1025];
const STUDENT_LATLNG = [28.7061, 77.1045];

const OrderTracking = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const { activeOrder, trackingStatus } = useSelector(state => state.order);
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  
  const socket = useSocketContext();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [riderLocation, setRiderLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  
  useEffect(() => {
    const getRoute = async () => {
       const coords = await fetchOSRMRoute(VENDOR_LATLNG, STUDENT_LATLNG);
       setRouteCoords(coords);
    };
    getRoute();

    if (!document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    try {
      const { data: initData } = await api.post('/payment/initiate', { orderId: activeOrder._id });

      const options = {
        key: initData.keyId,
        amount: initData.amount,
        currency: initData.currency,
        name: "CampusEats",
        description: "Complete Order Payment",
        order_id: initData.razorpayOrderId,
        handler: async function (response) {
          try {
            await api.post('/payment/verify', {
              paymentId: initData.payment._id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Payment successful!");
            dispatch(updateOrderStatus({ status: 'placed' }));
            setTimeout(() => window.location.reload(), 1500);
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
    } 
  };

  const [ratingValue, setRatingValue] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/student/orders/${id}`);
        dispatch(setActiveOrder(data));
        
        if (data.chatHistory) {
          setChatHistory(data.chatHistory.map(c => ({
             message: c.message,
             sender: c.sender,
             timestamp: c.timestamp,
             isMe: c.sender === 'Student'
          })));
        }
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchOrder();
  }, [id, dispatch]);

  const handleReceiveMessage = useCallback((msg) => {
    setChatHistory(prev => [...prev, msg]);
  }, []);

  useSocketEvent('order:confirmed', (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'confirmed', estimatedTime: data.estimatedTime })); });
  useSocketEvent('order:preparing', (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'preparing', estimatedTime: data.estimatedTime })); });
  useSocketEvent('order:ready',     (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'ready' })); });
  useSocketEvent('order:picked',    (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'picked_up' })); });
  useSocketEvent('order:delivered', (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'delivered' })); });
  useSocketEvent('receive_message', handleReceiveMessage);
  
  useSocketEvent('rider_location_update', (locData) => { 
    if(locData.orderId === id && locData.lat && locData.lng) {
      setRiderLocation([locData.lat, locData.lng]);
    }
  });

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeOrder.deliveryBoyId) return;

    const getTargetId = () => {
      const targetUser = activeOrder?.deliveryBoyId?.userId;
      const targetUserId = targetUser?._id || targetUser || activeOrder?.deliveryBoyId;
      
      if (!targetUserId) throw new Error('Could not identify target rider ID for chat');
      return targetUserId.toString();
    };

    try {
      const targetRoom = `delivery:${getTargetId()}`;
      const packet = { 
         orderId: activeOrder._id, 
         to: targetRoom, 
         replyTo: `student:${activeOrder.studentId?._id || activeOrder.studentId || ''}`,
         message: chatMessage, 
         sender: 'Student', 
         timestamp: Date.now() 
      };
      
      socket?.emit('send_message', packet);
      setChatHistory(prev => [...prev, { ...packet, isMe: true }]);
      setChatMessage('');
    } catch (err) {
      console.warn('Chat failure:', err.message);
      toast.error('Could not send message. Rider might be offline.');
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.put(`/student/orders/${id}/cancel`);
      toast.success("Order cancelled successfully");
      dispatch(updateOrderStatus({ status: 'cancelled' }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel order");
    }
  };

  const submitRating = async () => {
    if (ratingValue === 0) return toast.error("Please select a star rating");
    setIsSubmittingRating(true);
    try {
      const { data } = await api.post(`/student/orders/${id}/rate`, { rating: ratingValue, review: reviewText });
      toast.success(data.message);
      dispatch(setActiveOrder(data.order));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit rating");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  if (loading) return <Loader />;
  if (!activeOrder) return <div className="text-center py-20 text-xl font-bold">Order Not Found</div>;

  const isTakeAway = activeOrder?.orderType === 'take_away';
  const steps = isTakeAway 
    ? ['placed', 'confirmed', 'preparing', 'ready', 'delivered']
    : ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
  const currentStepIdx = steps.indexOf(trackingStatus || activeOrder?.status || 'placed');

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 transition-colors duration-300">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b gap-4">
          <div className="max-w-full overflow-hidden">
            <h2 className="text-xl sm:text-2xl font-bold font-heading mb-1 sm:mb-2 truncate">Track Order</h2>
            <p className="text-textSecondary text-xs sm:text-sm truncate">ID: {activeOrder?.orderId} • {activeOrder?.vendorId?.shopName || 'Unknown Vendor'}</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
            {['placed', 'pending_payment'].includes(trackingStatus || activeOrder.status) && (
              <button onClick={handleCancelOrder} className="flex-1 sm:flex-none bg-red-50 text-red-600 px-3 sm:px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition shadow-sm text-xs sm:text-sm border border-red-100 whitespace-nowrap">
                Cancel Order
              </button>
            )}
            {(trackingStatus || activeOrder.status) === 'pending_payment' && (
              <button onClick={handlePayment} className="flex-1 sm:flex-none animate-pulse bg-primary text-white px-3 sm:px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition shadow-md shadow-orange-500/30 text-xs sm:text-sm whitespace-nowrap">
                Proceed to Pay
              </button>
            )}
            {activeOrder?.status !== 'pending_payment' && (
              <button 
                onClick={() => {
                  const token = JSON.parse(localStorage.getItem('userInfo') || '{}')?.token;
                  window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/student/orders/${activeOrder?._id}/receipt?token=${token || ''}`, '_blank');
                }}
                className="flex-1 sm:flex-none bg-gray-50 text-gray-600 px-3 sm:px-4 py-2 rounded-lg font-bold hover:bg-gray-100 transition shadow-sm text-xs sm:text-sm border border-gray-100 whitespace-nowrap"
              >
                View Receipt
              </button>
            )}
          </div>
          {(trackingStatus || activeOrder.status) === 'cancelled' && (
            <span className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold shadow-sm text-sm border border-red-200">
              Cancelled
            </span>
          )}
        </div>

        {(trackingStatus || activeOrder.status) === 'pending_payment' && (
           <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
             <div className="flex">
               <div className="flex-shrink-0">
                 <span className="text-red-500 text-xl font-black">!</span>
               </div>
               <div className="ml-3">
                 <h3 className="text-sm font-bold text-red-800 uppercase tracking-widest">Payment Pending</h3>
                 <div className="mt-1 text-xs text-red-700 font-medium">
                   <p>Your order will be automatically cancelled in 5 minutes if payment is not received.</p>
                 </div>
               </div>
             </div>
           </div>
        )}

        <div className="relative pl-8 space-y-8 py-6 max-sm:pl-4 max-sm:space-y-6 max-sm:py-4">
          <div className="absolute left-11 top-6 bottom-6 w-0.5 bg-gray-100 max-sm:left-[27px]"></div>
          {steps.map((step, idx) => {
            const isDelivered = (trackingStatus || activeOrder.status) === 'delivered';
            const isCompleted = idx < currentStepIdx || (isDelivered && idx === currentStepIdx);
            const isActive = idx === currentStepIdx && !isDelivered;
            const labels = { 
              placed: "Order Placed", 
              confirmed: "Confirmed", 
              preparing: "Preparing", 
              ready: isTakeAway ? "Ready for Pickup" : "Ready", 
              picked_up: "Out for Delivery", 
              delivered: isTakeAway ? "Collected" : "Delivered" 
            };
            return (
              <div key={step} className="flex items-center relative z-10">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-4 max-sm:w-6 max-sm:h-6 max-sm:border-2 ${isActive ? 'bg-primary border-orange-200 animate-pulse' : isCompleted ? 'bg-accent border-green-100' : 'bg-gray-100 border-white'}`}>
                  {(isCompleted || isActive) && <div className="w-2 h-2 bg-white rounded-full max-sm:w-1.5 max-sm:h-1.5"></div>}
                </div>
                <div className={`ml-4 text-base max-sm:text-sm ${isActive ? 'text-primary font-bold' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>{labels[step]}</div>
              </div>
            );
          })}
        </div>
        
        {/* NEW: Pickup PIN Banner for Take Away */}
        {isTakeAway && activeOrder?.status === 'ready' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl shadow-indigo-200 text-white text-center"
          >
            <p className="text-[10px] uppercase font-black tracking-widest mb-2 opacity-80">Pickup PIN</p>
            <div className="flex justify-center gap-3 mb-4">
              {(activeOrder?.deliveryOtp?.toString() || '0000').split('').map((digit, i) => (
                <div key={i} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center text-2xl font-black">{digit}</div>
              ))}
            </div>
            <p className="text-sm font-bold opacity-90">Show this PIN at the counter to collect your order</p>
          </motion.div>
        )}
        
        {activeOrder?.deliveryBoyId && (
           <div className="mt-8 pt-6 border-t bg-gray-50/50 p-4 rounded-xl flex items-center justify-between">
              <div className="flex-1">
                <p className="text-[10px] sm:text-xs text-textSecondary uppercase font-bold tracking-wider mb-1">Delivery Partner</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-800 text-sm sm:text-base">{activeOrder.deliveryBoyId?.vehicleType || 'Courier'} Rider Assigned</p>
                  {riderLocation && (trackingStatus || activeOrder.status) !== 'picked_up' && (
                    <span className="bg-green-100 text-green-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse border border-green-200">
                      En Route to Restaurant
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xl bg-orange-100/50 p-2 sm:p-3 rounded-full">🛵</div>
           </div>
        )}

        {/* MINIMALIST ETA MODULE (SWIGGY/ZOMATO STYLE) */}
        <div className="relative mb-12 mt-8">
           <motion.div 
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-center space-y-6"
           >
              {/* LARGE ETA DISPLAY */}
              <div className="space-y-1">
                 <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span className="text-primary font-black text-[10px] uppercase tracking-[0.3em]">Live Tracking</span>
                 </div>
                 
                 <div className="flex items-center justify-center gap-3">
                    <span className="text-slate-400 font-black text-2xl max-sm:text-lg lowercase opacity-40">Arriving in</span>
                    <span className="text-slate-900 font-black text-6xl max-sm:text-4xl tracking-tighter">
                      {activeOrder?.status === 'preparing' 
                        ? (activeOrder?.estimatedTime || 15) 
                        : activeOrder?.estimatedDeliveryTime 
                          ? Math.max(0, Math.ceil((new Date(activeOrder.estimatedDeliveryTime).getTime() - new Date().getTime()) / 60000))
                          : '--'}
                    </span>
                    <span className="text-slate-900 font-black text-2xl max-sm:text-lg lowercase underline decoration-primary decoration-4">mins</span>
                 </div>
              </div>

              {/* SLIDING PROGRESS LINE */}
              <div className="max-w-xs mx-auto relative px-8 py-4">
                 <div className="h-1 bg-slate-100 rounded-full w-full relative">
                    {/* Active Segment */}
                    <motion.div 
                       initial={{ width: 0 }}
                       animate={{ 
                         width: activeOrder.status === 'delivered' ? '100%' : 
                                activeOrder.status === 'picked_up' ? '70%' : 
                                ['ready', 'prepared'].includes(activeOrder.status) ? '40%' : 
                                activeOrder.status === 'preparing' ? '15%' : '0%' 
                       }}
                       className="h-full bg-primary rounded-full transition-all duration-1000"
                    />
                    
                    {/* Sliding Icon Wrapper */}
                    <motion.div 
                       initial={{ left: 0 }}
                       animate={{ 
                         left: activeOrder.status === 'delivered' ? '100.5%' : 
                               activeOrder.status === 'picked_up' ? '70.5%' : 
                               ['ready', 'prepared'].includes(activeOrder.status) ? '40.5%' : 
                               activeOrder.status === 'preparing' ? '15.5%' : '0%' 
                       }}
                       className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                    >
                       <div className="bg-white p-2 rounded-full shadow-lg border border-slate-50 text-xl filter drop-shadow-sm">
                          {activeOrder.status === 'preparing' ? '🍳' : 
                           ['ready', 'prepared'].includes(activeOrder.status) ? '🥡' : 
                           activeOrder.status === 'picked_up' ? '🛵' : 
                           activeOrder.status === 'delivered' ? '✨' : '🛒'}
                       </div>
                    </motion.div>
                 </div>
                 
                 {/* Destination Dots */}
                 <div className="absolute left-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200"></div>
                 <div className="absolute right-7 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-200"></div>
              </div>

              {/* DYNAMIC STATUS TEXT */}
              <div className="space-y-1">
                 <p className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase">
                   {activeOrder.status === 'preparing' ? 'Chef is preparing your food' : 
                    activeOrder.status === 'ready' ? 'Your food is ready for pickup!' : 
                    activeOrder.status === 'picked_up' ? 'Rider is on the way!' : 
                    activeOrder.status === 'delivered' ? 'Order Delivered!' : 'Order Placed'}
                 </p>
                 <p className="text-[10px] text-slate-400 font-bold tracking-[0.1em] uppercase">
                    {isTakeAway ? `Pickup is from ${activeOrder?.vendorId?.shopName}` : `Delivering to ${activeOrder?.deliveryAddress || 'your location'}`}
                 </p>
              </div>
           </motion.div>
        </div>

        {(trackingStatus || activeOrder.status) !== 'delivered' && !isTakeAway && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0 mb-8" style={{ height: '350px' }}>
            <MapContainer 
              center={riderLocation || [28.7041, 77.1025]} 
              zoom={16} 
              scrollWheelZoom={true} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Auto-centering only when rider is moving */}
              {riderLocation && <RecenterMap lat={riderLocation[0]} lng={riderLocation[1]} />}

              {/* Live Route Path (OSRM Road Following) */}
              {routeCoords.length > 0 && (
                <Polyline 
                  positions={routeCoords} 
                  color="#f97316" 
                  weight={6} 
                  opacity={0.4} 
                />
              )}

              {/* Progressive Path (Rider to Destination) */}
              {riderLocation && routeCoords.length > 0 && (
                 <Polyline 
                    positions={[riderLocation, STUDENT_LATLNG]} 
                    color="#f97316" 
                    weight={4} 
                    dashArray="5, 10" 
                    opacity={0.8}
                 />
              )}

              {/* Vendor Marker */}
              <Marker position={[28.7041, 77.1025]} icon={L.divIcon({
                html: '<div class="text-2xl filter drop-shadow-md">🏪</div>',
                className: 'bg-transparent border-none',
                iconAnchor: [12, 24]
              })}>
                <Popup className="font-bold">Restaurant: {activeOrder?.vendorId?.shopName || 'Vendor'}</Popup>
              </Marker>

              {/* Delivery Drop Marker */}
              <Marker position={[28.7061, 77.1045]} icon={L.divIcon({
                html: '<div class="text-2xl filter drop-shadow-md">🏠</div>',
                className: 'bg-transparent border-none',
                iconAnchor: [12, 24]
              })}>
                <Popup className="font-bold">Your Location: {activeOrder?.deliveryAddress || 'Destination'}</Popup>
              </Marker>

              {/* Rider Marker (Only if active) */}
              {riderLocation && (
                <Marker position={riderLocation} icon={L.divIcon({
                  html: `<div class="relative rider-marker-reveal">
                           <div class="text-3xl filter drop-shadow-md animate-bounce">🛵</div>
                           ${(trackingStatus || activeOrder.status) !== 'picked_up' ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>' : ''}
                         </div>`,
                  className: 'bg-transparent border-none',
                  iconAnchor: [15, 30]
                })}>
                  <Popup className="font-bold">🛵 {(trackingStatus || activeOrder.status) === 'picked_up' ? 'Your Rider is Coming!' : 'Rider is Heading to Restaurant'}</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        )}

        {activeOrder?.deliveryBoyId && (trackingStatus || activeOrder.status) !== 'delivered' && (
          <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ height: '350px' }}>
            <div className="bg-gray-100 p-4 font-bold border-b text-gray-700 flex justify-between">
              <span>Chat with Rider</span>
              <span className="text-green-500 text-sm font-bold animate-pulse">● Online</span>
            </div>
            <div className="flex-1 p-4 bg-gray-50 overflow-y-auto space-y-3 flex flex-col">
              {chatHistory.length === 0 && <div className="m-auto text-gray-400 text-sm">Send a message to your delivery partner.</div>}
              {chatHistory?.map((msg, i) => (
                <div key={i} className={`max-w-[75%] p-3 rounded-xl shadow-sm text-sm ${msg.isMe ? 'bg-primary text-white self-end rounded-br-none' : 'bg-white border text-gray-800 self-start rounded-bl-none'}`}>
                   {msg.message}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
              <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 min-w-0 bg-gray-100 rounded-full px-4 outline-none focus:ring-2 focus:ring-orange-200" />
              <button type="submit" disabled={!chatMessage.trim()} className="shrink-0 bg-primary text-white px-4 sm:px-6 py-2 rounded-full hover:bg-orange-600 transition disabled:opacity-50 font-bold text-sm sm:text-base">Send</button>
            </form>
          </div>
        )}

        <AnimatePresence>
          {(trackingStatus || activeOrder.status) === 'delivered' && !activeOrder.rating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border">
                <div className="w-20 h-20 bg-orange-100 text-primary rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">⭐</div>
                <h2 className="text-2xl font-bold mb-2">How was your meal?</h2>
                <p className="text-gray-500 mb-8">Your feedback helps {activeOrder?.vendorId?.shopName || 'the vendor'} grow.</p>
                
                <div className="flex justify-center gap-2 mb-8">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRatingValue(s)} className="text-4xl transition-transform hover:scale-125 focus:outline-none">
                      <FiStar className={s <= (hoverRating || ratingValue) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
                    </button>
                  ))}
                </div>

                <textarea placeholder="Write a quick review (optional)..." value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full p-4 bg-gray-50 border rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none h-24" />

                <button onClick={submitRating} disabled={ratingValue === 0 || isSubmittingRating} className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 shadow-lg shadow-orange-500/30">
                  {isSubmittingRating ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderTracking;
