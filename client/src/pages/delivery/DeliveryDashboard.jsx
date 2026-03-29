import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../hooks/useSocket';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiArrowRight, FiTrendingUp, FiActivity, FiClock } from 'react-icons/fi';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


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

  useSocketEvent('rider:stats_update', () => {
    fetchData();
    toast.success("Earnings Intel Updated! 🎉");
  });

  useSocketEvent('order:accepted_by_other', () => {
    fetchData();
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
            <h1 className="text-2xl font-black text-white tracking-tight leading-tight uppercase">{user?.name || 'Rider'}</h1>
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

      {/* INDUSTRIAL STATS & CHART MATRIX */}
      <div className="max-w-md mx-auto -mt-6 px-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Today&apos;s Earnings</p>
              <p className="text-3xl font-black text-green-600 tracking-tighter">₹{data.stats.todaysEarnings}</p>
          </motion.div>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-[2rem] shadow-xl border border-gray-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">Completed</p>
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{data.stats.todaysOrders}</p>
          </motion.div>
        </div>

        {/* WEEKLY PERFORMANCE CHART */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-gray-100"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Earnings Intel</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Last 7 Sessions</p>
            </div>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <FiTrendingUp size={18} />
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyData || []} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 900, color: '#10b981' }}
                />
                <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* TACTICAL RADAR FEED */}
      <div className="max-w-md mx-auto mt-12 px-4 space-y-6">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
              Live Duty Radar
            </h2>
            <span className="text-[10px] font-black text-slate-400 uppercase">{availableOrders.length} Tasks Found</span>
        </div>

        <AnimatePresence mode="popLayout">
          {availableOrders.length > 0 ? (
            availableOrders.map((order, idx) => (
              <motion.div 
                key={order._id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 relative overflow-hidden mb-4"
              >
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full">₹{order.deliveryFee || 15}</span>
                </div>

                <div className="flex gap-4">
                  <div className="flex flex-col items-center py-1">
                    <div className="w-3 h-3 rounded-full border-2 border-orange-500 bg-white"></div>
                    <div className="w-0.5 grow border-l-2 border-dashed border-slate-200 my-1"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-900"></div>
                  </div>
                  
                  <div className="space-y-4 grow">
                    <div>
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">Pickup</p>
                      <p className="text-sm font-black text-slate-800 leading-tight">{order.vendorId?.shopName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Drop-off</p>
                      <p className="text-sm font-black text-slate-800 leading-tight">{order.deliveryAddress}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => acceptOrder(order._id)}
                  disabled={!data.profile.isAvailable}
                  className={`w-full mt-6 py-4 rounded-xl font-black text-xs tracking-[0.2em] uppercase transition-all active:scale-95 flex items-center justify-center gap-2 ${data.profile.isAvailable ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  Confirm & Accept <FiArrowRight />
                </button>
              </motion.div>
            ))
          ) : (
            <div className="bg-slate-100/50 rounded-[2.5rem] py-16 px-8 text-center border-2 border-dashed border-slate-200">
               <FiActivity className="mx-auto text-slate-300 mb-4" size={48} />
               <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">
                  {data.profile.isAvailable ? "Scanning Campus for Tasks..." : "Radar Offline - Go Online"}
               </p>
            </div>
          )}
        </AnimatePresence>

        {/* RECENT ACTIVITY */}
        {data.recentDeliveries?.length > 0 && (
          <div className="mt-12 pb-12">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <FiClock className="text-slate-400" />
              Recent Missions
            </h2>
            <div className="space-y-3">
              {data.recentDeliveries.map(order => (
                <div key={order._id} className="bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-white/20 flex items-center justify-between shadow-sm">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</div>
                     <div>
                       <p className="text-xs font-black text-slate-800">{order.vendorId?.shopName}</p>
                       <p className="text-[10px] font-bold text-slate-400">{new Date(order.deliveredAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                     </div>
                   </div>
                   <p className="font-black text-slate-900 text-sm">₹{order.deliveryFee || 15}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryDashboard;
