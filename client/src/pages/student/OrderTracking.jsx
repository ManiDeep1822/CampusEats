import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useSocketContext } from '../../context/SocketContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { AnimatePresence, motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { updateOrderStatus, setActiveOrder } from '../../store/orderSlice';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

const OrderTracking = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const { activeOrder, trackingStatus } = useSelector(state => state.order);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const socket = useSocketContext();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [riderLocation, setRiderLocation] = useState(null);

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

  useSocketEvent('order:confirmed', (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'confirmed' })); });
  useSocketEvent('order:preparing', (data) => { if (data.orderId === id) dispatch(updateOrderStatus({ status: 'preparing' })); });
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
      // Sometimes Mongoose populats DeliveryBoy id but leaves userId as a string, or unpopulated.
      // We must explicitly match what the Rider used to join: 'delivery:USER_ID'.
      const targetUserId = activeOrder.deliveryBoyId?.userId?._id || activeOrder.deliveryBoyId?.userId || activeOrder.deliveryBoyId;
      return targetUserId.toString();
    };

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

  const steps = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
  const currentStepIdx = steps.indexOf(trackingStatus || activeOrder.status);

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 transition-colors duration-300">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 max-sm:p-6">
        <div className="flex justify-between items-start mb-8 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold font-heading mb-2">Track Order</h2>
            <p className="text-textSecondary">ID: {activeOrder?.orderId} • {activeOrder?.vendorId?.shopName || 'Unknown Vendor'}</p>
          </div>
          {['placed', 'pending_payment'].includes(trackingStatus || activeOrder.status) && (
            <button onClick={handleCancelOrder} className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition shadow-sm text-sm border border-red-100">
              Cancel Order
            </button>
          )}
          {(trackingStatus || activeOrder.status) === 'cancelled' && (
            <span className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold shadow-sm text-sm border border-red-200">
              Cancelled
            </span>
          )}
        </div>

        <div className="relative pl-8 space-y-8 py-6 max-sm:pl-4 max-sm:space-y-6 max-sm:py-4">
          <div className="absolute left-11 top-6 bottom-6 w-0.5 bg-gray-100 max-sm:left-[27px]"></div>
          {steps.map((step, idx) => {
            const isDelivered = (trackingStatus || activeOrder.status) === 'delivered';
            const isCompleted = idx < currentStepIdx || (isDelivered && idx === currentStepIdx);
            const isActive = idx === currentStepIdx && !isDelivered;
            const labels = { placed: "Order Placed", confirmed: "Confirmed", preparing: "Preparing", ready: "Ready", picked_up: "Out for Delivery", delivered: "Delivered" };
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
        
        {activeOrder.deliveryBoyId && (
           <div className="mt-8 pt-6 border-t bg-gray-50/50 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-textSecondary uppercase font-bold tracking-wider mb-1">Delivery Partner</p>
                <p className="font-bold text-gray-800 text-sm sm:text-base">{activeOrder.deliveryBoyId.vehicleType} Rider Assigned</p>
              </div>
              <div className="text-xl bg-orange-100/50 p-2 sm:p-3 rounded-full">🛵</div>
           </div>
        )}

        {/* Smart ETA Banner */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border border-orange-200 rounded-2xl p-6 mb-8 mt-8 flex flex-row items-center justify-between shadow-sm gap-6 max-sm:flex-col max-sm:items-start max-sm:p-5">
           <div className="max-sm:w-full">
             <h3 className="text-orange-800 font-bold mb-1 text-xs uppercase tracking-widest flex items-center gap-2 max-sm:text-[10px]">
               {activeOrder.scheduledFor ? '🗓️ Scheduled' : '⚡ Est. Arrival'}
             </h3>
             <p className="text-orange-950 font-black text-4xl max-sm:text-3xl">
               {activeOrder?.estimatedDeliveryTime 
                 ? Math.max(0, Math.ceil((new Date(activeOrder.estimatedDeliveryTime) - new Date()) / 60000)) + " mins"
                 : 'Calculating...'}
             </p>
             <p className="text-orange-800/60 text-[10px] font-bold mt-1 uppercase">
               Expected by {activeOrder?.estimatedDeliveryTime && new Date(activeOrder.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
           </div>
           <div className="text-right border-l border-orange-200/50 pl-6 max-sm:w-full max-sm:text-left max-sm:border-l-0 max-sm:pl-0">
             <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest mb-1">Delivery To</p>
             <p className="text-orange-900 font-bold text-base leading-snug line-clamp-2 max-sm:text-sm">{activeOrder?.deliveryAddress || 'Campus'}</p>
           </div>
        </div>

        {(trackingStatus || activeOrder.status) !== 'delivered' && (
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0 mb-8" style={{ height: '350px' }}>
            <MapContainer 
              center={riderLocation || [28.7041, 77.1025]} 
              zoom={16} 
              scrollWheelZoom={false} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Auto-centering only when rider is moving */}
              {riderLocation && <RecenterMap lat={riderLocation[0]} lng={riderLocation[1]} />}

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
                  html: '<div class="text-3xl filter drop-shadow-md animate-bounce">🛵</div>',
                  className: 'bg-transparent border-none',
                  iconAnchor: [15, 30]
                })}>
                  <Popup className="font-bold">🛵 Your Rider is Here!</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        )}

        {activeOrder.deliveryBoyId && (trackingStatus || activeOrder.status) !== 'delivered' && (
          <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ height: '350px' }}>
            <div className="bg-gray-100 p-4 font-bold border-b text-gray-700 flex justify-between">
              <span>Chat with Rider</span>
              <span className="text-green-500 text-sm font-bold animate-pulse">● Online</span>
            </div>
            <div className="flex-1 p-4 bg-gray-50 overflow-y-auto space-y-3 flex flex-col">
              {chatHistory.length === 0 && <div className="m-auto text-gray-400 text-sm">Send a message to your delivery partner.</div>}
              {chatHistory.map((msg, i) => (
                <div key={i} className={`max-w-[75%] p-3 rounded-xl shadow-sm text-sm ${msg.isMe ? 'bg-primary text-white self-end rounded-br-none' : 'bg-white border text-gray-800 self-start rounded-bl-none'}`}>
                   {msg.message}
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
              <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-100 rounded-full px-4 outline-none focus:ring-2 focus:ring-orange-200" />
              <button type="submit" disabled={!chatMessage.trim()} className="bg-primary text-white px-5 rounded-full hover:bg-orange-600 transition disabled:opacity-50 font-bold">Send</button>
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
