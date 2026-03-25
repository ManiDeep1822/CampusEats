import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiPhoneCall, FiMapPin, FiCheckCircle } from 'react-icons/fi';
import { useSocketContext } from '../../context/SocketContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

const ActiveDelivery = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [riderLocation, setRiderLocation] = useState(null);
  const navigate = useNavigate();
  
  const socket = useSocketContext();
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const fetchActiveDelivery = async () => {
    try {
      const res = await api.get('/delivery/dashboard');
      if (!res.data.profile.activeOrderId) navigate('/delivery/dashboard');
      else {
        const orderRes = await api.get(`/delivery/orders/${res.data.profile.activeOrderId._id || res.data.profile.activeOrderId}`);
        setData(orderRes.data);
        
        if (orderRes.data.chatHistory) {
          setChatHistory(orderRes.data.chatHistory.map(c => ({
             message: c.message,
             sender: c.sender,
             timestamp: c.timestamp,
             isMe: c.sender === 'Rider'
          })));
        }
      }
    } catch(err) { toast.error("Failed to load active delivery"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchActiveDelivery(); }, []);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Dynamically join the database's specific DeliveryBoy ID room just in case a Student routes there natively
  useEffect(() => {
    if (socket && data?.deliveryBoyId) {
      const rawDbId = typeof data.deliveryBoyId === 'string' ? data.deliveryBoyId : data.deliveryBoyId._id;
      if (rawDbId) socket.emit('join_room', { userId: rawDbId, role: 'delivery' });
    }
  }, [socket, data]);

  // Live GPS Tracking Core Implementation
  useEffect(() => {
    let watchId;
    if (data?.status === 'picked_up' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
           const { latitude, longitude } = pos.coords;
           setRiderLocation([latitude, longitude]);
           
           if (socket && data.studentId) {
             const targetUserId = typeof data.studentId === 'string' ? data.studentId : (data.studentId._id || data.studentId.userId);
             if (targetUserId) {
               socket.emit('rider_location_update', {
                  orderId: data._id,
                  to: `student:${targetUserId}`,
                  lat: latitude,
                  lng: longitude
               });
             }
           }
        },
        (err) => console.log('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [data?.status, socket, data?._id, data?.studentId]);

  const handleReceiveMessage = useCallback((msg) => {
    setChatHistory(prev => [...prev, msg]);
  }, []);

  useSocketEvent('order:confirmed', () => { fetchActiveDelivery(); toast.success("Vendor has accepted the order!"); });
  useSocketEvent('order:preparing', () => { fetchActiveDelivery(); toast.success("Vendor started preparing food"); });
  useSocketEvent('order:ready', () => { fetchActiveDelivery(); toast.success("Food is ready for pickup!"); });
  useSocketEvent('receive_message', handleReceiveMessage);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !data.studentId) return;

    // Defensively parse the target user string out of the Redux populated schema
    const getTargetId = () => {
      if (typeof data.studentId === 'string') return data.studentId;
      return data.studentId._id?.toString() || data.studentId.userId?.toString() || '';
    };

    const targetRoom = `student:${getTargetId()}`;
    const packet = { 
       orderId: data._id, 
       to: targetRoom, 
       replyTo: `delivery:${data.deliveryBoyId?.userId || data.deliveryBoyId || ''}`,
       message: chatMessage, 
       sender: 'Rider', 
       timestamp: Date.now() 
    };
    
    socket?.emit('send_message', packet);
    setChatHistory(prev => [...prev, { ...packet, isMe: true }]);
    setChatMessage('');
  };

  const sendOtpToStudent = async (isResend = false) => {
    try {
      await api.post(`/delivery/orders/${data._id}/send-otp`);
      toast.success(isResend ? "Verification PIN resent!" : "Verification PIN dispatched to student's App Notifications!");
      setIsOtpSent(true);
      setResendTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to push PIN");
    }
  };

  const handleAction = async (action) => {
    try {
      if (action === 'delivered') {
        if (!deliveryOtp || deliveryOtp.length < 6) return toast.error("Please enter the 6-digit PIN.");
        await api.put(`/delivery/orders/${data._id}/${action}`, { otp: deliveryOtp });
      } else {
        await api.put(`/delivery/orders/${data._id}/${action}`);
      }
      
      toast.success(action === 'picked' ? "Order Picked Up!" : "Order Delivered!");
      if (action === 'delivered') {
        setIsOtpSent(false);
        setDeliveryOtp('');
        navigate('/delivery/dashboard');
      }
      else fetchActiveDelivery();
    } catch(err) { toast.error(err.response?.data?.message || `Failed to mark as ${action}`); }
  };

  if (loading) return <Loader />;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 flex flex-col">
        <h1 className="text-2xl font-bold font-heading text-center border-b pb-4">Active Trip</h1>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Pickup From</h3>
          <div className="flex font-bold text-lg mb-1"><FiMapPin className="mr-2 mt-1 text-primary"/> {data?.vendorId?.shopName || 'Vendor'}</div>
          <p className="text-gray-600 pl-6">{data?.vendorId?.location || 'Location'}</p>
        </div>

        {data.status === 'placed' && <div className="w-full bg-blue-100 text-blue-700 py-4 rounded-xl font-bold text-center shadow-sm">Waiting for Vendor to Accept</div>}
        {data.status === 'confirmed' && <div className="w-full bg-yellow-100 text-yellow-700 py-4 rounded-xl font-bold text-center shadow-sm">Waiting for Vendor to Start Prep</div>}
        {data.status === 'preparing' && <div className="w-full bg-orange-100 text-orange-700 py-4 rounded-xl font-bold text-center shadow-sm">Food is Preparing... Please head to Vendor</div>}
        {data.status === 'ready' && <button onClick={() => handleAction('picked')} className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-orange-600 transition shadow-md flex items-center justify-center gap-2">Confirm Pickup</button>}

        <div className={`p-4 border rounded-lg transition ${data.status === 'picked_up' ? 'bg-orange-50 border-primary shadow-sm' : 'bg-gray-50 border-gray-200'}`}>
           <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Deliver To</h3>
           <div className="flex font-bold text-lg mb-1"><FiMapPin className="mr-2 mt-1 text-accent"/> {data?.deliveryAddress || 'Address'}</div>
           <p className="text-gray-600 pl-6 mb-4">{data?.studentId?.name || 'Customer'}</p>
           <a href={`tel:${data?.studentId?.phone || '0000000000'}`} className="flex items-center justify-center w-full bg-green-100 text-green-700 py-2 rounded-lg font-bold"><FiPhoneCall className="mr-2"/> Call Customer</a>
        </div>

        {data.status === 'picked_up' && (
          <div className="mt-4 border-t pt-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 text-center">Delivery Hand-off Verification</h3>
            {!isOtpSent ? (
               <button onClick={sendOtpToStudent} className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition shadow-md flex items-center justify-center gap-2">
                 1. Push PIN to Student App
               </button>
            ) : (
               <div className="space-y-4">
                 <label className="block text-center text-sm font-bold text-gray-500">Ask the student for their 6-digit PIN</label>
                 <input 
                   type="text" 
                   maxLength="6" 
                   value={deliveryOtp} 
                   onChange={e => setDeliveryOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                   className="w-full px-4 py-4 text-3xl tracking-[1em] text-center font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-accent outline-none bg-gray-50" 
                   placeholder="000000"
                 />
                 <button onClick={() => handleAction('delivered')} disabled={deliveryOtp.length < 6} className="w-full bg-accent text-white py-4 rounded-xl font-bold text-lg hover:bg-green-600 transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50">
                    <FiCheckCircle/> 2. Complete Delivery
                 </button>
                 <div className="text-center mt-3">
                   <button 
                     onClick={() => sendOtpToStudent(true)} 
                     disabled={resendTimer > 0} 
                     className="text-sm font-bold text-blue-500 hover:underline disabled:text-gray-400 disabled:no-underline transition"
                   >
                     {resendTimer > 0 ? `Resend PIN in ${resendTimer}s` : 'Resend Verification PIN'}
                   </button>
                 </div>
               </div>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="font-bold mb-2">Order Summary (Total: ₹{data.totalAmount})</p>
          <div className="text-sm text-gray-600">{data.items.map(i => <div key={i._id}>{i.quantity}x {i.menuItemId?.name || 'Item'}</div>)}</div>
        </div>

        <div className="mt-8 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0" style={{ height: '300px' }}>
          <MapContainer center={[28.7041, 77.1025]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[28.7041, 77.1025]}>
              <Popup>Pickup: {data?.vendorId?.shopName || 'Vendor'}</Popup>
            </Marker>
            <Marker position={[28.7061, 77.1045]}>
              <Popup>Delivery Drop: {data?.deliveryAddress || 'Address'}</Popup>
            </Marker>
            {riderLocation && (
               <Marker position={riderLocation}>
                 <Popup>🛵 You (Live)</Popup>
               </Marker>
            )}
          </MapContainer>
        </div>

        {/* Chat Section */}
        <div className="mt-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ height: '350px' }}>
          <div className="bg-gray-100 p-4 font-bold border-b text-gray-700 flex justify-between">
            <span>Chat with Customer</span>
            <span className="text-green-500 text-sm">● Online</span>
          </div>
          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto space-y-3 flex flex-col">
            {chatHistory.length === 0 && <div className="m-auto text-gray-400 text-sm">Send a message to your customer.</div>}
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

      </div>
    </div>
  );
};
export default ActiveDelivery;
