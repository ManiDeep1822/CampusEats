import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiPhoneCall, FiCheckCircle, FiSend, FiMessageSquare, FiPackage, FiTarget, FiNavigation, FiChevronLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import { useSocketContext } from '../../context/SocketContext';
import { useSocketEvent } from '../../hooks/useSocket';
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet';
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

// 🛵 SUB-COMPONENT: ISOLATED CHAT TO PREVENT MAP FLICKER
const DeliveryChatBox = ({ chatHistory, onSendMessage, studentName }) => {
  const [msg, setMsg] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    onSendMessage(msg);
    setMsg('');
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[450px]">
      <div className="p-5 border-b flex items-center justify-between bg-gray-50/50">
        <div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Communication Channel</span>
          <h3 className="text-xs font-black text-gray-800 uppercase">Chat with {studentName || 'Customer'}</h3>
        </div>
        <span className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1.5 p-2 bg-green-50 rounded-full px-4"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> App Online</span>
      </div>
      <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-5 flex flex-col no-scrollbar bg-gray-50/20">
        {chatHistory.length === 0 && <div className="m-auto text-[10px] font-bold text-gray-300 uppercase tracking-[0.3em] text-center max-w-[200px] leading-loose">Secure channel established. Connected with recipient.</div>}
        {chatHistory.map((m, i) => (
          <div key={i} className={`max-w-[85%] p-4 rounded-[1.5rem] text-sm font-bold leading-relaxed shadow-sm ${m.isMe ? 'bg-gray-800 text-white self-end rounded-br-none' : 'bg-white border border-gray-100 text-gray-700 self-start rounded-bl-none'}`}>
            {m.message}
            <p className={`text-[8px] mt-2 font-black uppercase opacity-40 ${m.isMe ? 'text-right' : 'text-left'}`}>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Just now'}</p>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t flex gap-3">
        <input value={msg} onChange={e => setMsg(e.target.value)} type="text" placeholder="Type response..." className="flex-1 bg-gray-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all" />
        <button type="submit" disabled={!msg.trim()} className="w-14 h-14 bg-gray-800 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-20"><FiSend size={20} /></button>
      </form>
    </div>
  );
};

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
  const [locationStatus, setLocationStatus] = useState('idle'); 
  
  const VENDOR_LATLNG = [28.7041, 77.1025];
  const STUDENT_LATLNG = [28.7061, 77.1045];

  useEffect(() => {
    const getRoute = async () => {
       const coords = await fetchOSRMRoute(VENDOR_LATLNG, STUDENT_LATLNG);
       setRouteCoords(coords);
    };
    getRoute();
  }, [STUDENT_LATLNG, VENDOR_LATLNG]);

  const [cancelReason, setCancelReason] = useState('');
  const [waitTimer, setWaitTimer] = useState('00:00');
  const navigate = useNavigate();
  
  const socket = useSocketContext();
  const { user } = useSelector(state => state.auth); 
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
             isMe: c.sender === user?._id?.toString() || c.sender === 'Rider'
          })));
        }
      }
    } catch(err) { 
      if (err.response?.status === 401) {
        toast.error("Session Expired. Please log in again.");
        return navigate('/login');
      }
      toast.error("Failed to load active delivery"); 
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchActiveDelivery(); }, [fetchActiveDelivery]);

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

  const lastSyncRef = useRef(0);

  useEffect(() => {
    let watchId;
    if (data?.status && data.status !== 'delivered' && navigator.geolocation) {
      locationStatus === 'idle' && setLocationStatus('active');
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
           const { latitude, longitude } = pos.coords;
           setRiderLocation([latitude, longitude]);
           setLocationStatus('active');

           const now = Date.now();
           // Sync to DB every 30 seconds to save battery/bandwidth
           if (now - lastSyncRef.current > 30000) {
             api.put('/delivery/location', { lat: latitude, lng: longitude }).catch(() => {});
             lastSyncRef.current = now;
           }

           if (socket && data.studentId) {
             const studentIdRaw = data.studentId?._id || data.studentId;
             const targetUserId = studentIdRaw?.toString();
             
             if (targetUserId) {
               socket.emit('rider_location_update', {
                  orderId: data._id?.toString(),
                  to: `student:${targetUserId}`,
                  lat: latitude,
                  lng: longitude
               });
             }
           }
        },
        (err) => {
          if (err.code === 1) setLocationStatus('denied');
          else setLocationStatus('error');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [data?.status, socket, data?._id, data?.studentId, locationStatus]);

  useSocketEvent('order:confirmed', (data) => { if (data.orderId?.toString() === data?._id?.toString()) { fetchActiveDelivery(); toast.success("Vendor has accepted!"); } });
  useSocketEvent('order:preparing', (data) => { if (data.orderId?.toString() === data?._id?.toString()) { fetchActiveDelivery(); toast.success("Food is being prepared"); } });
  useSocketEvent('order:ready',     (data) => { if (data.orderId?.toString() === data?._id?.toString()) { fetchActiveDelivery(); toast.success("Pickup ready! 🚨"); } });
  useSocketEvent('receive_message', (msg) => { setChatHistory(prev => [...prev, msg]); });

  // 💓 HEARTBEAT: Prevent mobile browser from putting the app to sleep during active delivery
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit('rider:heartbeat', { timestamp: Date.now() });
      }
    }, 30000); // 30s
    return () => clearInterval(heartbeat);
  }, [socket]);

  const sendMessage = (messageText) => {
    if (!messageText.trim() || !data.studentId) return;
    const studentIdRaw = data.studentId?._id || data.studentId;
    const targetRoom = `student:${studentIdRaw?.toString()}`;
    const packet = { 
       orderId: data._id?.toString(), 
       to: targetRoom, 
       message: messageText, 
       sender: user._id?.toString(), 
       timestamp: Date.now() 
    };
    socket?.emit('send_message', packet);
    setChatHistory(prev => [...prev, { ...packet, isMe: true }]);
  };

  const sendOtpToStudent = async (isResend = false) => {
    try {
      await api.post(`/delivery/orders/${data._id}/send-otp`);
      toast.success(isResend ? "PIN Resent" : "PIN Sent to Customer");
      setIsOtpSent(true);
      setResendTimer(30);
    } catch (err) { toast.error("Failed to send PIN"); }
  };

  const handleAction = async (action) => {
    try {
      if (action === 'delivered') {
        if (!deliveryOtp || deliveryOtp.length < 6) return toast.error("Enter valid PIN");
        await api.put(`/delivery/orders/${data._id}/delivered`, { otp: deliveryOtp });
        toast.success("Great job! Trip completed. 🎉");
        navigate('/delivery/dashboard');
      } else {
        await api.put(`/delivery/orders/${data._id}/${action}`);
        toast.success(action === 'picked' ? "Order Picked Up!" : "Action recorded");
        fetchActiveDelivery();
      }
    } catch(err) { toast.error(err.response?.data?.message || "Action failed"); }
  };

  if (loading) return <Loader />;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-['Inter',sans-serif]">
      {/* 🚀 RESPONSIVE TRIP HEADER (Fixed Overlap) */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-5 py-6 flex items-center justify-between">
           <button onClick={() => navigate('/delivery/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
              <FiChevronLeft size={24} />
           </button>
           <div className="text-center">
              <h1 className="text-lg font-black text-gray-800 tracking-tight">MISSION ACTIVE</h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">ID: #{data._id.slice(-6).toUpperCase()}</p>
           </div>
           <button onClick={() => setShowCancelModal(true)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
              <FiTarget size={20} />
           </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            
            {/* 🗺️ LIVE MAP (STICKY ON DESKTOP) */}
            <div className="lg:sticky lg:top-28 space-y-4">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden relative border-t-4 border-t-orange-500">
                  <div className="h-[400px] lg:h-[600px] relative z-0">
                      <MapContainer center={riderLocation || VENDOR_LATLNG} zoom={16} className="h-full w-full">
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          {riderLocation && <RecenterMap lat={riderLocation[0]} lng={riderLocation[1]} />}
                          {routeCoords.length > 0 && <Polyline positions={routeCoords} color="#FC8019" weight={5} opacity={0.6} />}
                          {riderLocation && <Marker position={riderLocation} icon={L.divIcon({ html: '<div class="text-3xl">🛵</div>', className: 'bg-transparent border-none' })} />}
                          <Marker position={VENDOR_LATLNG} icon={L.divIcon({ html: '<div class="text-2xl">🏪</div>' })} />
                      </MapContainer>
                      <div className="absolute top-4 right-4 z-[400]">
                          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${locationStatus === 'active' ? 'bg-green-50 text-green-500 border border-green-100' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${locationStatus === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                              {locationStatus === 'active' ? 'Live GPS' : 'GPS Linking...'}
                          </div>
                      </div>
                  </div>
              </div>
            </div>

            {/* 📋 TRIP LIFECYCLE & ACTIONS (RIGHT COLUMN) */}
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center relative px-2 mb-10">
                        <div className="absolute left-0 right-0 top-4 h-1 bg-gray-50 -z-0">
                            <motion.div initial={{ width: 0 }} animate={{ width: data.status === 'delivered' ? '100%' : data.status === 'picked_up' ? '66%' : data.status === 'ready' ? '33%' : '5%' }} className="h-full bg-orange-500" />
                        </div>
                        {['Pickup', 'Transit', 'Handover'].map((label, i) => {
                            const active = (i === 0 && !['picked_up', 'delivered'].includes(data.status)) || (i === 1 && data.status === 'picked_up') || (i === 2 && data.status === 'delivered');
                            const done = (i === 0 && ['picked_up', 'delivered'].includes(data.status)) || (i === 1 && data.status === 'delivered');
                            return (
                                <div key={label} className="flex flex-col items-center gap-2 relative z-10">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-4 ${done ? 'bg-orange-500 border-orange-500 text-white' : active ? 'bg-white border-orange-500 text-orange-500 scale-110 shadow-lg' : 'bg-white border-gray-50 text-gray-200'}`}>
                                        {done ? <FiCheckCircle size={14} /> : i === 0 ? <FiPackage /> : i === 1 ? <FiNavigation /> : <FiTarget />}
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${active ? 'text-orange-500' : 'text-gray-300'}`}>{label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* PICKUP INTERFACE */}
                    {data.status !== 'picked_up' && (
                        <div className="space-y-6">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                                    <FiPackage size={28} />
                                </div>
                                <div className="grow">
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Collecting From</p>
                                    <h2 className="text-2xl font-black text-gray-800 leading-tight uppercase tracking-tight">{data.vendorId?.shopName}</h2>
                                    <p className="text-sm text-gray-400 font-medium italic mt-1">{data.vendorId?.location}</p>
                                </div>
                            </div>
                            {['placed', 'confirmed', 'preparing'].includes(data.status) && (
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Est. Waiting Time</span>
                                    <span className="text-xl font-black text-orange-600 font-mono tracking-tighter">{waitTimer}</span>
                                </div>
                            )}
                            {data.status === 'ready' && (
                                <button onClick={() => handleAction('picked')} className="w-full bg-[#FC8019] text-white py-5 rounded-[2rem] font-black text-base shadow-xl shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-widest">Accept Pickup</button>
                            )}
                        </div>
                    )}

                    {/* DROP-OFF INTERFACE */}
                    {data.status === 'picked_up' && (
                        <div className="space-y-8">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <FiTarget size={28} />
                                </div>
                                <div className="grow">
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Handing Over To</p>
                                    <h2 className="text-2xl font-black text-gray-800 leading-tight uppercase tracking-tight">{data.studentId?.name}</h2>
                                    <p className="text-sm text-gray-400 font-medium italic mt-1">{data.deliveryAddress}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <a href={`tel:${data.studentId?.phone}`} className="flex items-center justify-center gap-2 py-5 rounded-[2rem] border border-green-100 bg-green-50/50 text-green-600 font-black text-xs uppercase tracking-widest transition-all hover:bg-green-50"><FiPhoneCall /> Contact</a>
                                <button onClick={() => window.scrollTo({top: document.body.scrollHeight, behavior:'smooth'})} className="flex items-center justify-center gap-2 py-5 rounded-[2rem] border border-blue-100 bg-blue-50/50 text-blue-600 font-black text-xs uppercase tracking-widest transition-all hover:bg-blue-50"><FiMessageSquare /> Chat</button>
                            </div>

                            {/* SECURE PIN ENTRY */}
                            <div className="pt-8 border-t border-gray-100 space-y-6 text-center">
                                {!isOtpSent ? (
                                    <button onClick={() => sendOtpToStudent()} className="w-full bg-gray-800 text-white py-6 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl active:scale-95 transition-all border-b-4 border-gray-950">Broadcast Delivery PIN</button>
                                ) : (
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verify PIN with Customer</p>
                                        <input 
                                            type="text" maxLength="6" value={deliveryOtp} 
                                            onChange={e => setDeliveryOtp(e.target.value.replace(/\D/g,''))}
                                            placeholder="Enter 6-digit PIN"
                                            className="w-full py-6 text-4xl font-black text-center tracking-[0.4em] bg-gray-50 rounded-[2rem] border-2 border-gray-100 focus:border-orange-500 outline-none transition-all placeholder:text-gray-200"
                                        />
                                        <button onClick={() => handleAction('delivered')} disabled={deliveryOtp.length < 6} className="w-full bg-green-500 text-white py-6 rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-xl shadow-green-500/20 active:scale-95 disabled:opacity-30 border-b-4 border-green-600">Finish Delivery</button>
                                        <button onClick={() => sendOtpToStudent(true)} disabled={resendTimer > 0} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{resendTimer > 0 ? `Resend PIN in ${resendTimer}s` : 'Resend PIN?'}</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 💬 CHAT FEED: ISOLATED TO PREVENT MAP FLICKER */}
                <DeliveryChatBox 
                  chatHistory={chatHistory} 
                  onSendMessage={sendMessage} 
                  studentName={data?.studentId?.name}
                />
            </div>
        </div>
      </div>

      {/* 🔴 CANCEL MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-[3rem] p-10">
              <div className="text-center mb-8">
                <div className="w-16 h-1 bg-gray-100 rounded-full mx-auto mb-6"></div>
                <h3 className="text-2xl font-black uppercase tracking-tight">Abort Mission?</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Cancellation logs will be generated</p>
              </div>
              <div className="space-y-3 mb-10">
                {["Vehicle Problem", "Personal/Health", "Waiting too long", "Other"].map(r => (
                  <button key={r} onClick={() => setCancelReason(r)} className={`w-full py-5 px-6 rounded-2xl text-left text-xs font-black uppercase tracking-widest transition-all ${cancelReason === r ? 'bg-orange-500 text-white shadow-xl scale-105' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{r}</button>
                ))}
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 py-5 font-black text-gray-400 text-xs uppercase tracking-widest">Hold Mission</button>
                <button onClick={() => toast.error("Cancellation locked.") || setShowCancelModal(false)} className="flex-1 py-5 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 active:scale-95">Confirm Abort</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveDelivery;

