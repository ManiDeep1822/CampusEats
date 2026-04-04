import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../hooks/useSocket';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiArrowRight, FiTrendingUp, FiActivity, FiClock, FiMapPin, FiHome, FiList, FiUser, FiPower, FiCrosshair } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DeliveryDashboard = () => {
  const [data, setData] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('Campus Active');
  const [locating, setLocating] = useState(false);
  const [activeTab, setActiveTab ] = useState('home');
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const lastFetchRef = useRef(0);

  // Optimized fetching logic with a small cooldown
  const fetchData = async (force = false) => {
    const now = Date.now();
    if (!force && lastFetchRef.current > now - 2000) return; // Prevent double-fetches within 2s
    lastFetchRef.current = now;

    try {
      const [{ data: statsData }, { data: ordersData }] = await Promise.all([
        api.get('/delivery/dashboard'),
        api.get('/delivery/available-orders')
      ]);
      setData(statsData);
      setAvailableOrders(ordersData);
      if (statsData.profile.activeOrderId) navigate(`/delivery/active`);
    } catch(err) { 
      toast.error("Failed to load dashboard") 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(true); }, []);

  // Socket updates (Throttled for better "performance" feel)
  useSocketEvent('order:new', () => { fetchData(); toast.success("New task found on campus! 🚨"); });
  useSocketEvent('order:ready', () => { fetchData(); toast.success("Food is ready for pickup!"); });
  useSocketEvent('rider:stats_update', () => fetchData());
  useSocketEvent('order:accepted_by_other', () => fetchData());

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddress('Campus (Synced)');
        setLocating(false);
        toast.success('Rider position synced!');
      },
      (err) => {
        setLocating(false);
        toast.error('Location error: ' + err.message);
      }
    );
  };

  const toggleAvailability = async () => {
    const oldIsAvailable = data.profile.isAvailable;
    setData({ ...data, profile: { ...data.profile, isAvailable: !oldIsAvailable } });
    try {
      const res = await api.put('/delivery/toggle-availability');
      setData({ ...data, profile: { ...data.profile, isAvailable: res.data.isAvailable } });
      toast.success(res.data.isAvailable ? "ON DUTY 🟢" : "OFF DUTY 🔴", { position: 'top-center' });
    } catch(err) { 
      setData({ ...data, profile: { ...data.profile, isAvailable: oldIsAvailable } });
      toast.error("Sync failed."); 
    }
  };

  const acceptOrder = async (orderId) => {
    if (!data.profile.isAvailable) return toast.error("Go ON DUTY first.");
    const toastId = toast.loading("Accepting task...");
    try {
      await api.put(`/delivery/orders/${orderId}/accept`);
      toast.success("Task accepted!", { id: toastId });
      navigate('/delivery/active');
    } catch(err) { 
      toast.error(err.response?.data?.message || "Task already taken", { id: toastId });
      fetchData(); 
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const upiId = e.target.upiId.value;
    const saveToast = toast.loading('Saving payout details...');
    try {
      await api.put('/delivery/profile', { paymentDetails: { upiId } });
      toast.success('Payout destination updated! 💸', { id: saveToast });
      fetchData(true);
    } catch (error) {
      toast.error('Failed to update payout info', { id: saveToast });
    }
  };

  if (loading) return <Loader />;
  if (!data || !data.profile) return <div className="text-center py-20 text-red-500 font-bold">Error loading dashboard. Please refresh.</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter',sans-serif]">
      {/* 🚀 RIDER STATUS SECTION (Fixed position to avoid Navbar overlap) */}
      <div className={`bg-white border-b transition-all duration-500 ${data.profile.isAvailable ? 'border-orange-100 shadow-sm' : 'bg-slate-50 border-gray-100 opacity-90'}`}>
        <div className="max-w-7xl mx-auto px-5 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-2xl overflow-hidden shadow-sm border-2 border-white">
                {(user?.profilePic || data.profile.profilePic || data.profile.profileImage) ? (
                  <img src={user?.profilePic || data.profile.profilePic || data.profile.profileImage} alt="Rider" className="w-full h-full object-cover" />
                ) : '🛵'}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${data.profile.isAvailable ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authenticated Rider</p>
              <h1 className="text-xl font-black text-gray-800 leading-tight">{user?.name}</h1>
              <p className="text-[9px] font-bold text-gray-400 font-mono uppercase tracking-widest mt-0.5">ID: {data.profile._id.slice(-8).toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleGetLocation}
              className={`p-2.5 rounded-xl border transition-all ${locating ? 'bg-orange-50 text-orange-500 border-orange-100' : 'bg-white text-gray-400 hover:text-gray-600'}`}
              title="Sync Position"
            >
              <FiCrosshair className={locating ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={toggleAvailability}
              className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 border-2 ${data.profile.isAvailable ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-400'}`}
            >
              <FiPower className={data.profile.isAvailable ? 'animate-pulse' : ''} />
              <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">{data.profile.isAvailable ? 'ON DUTY' : 'OFF DUTY'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5 space-y-8">
        
        {/* 📊 RESPONSIVE STATS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Today', value: `₹${data.stats.todaysEarnings}`, icon: <FiTrendingUp />, color: 'orange' },
              { label: 'Orders', value: data.stats.todaysOrders, icon: <FiActivity />, color: 'blue' },
              { label: 'Rating', value: data.profile.rating?.toFixed(1) || '5.0', icon: '⭐', color: 'yellow' },
              { label: 'Status', value: data.profile.isAvailable ? 'Online' : 'Offline', icon: <FiMapPin />, color: data.profile.isAvailable ? 'green' : 'red' }
            ].map((stat, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${stat.color === 'orange' ? 'bg-orange-50 text-orange-500' : stat.color === 'blue' ? 'bg-blue-50 text-blue-500' : stat.color === 'green' ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-500'}`}>
                     {stat.icon}
                  </div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">{stat.value}</p>
              </motion.div>
            ))}
        </div>

        {/* 💸 RIDER SETTLEMENT CENTER */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-shrink-0 text-center lg:text-left">
            <h2 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">Settlement Center</h2>
            <p className="text-[10px] font-bold text-gray-400 mb-4 max-w-[200px] leading-relaxed uppercase tracking-wider">Your mission rewards are settled every week by the admin via UPI.</p>
            <div className="inline-block p-5 bg-orange-600 rounded-[2rem] shadow-lg shadow-orange-500/20">
              <p className="text-[9px] font-black text-orange-200 uppercase tracking-[0.2em] mb-1">Unpaid Balance</p>
              <p className="text-3xl font-black text-white">₹{data.stats.pendingPayout || 0}</p>
            </div>
          </div>

          <div className="flex-1 w-full p-7 bg-gray-50 rounded-[2.5rem] border border-gray-100">
            <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-orange-500" />
              Update Payout Destination
            </h3>
            <form onSubmit={handleUpdatePayment} className="flex flex-col sm:flex-row gap-3">
              <input 
                name="upiId"
                defaultValue={data.profile.paymentDetails?.upiId || ''}
                placeholder="Enter UPI ID (e.g. name@upi)"
                className="flex-1 bg-white border-2 border-gray-100 rounded-2xl px-5 py-3.5 focus:border-orange-500 outline-none text-sm font-bold transition-all"
                required
              />
              <button 
                type="submit"
                className="bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest px-8 py-3.5 rounded-2xl hover:bg-black transition shadow-lg active:scale-95"
              >
                Save UPI
              </button>
            </form>
            <div className="flex items-center gap-2 mt-4">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
               <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Your earnings are secured in the platform ledger until settlement.</p>
            </div>
          </div>
        </div>

        {/* 🚨 MAIN DESKTOP GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LIVE TASKS (MAIN COLUMN) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${data.profile.isAvailable ? 'bg-orange-500' : 'bg-gray-300'}`}></span>
                  Available Missions ({availableOrders.length})
                </h2>
                <p className="text-[10px] items-center gap-1 font-black text-gray-400 uppercase tracking-widest hidden sm:flex">
                   <FiMapPin size={10} /> Active Campus Radar
                </p>
            </div>

            <AnimatePresence mode="popLayout">
              {availableOrders.length > 0 ? (
                availableOrders.map((order, idx) => (
                  <motion.div 
                    key={order._id}
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 relative overflow-hidden group hover:border-orange-200 transition-all"
                  >
                    <div className="absolute top-0 right-0 pt-8 pr-10">
                      <p className="text-3xl font-black text-orange-600 tracking-tighter">₹{order.deliveryFee || 15}</p>
                      <p className="text-[9px] font-black text-gray-400 uppercase text-right">Trip Reward</p>
                    </div>

                    <div className="flex gap-6">
                      <div className="flex flex-col items-center py-1">
                        <div className="w-5 h-5 rounded-full border-4 border-orange-100 bg-orange-500"></div>
                        <div className="w-0.5 grow bg-gray-100 my-2"></div>
                        <div className="w-5 h-5 rounded-full border-4 border-blue-100 bg-blue-500"></div>
                      </div>
                      
                      <div className="space-y-6 grow">
                        <div>
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Restaurant Location</p>
                          <p className="text-lg font-black text-gray-800 leading-tight">{order.vendorId?.shopName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Customer Delivery Point</p>
                          <p className="text-sm font-black text-gray-600 leading-tight">{order.deliveryAddress}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                      <button 
                        onClick={() => acceptOrder(order._id)}
                        disabled={!data.profile.isAvailable}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 ${data.profile.isAvailable ? 'bg-[#FC8019] text-white hover:bg-orange-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                      >
                         Take Mission <FiArrowRight />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white rounded-[3rem] py-20 px-8 text-center border-2 border-dashed border-gray-100">
                   <div className="text-5xl mb-4">📡</div>
                   <p className="text-gray-500 font-black text-xs uppercase tracking-[0.2em]">
                      {data.profile.isAvailable ? "Scanning Campus for Active Signals..." : "Radar Offline - Go On Duty to Listen"}
                   </p>
                   <div className="mt-6 flex justify-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-gray-100 animate-pulse"></span>
                       <span className="w-2 h-2 rounded-full bg-gray-200 animate-pulse delay-75"></span>
                       <span className="w-2 h-2 rounded-full bg-gray-100 animate-pulse delay-150"></span>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* SIDEBAR COL (DESKTOP ONLY) */}
          <div className="space-y-8">
            {/* PERFORMANCE (RE-USE EXISTING CHART) */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <h2 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-6">Performance</h2>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.weeklyData || []}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="earnings" stroke="#f97316" strokeWidth={4} fillOpacity={1} fill="url(#colorEarnings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
            </div>

            {/* MISSION HISTORY (SIDEBAR STYLE) */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
               <div className="flex items-center justify-between gap-2 mb-6 px-1">
                  <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <FiClock size={14} /> Mission Logs
                  </h2>
                  <button onClick={() => navigate('/delivery/payments')} className="text-[10px] font-black text-orange-500 uppercase tracking-widest hover:underline">View Earnings</button>
               </div>
               <div className="space-y-4">
                  {(data?.recentDeliveries?.slice(0, 5) || []).map(order => (
                    <div key={order?._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200 transition-all cursor-default">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-bold text-green-500 text-xs">✓</div>
                         <div>
                           <p className="text-[11px] font-black text-gray-800 uppercase leading-none mb-1">{order?.vendorId?.shopName}</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Completed</p>
                         </div>
                       </div>
                       <p className="font-black text-gray-800 text-xs">₹{order?.deliveryFee || 15}</p>
                    </div>
                  ))}
                  {(!data.recentDeliveries || data.recentDeliveries.length === 0) && <p className="text-center py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">No recent missions</p>}
               </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DeliveryDashboard;


