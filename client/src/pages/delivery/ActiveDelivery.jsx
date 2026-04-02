import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiPhoneCall, FiMapPin, FiCheckCircle, FiArrowRight, FiSend, FiMessageSquare, FiPackage, FiTarget, FiNavigation, FiZap } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import { useSocketContext } from '../../context/SocketContext';
import { useSocketEvent } from '../../hooks/useSocket';
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

const ActiveDelivery = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [riderLocation, setRiderLocation] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [locationStatus, setLocationStatus] = useState('idle'); // idle, active, denied, error
  const [locationError, setLocationError] = useState(null);
  
  const VENDOR_LATLNG = [28.7041, 77.1025];
  const STUDENT_LATLNG = [28.7061, 77.1045];

  useEffect(() => {
    const getRoute = async () => {
       const coords = await fetchOSRMRoute(VENDOR_LATLNG, STUDENT_LATLNG);
       setRouteCoords(coords);
    };
    getRoute();
  }, []);
  const [cancelReason, setCancelReason] = useState('');
  const [waitTimer, setWaitTimer] = useState('00:00');
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

  const calculateWaitTime = useCallback(() => {
    if (!data?.arrivedAtVendorAt) return '00:00';
    const start = new Date(data.arrivedAtVendorAt).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }, [data?.arrivedAtVendorAt]);

  useEffect(() => {
    let interval;
    if (data?.arrivedAtVendorAt && !data?.pickedUpAt) {
      interval = setInterval(() => {
        setWaitTimer(calculateWaitTime());
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [data?.arrivedAtVendorAt, data?.pickedUpAt, calculateWaitTime]);

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
    if (data?.status && data.status !== 'delivered' && navigator.geolocation) {
      setLocationStatus('active');
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
           const { latitude, longitude } = pos.coords;
           setRiderLocation([latitude, longitude]);
           setLocationStatus('active');
           setLocationError(null);
           
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
        (err) => {
          console.log('Geolocation error:', err);
          if (err.code === 1) { // PERMISSION_DENIED
            setLocationStatus('denied');
            toast.error("Location permission denied. Please enable GPS to share your progress.");
          } else {
            setLocationStatus('error');
            setLocationError(err.message);
          }
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 0, 
          timeout: 10000 
        }
      );
    } else {
      setLocationStatus('idle');
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

  const handleCancel = async () => {
    if (!cancelReason) return toast.error("Please select a reason");
    try {
      await api.put(`/delivery/orders/${data._id}/cancel`, { reason: cancelReason });
      toast.success("Duty dropped successfully.");
      navigate('/delivery/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || "Cancellation failed.");
    }
  };

  const handleArrive = async () => {
    try {
      await api.put(`/delivery/orders/${data._id}/arrive`);
      toast.success("Arrival recorded!");
      fetchActiveDelivery();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record arrival");
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
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      {/* INDUSTRIAL TRIP HEADER */}
      <div className="bg-slate-900 pt-12 pb-20 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="max-w-lg mx-auto relative z-10 flex flex-col items-center text-center">
            <button onClick={() => navigate('/delivery/dashboard')} className="absolute left-0 top-0 text-white/50 hover:text-white transition-colors">
                <FiArrowRight className="rotate-180" size={24} />
            </button>
            <p className="text-[10px] font-black tracking-[0.3em] text-primary mb-2 uppercase">Active Duty ID: #{data._id.slice(-6).toUpperCase()}</p>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Trip in Progress</h1>
            
            {/* CANCEL BUTTON */}
            {!['picked_up', 'delivered'].includes(data.status) && (
                <button 
                  onClick={() => setShowCancelModal(true)}
                  className="mt-4 px-4 py-1.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-red-500 hover:text-white transition-all active:scale-95"
                >
                    Cancel Duty
                </button>
            )}
        </div>
      </div>

      <div className="max-w-md mx-auto -mt-12 px-4 space-y-6">
        {/* GPS STATUS INDICATOR */}
        <AnimatePresence>
          {locationStatus === 'denied' && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                 <FiTarget className="animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">GPS Warning</p>
                <p className="text-xs text-red-700/80 font-medium">Location access is disabled. Please enable it in browser settings.</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-red-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full"
              >
                Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TRIP STEPPER */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100">
            <div className="flex justify-between items-center relative px-2">
                {/* Horizontal progress line */}
                <div className="absolute left-0 right-0 top-4 h-1 bg-gray-100 -z-0">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                            width: data.status === 'delivered' ? '100%' : 
                                   data.status === 'picked_up' ? '66%' : 
                                   data.status === 'ready' ? '33%' : '0%' 
                        }}
                        className="h-full bg-primary transition-all duration-1000"
                    ></motion.div>
                </div>

                {[
                    { key: 'assigned', icon: <FiPackage />, label: 'Assign' },
                    { key: 'ready', icon: <FiNavigation />, label: 'Pickup' },
                    { key: 'picked_up', icon: <FiTarget />, label: 'Drop' },
                    { key: 'delivered', icon: <FiCheckCircle />, label: 'Done' }
                ].map((step, i) => {
                    const isActive = (step.key === 'assigned' && ['placed', 'confirmed', 'preparing'].includes(data.status)) ||
                                     (step.key === 'ready' && data.status === 'ready') ||
                                     (step.key === 'picked_up' && data.status === 'picked_up') ||
                                     (step.key === 'delivered' && data.status === 'delivered');
                    const isDone = (i === 0 && !['placed', 'confirmed', 'preparing'].includes(data.status)) ||
                                   (i === 1 && !['placed', 'confirmed', 'preparing', 'ready'].includes(data.status)) ||
                                   (i === 2 && data.status === 'delivered');

                    return (
                        <div key={step.key} className="flex flex-col items-center gap-2 relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${isDone ? 'bg-primary border-primary text-white' : isActive ? 'bg-white border-primary text-primary scale-125' : 'bg-white border-gray-100 text-gray-300'}`}>
                                {isDone ? <FiCheckCircle size={14} /> : step.icon}
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-primary' : 'text-gray-400'}`}>{step.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* SHIPMENT DETAILS */}
        <div className="space-y-4">
            {/* Pickup Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 max-sm:p-4 rounded-[2.5rem] max-sm:rounded-[1.5rem] shadow-xl border flex flex-col gap-4 ${data.status !== 'picked_up' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-gray-100'}`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${data.status !== 'picked_up' ? 'text-primary' : 'text-gray-400'}`}>1. Pickup From</p>
                        <h2 className="text-xl font-black tracking-tight uppercase truncate">{data?.vendorId?.shopName}</h2>
                        <p className="text-sm opacity-60 font-medium">{data?.vendorId?.location}</p>
                    </div>
                    <div className="bg-primary/20 p-3 rounded-2xl text-primary">
                        <FiNavigation size={22} />
                    </div>
                </div>
                {data.status === 'ready' && (
                    <button onClick={() => handleAction('picked')} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 active:scale-95 transition-all">Confirm My Pickup</button>
                )}
                {['placed', 'confirmed', 'preparing'].includes(data.status) && (
                    <div className="space-y-3">
                        {!data.arrivedAtVendorAt ? (
                            <button onClick={handleArrive} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black text-sm tracking-widest uppercase hover:bg-slate-700 transition-all active:scale-95 border-b-2 border-primary">Confirm I&apos;ve Arrived</button>
                        ) : (
                            <div className="w-full bg-slate-800 text-slate-400 py-4 rounded-2xl font-black flex items-center justify-between px-6 border-l-4 border-primary">
                                <span className="text-[10px] tracking-widest uppercase">Waiting at Vendor</span>
                                <span className="text-white font-mono text-lg">{waitTimer}</span>
                            </div>
                        )}
                        <div className="w-full bg-slate-800/50 text-slate-500 py-4 rounded-2xl font-black text-center text-[10px] tracking-widest uppercase">Food is Preparing...</div>
                    </div>
                )}
            </motion.div>

            {/* Drop Card */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 max-sm:p-4 rounded-[2.5rem] max-sm:rounded-[1.5rem] shadow-xl border flex flex-col gap-4 ${data.status === 'picked_up' ? 'bg-slate-900 text-white border-slate-800' : 'bg-white border-gray-100'}`}
            >
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${data.status === 'picked_up' ? 'text-primary' : 'text-gray-400'}`}>2. Deliver To</p>
                        <h2 className="text-xl font-black tracking-tight uppercase">{data?.studentId?.name}</h2>
                        <p className="text-sm opacity-60 font-medium">{data?.deliveryAddress}</p>
                    </div>
                    <div className="bg-accent/20 p-3 rounded-2xl text-accent">
                        <FiTarget size={22} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <a href={`tel:${data?.studentId?.phone}`} className="flex-1 bg-green-500/10 text-green-500 py-3 rounded-xl font-black flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-green-500/20"><FiPhoneCall /> Call</a>
                    <button className="flex-1 bg-blue-500/10 text-blue-500 py-3 rounded-xl font-black flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-blue-500/20"><FiMessageSquare /> Chat</button>
                </div>
            </motion.div>
        </div>

        {/* VERIFICATION SECTION */}
        {data.status === 'picked_up' && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-8 rounded-[3rem] shadow-2xl border border-primary/20 space-y-6"
          >
            <div className="text-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Final Step</h3>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-tight">Secure Hand-off</h2>
            </div>

            {!isOtpSent ? (
               <button onClick={sendOtpToStudent} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                 Send Handover PIN <FiZap className="text-primary" />
               </button>
            ) : (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                 <div className="relative">
                    <input 
                      type="text" 
                      maxLength="6" 
                      value={deliveryOtp} 
                      onChange={e => setDeliveryOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                      className="w-full px-6 py-6 text-4xl tracking-[0.6em] text-center font-black rounded-[2rem] border-2 border-slate-100 bg-slate-50 focus:border-primary focus:bg-white outline-none transition-all placeholder:text-slate-200" 
                      placeholder="000000"
                    />
                 </div>
                 <button 
                   onClick={() => handleAction('delivered')} 
                   disabled={deliveryOtp.length < 6} 
                   className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-orange-500/40 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale uppercase tracking-widest"
                 >
                    Complete Hand-off
                 </button>
                 <div className="text-center">
                   <button 
                     onClick={() => sendOtpToStudent(true)} 
                     disabled={resendTimer > 0} 
                     className="text-[10px] font-black text-primary uppercase tracking-widest disabled:text-slate-300"
                   >
                     {resendTimer > 0 ? `Retry in ${resendTimer}s` : 'Resend PIN?'}
                   </button>
                 </div>
               </div>
            )}
          </motion.div>
        )}

        {/* MINI MAP & CHAT */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
            <div className="h-64 relative">
                <MapContainer 
                  center={riderLocation || [28.7041, 77.1025]} 
                  zoom={16} 
                  scrollWheelZoom={true} 
                  className="h-full w-full z-0"
                >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {/* Auto-centering component */}
                    {riderLocation && <RecenterMap lat={riderLocation[0]} lng={riderLocation[1]} />}

                    {/* Route Path (OSRM Road Following) */}
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

                    {/* Rider Marker (Live) */}
                    {riderLocation && (
                      <Marker position={riderLocation} icon={L.divIcon({
                        html: '<div class="text-3xl filter drop-shadow-md">🛵</div>',
                        className: 'bg-transparent border-none',
                        iconAnchor: [15, 30]
                      })}>
                        <Popup className="font-bold">You (Live)</Popup>
                      </Marker>
                    )}

                    {/* Vendor Marker */}
                    <Marker position={[28.7041, 77.1025]} icon={L.divIcon({
                      html: '<div class="text-2xl filter drop-shadow-md">🏪</div>',
                      className: 'bg-transparent border-none',
                      iconAnchor: [12, 24]
                    })}>
                      <Popup className="font-bold">Restaurant Point</Popup>
                    </Marker>
                </MapContainer>
                <div className="absolute top-4 right-4 z-[400] overflow-hidden flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all duration-500 ${locationStatus === 'active' ? 'bg-green-500/20 border-green-500/30 text-green-500' : locationStatus === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-500' : 'bg-slate-900/80 border-white/20 text-white'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${locationStatus === 'active' ? 'bg-green-500 animate-pulse' : locationStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {locationStatus === 'active' ? 'RIDER TRACKING LIVE' : locationStatus === 'denied' ? 'GPS OFFLINE' : 'LINKING GPS...'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Chat Section */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col h-[400px]">
          <div className="p-5 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-black text-xs uppercase tracking-widest text-slate-400">Customer Intel</h3>
            <span className="flex items-center gap-1.5 text-[9px] font-black text-green-500 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> App Online
            </span>
          </div>
          <div className="flex-1 p-5 bg-slate-50/50 overflow-y-auto space-y-4 flex flex-col no-scrollbar">
            {(!chatHistory || chatHistory.length === 0) && <div className="m-auto text-slate-300 text-[10px] font-black uppercase tracking-widest">Maintain radio silence...</div>}
            {(chatHistory || []).map((msg, i) => (
              <div key={i} className={`max-w-[85%] p-4 rounded-3xl text-sm shadow-sm ${msg?.isMe ? 'bg-slate-950 text-white self-end rounded-br-none' : 'bg-white border border-gray-100 text-slate-700 self-start rounded-bl-none'}`}>
                <p className="font-medium leading-relaxed">{msg?.message || ''}</p>
                <p className={`text-[8px] mt-1 font-black uppercase opacity-40 ${msg?.isMe ? 'text-right' : 'text-left'}`}>{msg?.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'recently'}</p>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-50 flex gap-3">
            <input type="text" value={chatMessage} onChange={e => setChatMessage(e.target.value)} placeholder="Type tactical message..." className="flex-1 min-w-0 bg-slate-100 rounded-2xl px-5 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary transition-all" />
            <button type="submit" disabled={!chatMessage.trim()} className="shrink-0 bg-slate-950 text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg active:scale-90 transition-all disabled:opacity-20"><FiSend size={18} /></button>
          </form>
        </div>
      </div>

      {/* CANCELLATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-1 w-12 bg-slate-100 rounded-full mx-auto mb-6"></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-2">Refuse Duty?</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a professional reason</p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  "Vehicle Breakdown",
                  "Personal Emergency",
                  "Waiting time too high at vendor",
                  "Unable to find vendor location",
                  "Other"
                ].map((reason) => (
                  <button 
                    key={reason}
                    onClick={() => setCancelReason(reason)}
                    className={`w-full p-5 rounded-2xl font-black text-xs uppercase tracking-widest text-left transition-all border-2 ${cancelReason === reason ? 'bg-slate-950 text-white border-slate-950 scale-105 shadow-xl' : 'bg-slate-50 text-slate-500 border-slate-50 hover:border-slate-200'}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50"
                >
                  Go Back
                </button>
                <button 
                  onClick={handleCancel}
                  className="flex-1 py-5 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95"
                >
                  Confirm Drop
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

};
export default ActiveDelivery;
