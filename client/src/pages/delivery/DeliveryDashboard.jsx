import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../hooks/useSocket';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiMapPin, FiPackage, FiDollarSign, FiZap, FiArrowRight, FiNavigation, FiTarget } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';


const DeliveryDashboard = () => {
  const [data, setData] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);


  const fetchData = async () => {
    try {
      const [{ data: statsData }, { data: ordersData }] = await Promise.all([
        api.get('/delivery/dashboard'),
        api.get('/delivery/available-orders')
      ]);
      setData(statsData);
      setAvailableOrders(ordersData);
      if (statsData.profile.activeOrderId) navigate(`/delivery/active`);
    } catch(err) { toast.error("Failed to load dashboard") } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useSocketEvent('order:new', () => {
    fetchData();
    toast.success("New order placed on campus! 🚨");
  });

  useSocketEvent('order:ready', () => {
    fetchData();
    toast.success("An order is ready for pickup!");
  });

  const toggleAvailability = async () => {
    try {
      const res = await api.put('/delivery/toggle-availability');
      setData({ ...data, profile: { ...data.profile, isAvailable: res.data.isAvailable } });
      toast.success(res.data.isAvailable ? "You are now ONLINE" : "You are now OFFLINE");
    } catch(err) { toast.error("Toggle failed"); }
  };

  const acceptOrder = async (orderId) => {
    if (!data.profile.isAvailable) return toast.error("Go ONLINE first to accept orders.");
    try {
      await api.put(`/delivery/orders/${orderId}/accept`);
      toast.success("Order accepted!");
      navigate('/delivery/active');
    } catch(err) { 
      toast.error(err.response?.data?.message || err.message || "Acceptance failed.");
      console.error(err);
      fetchData(); 
    }
  };

  if (loading) return <Loader />;
  if (!data || !data.profile) return <div className="text-center py-20 text-red-500 font-bold">Error loading dashboard. Please refresh.</div>;

  return (
    <div className="min-h-screen bg-[#F0F2F5] pb-24">
      {/* INDUSTRIAL HEADER */}
      <div className={`pt-12 pb-8 px-6 transition-colors duration-500 rounded-b-[3rem] shadow-lg ${data.profile.isAvailable ? 'bg-slate-900 border-b-4 border-green-500' : 'bg-slate-800 border-b-4 border-red-500'}`}>
        <div className="max-w-md mx-auto flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center text-3xl overflow-hidden shadow-inner">
              {data.profile.profileImage ? <img src={data.profile.profileImage} alt="Profile" className="w-full h-full object-cover" /> : '👤'}
            </div>
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-slate-900 ${data.profile.isAvailable ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          </div>
          
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight uppercase italic">{user?.name || 'Rider'}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="bg-yellow-500 text-slate-900 px-2 py-0.5 rounded font-black text-[10px] tracking-widest uppercase">PRO RIDER</span>
              <span className="text-slate-400 text-sm font-bold">⭐ {data.profile.rating?.toFixed(1) || '5.0'}</span>
            </div>
          </div>

          {/* ONLINE/OFFLINE TOGGLE */}
          <button 
            onClick={toggleAvailability}
            className={`w-full max-w-[240px] mt-4 py-4 rounded-2xl flex items-center justify-between px-6 transition-all active:scale-95 shadow-2xl ${data.profile.isAvailable ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-400'}`}
          >
            <span className="font-black text-sm tracking-widest">{data.profile.isAvailable ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}</span>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${data.profile.isAvailable ? 'bg-green-400' : 'bg-slate-600'}`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${data.profile.isAvailable ? 'left-7 shadow-lg' : 'left-1'}`}></div>
            </div>
          </button>
        </div>
      </div>

      {/* INDUSTRIAL STATS */}
      <div className="max-w-md mx-auto -mt-6 px-4 grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Today's Earnings</p>
            <p className="text-3xl font-black text-green-600 tracking-tighter">₹{data.stats.earnings}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center">
            <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Orders Today</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{data.stats.totalDeliveries}</p>
        </div>
      </div>

      {/* DUTY FEED */}
      <div className="max-w-md mx-auto mt-10 px-4 space-y-6">
        <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Live Duty Feed</h2>
            <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                <span className="text-[10px] font-black text-slate-900">RADAR ACTIVE</span>
            </div>
        </div>

        <div className="space-y-4">
          <AnimatePresence>
            {availableOrders.map((order, idx) => (
              <motion.div 
                key={order._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <div className="bg-orange-100 text-orange-600 p-2 rounded-xl">
                            <FiPackage size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 leading-none mb-1">NEW DUTY</p>
                            <h3 className="font-black text-slate-900 text-lg tracking-tight uppercase italic">{order?.vendorId?.shopName}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 leading-none mb-1">PAYOUT</p>
                        <p className="text-2xl font-black text-primary tracking-tighter">₹{order.totalAmount}</p>
                    </div>
                  </div>

                  <div className="space-y-6 relative ml-2">
                    {/* Vertical line connector */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-dashed bg-slate-100 border-l-2 border-dashed border-slate-200"></div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="w-4 h-4 rounded-full bg-white border-4 border-slate-900 mt-1 flex-shrink-0"></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Pickup Point</p>
                            <p className="text-sm font-bold text-slate-700">{order?.vendorId?.location}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 relative z-10">
                        <div className="w-4 h-4 rounded-full bg-white border-4 border-slate-400 mt-1 flex-shrink-0"></div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Drop Location</p>
                            <p className="text-sm font-bold text-slate-700">{order?.deliveryAddress}</p>
                        </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => acceptOrder(order._id)}
                  className="w-full bg-slate-900 text-white py-5 font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  Confirm & Accept Duty <FiArrowRight className="text-primary" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {availableOrders.length === 0 && (
            <div className="bg-white/50 border-2 border-dashed border-gray-300 rounded-[2.5rem] py-20 px-10 text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <FiMapPin size={30} />
                </div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">
                    {data.profile.isAvailable ? "Scanning Campus for Duties..." : "System Offline - Go Online to Scout"}
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

};
export default DeliveryDashboard;
