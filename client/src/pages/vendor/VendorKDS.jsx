import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';
import { 
  FiClock, FiAlertCircle, FiCheckSquare, FiRefreshCw, 
  FiUser, FiShoppingBag, FiTruck, FiCheckCircle, FiPlayCircle,
  FiMapPin, FiCamera, FiTrash2, FiZap
} from 'react-icons/fi';


// --- Helper: Elapsed time since order was placed ---
const ElapsedTimer = ({ createdAt, isUrgentThreshold = 10 }) => {
  const [elapsed, setElapsed] = useState('');

  const calc = useCallback(() => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
  }, [createdAt]);

  useEffect(() => {
    setElapsed(calc());
    const id = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);

  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const isUrgent = mins >= isUrgentThreshold;
  const isWarning = mins >= Math.floor(isUrgentThreshold / 2);

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono font-black text-xs transition-all ${
      isUrgent ? 'bg-red-500/20 border-red-500/40 text-red-500 animate-pulse' :
      isWarning ? 'bg-orange-500/20 border-orange-500/40 text-orange-500' :
      'bg-slate-800/50 border-slate-700 text-slate-400'
    }`}>
      <FiClock size={12} />
      {elapsed}
    </div>
  );
};

// --- Column config (Swiggy/Zomato Professional Workflow) ---
const COLS = [
  {
    key: 'new',
    title: 'New Orders',
    subtitle: 'High Priority',
    emoji: '🛎️',
    statuses: ['placed'],
    next: 'preparing',
    nextLabel: 'Accept & Start Cooking',
    accent: 'from-rose-500/10 to-rose-900/5',
    border: 'border-rose-500/30',
    headerBg: 'bg-rose-500/10',
    headerText: 'text-rose-400',
    bumpColor: 'from-orange-500 to-rose-600 shadow-rose-500/30',
    dotColor: 'bg-rose-500',
    icon: <FiPlayCircle size={18} className="mr-2" />,
  },
  {
    key: 'cooking',
    title: 'Cooking Now',
    subtitle: 'Active Food Prep',
    emoji: '🍳',
    statuses: ['preparing'],
    next: 'ready',
    nextLabel: 'Handover to Delivery',
    accent: 'from-amber-500/10 to-amber-900/5',
    border: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
    headerText: 'text-amber-400',
    bumpColor: 'from-amber-500 to-orange-600 shadow-amber-500/30',
    dotColor: 'bg-amber-500',
    icon: <FiCheckCircle size={18} className="mr-2" />,
  },
  {
    key: 'dispatched',
    title: 'Ready / Dispatch',
    subtitle: 'Waiting for Rider',
    emoji: '🎁',
    statuses: ['ready'],
    next: null, // Ready orders vanish when rider marks 'picked_up'
    nextLabel: 'Awaiting Rider',
    accent: 'from-emerald-500/10 to-emerald-900/5',
    border: 'border-emerald-500/30',
    headerBg: 'bg-emerald-500/10',
    headerText: 'text-emerald-400',
    bumpColor: 'bg-slate-800 text-slate-500 cursor-not-allowed',
    dotColor: 'bg-emerald-500',
    icon: <FiTruck size={18} className="mr-2" />,
  },
];

const VendorKDS = () => {
  const [orders, setOrders] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [nextRefresh, setNextRefresh] = useState(30);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data);
      const statsRes = await api.get('/vendor/dashboard');
      setShopDetails(statsRes.data.shopDetails);
    } catch {
      toast.error('Failed to sync board');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const toggleStatus = async () => {
    try {
      const res = await api.put('/vendor/toggle-status');
      setShopDetails(prev => ({ ...prev, isOpen: res.data.isOpen }));
      toast.success(`Restaurant is now ${res.data.isOpen ? 'OPEN' : 'CLOSED'}`);
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    const uploadToast = toast.loading('Updating restaurant image...');
    try {
      const uploadRes = await api.post('/upload', formData);
      const imageUrl = uploadRes.data.imageUrl;
      await api.put('/vendor/profile', { shopImage: imageUrl });
      setShopDetails(prev => ({ ...prev, shopImage: imageUrl }));
      toast.success('Image updated!', { id: uploadToast });
    } catch (error) {
      toast.error('Failed to upload', { id: uploadToast });
    }
  };

  useEffect(() => {
    fetchOrders();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    const autoRefresh = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) { fetchOrders(true); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => { clearInterval(clock); clearInterval(autoRefresh); };
  }, [fetchOrders]);

  useSocketEvent('order:new', () => {
    fetchOrders(true);
    toast('🔔 New Order Arrived!', { icon: '🍱', style: { background: '#1e293b', color: '#fff' } });
  });
  useSocketEvent('order:status_update', () => fetchOrders(true));
  useSocketEvent('order:cancelled', () => { fetchOrders(true); toast.error("User cancelled their order"); });
  useSocketEvent('order:picked', () => { fetchOrders(true); toast.success("Order Dispatched!"); });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/vendor/orders/${id}/status`, { status });
      fetchOrders(true);
      toast.success(`Moved to ${status}!`);
    } catch {
      toast.error('Workflow update failed');
    }
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length;
    const completedToday = orders.filter(o => 
      o.status === 'delivered' && 
      new Date(o.updatedAt).toDateString() === new Date().toDateString()
    ).length;
    const avgPrep = orders.filter(o => o.estimatedTime).reduce((acc, curr) => acc + curr.estimatedTime, 0);
    const avgLoad = active > 0 ? Math.round(avgPrep / active) : 15;
    return { active, completedToday, avgLoad };
  }, [orders]);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-primary/30 relative">
      
      {/* 🚀 FULL-SCREEN FLOATING COMMAND OVERLAYS */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none p-6 flex flex-col md:flex-row items-start justify-between gap-6">
        
        {/* 🍱 PROFILE CARD (FLOATING ON KDS) */}
        <div className="flex items-center gap-5 relative pointer-events-auto bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 p-4 rounded-3xl shadow-2xl shadow-black ring-1 ring-white/5">
          <div 
            className="relative group/profile w-14 h-14 shrink-0 cursor-pointer"
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          >
             <div className={`w-full h-full rounded-2xl overflow-hidden border-2 transition-all duration-300 ${showProfileDropdown ? 'border-primary ring-4 ring-primary/20 scale-105' : 'border-white/10 hover:border-primary/50'}`}>
                {shopDetails?.shopImage ? (
                  <img src={shopDetails.shopImage} alt="Shop" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl bg-gradient-to-br from-slate-800 to-slate-900 font-black">🏪</div>
                )}
             </div>
             {shopDetails?.isOpen && (
               <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#020617] animate-pulse z-10" />
             )}
          </div>

          <div className="cursor-pointer group/name pr-2" onClick={() => setShowProfileDropdown(!showProfileDropdown)}>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white group-hover/name:text-primary transition-colors">
                {shopDetails?.shopName || 'Kitchen Hub'}
              </h1>
              <div className={`w-2 h-2 rounded-full ${shopDetails?.isOpen ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1.5 flex items-center gap-1.5">
              <FiMapPin className="text-primary/70" /> {shopDetails?.location || 'Live Hub'}
            </p>
          </div>

          {showProfileDropdown && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setShowProfileDropdown(false)} />
              <div className="absolute top-24 left-0 w-80 bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl shadow-black p-6 z-[70] animate-in fade-in slide-in-from-top-4 duration-200">
                 <div className="flex flex-col gap-5">
                    <div className="flex items-center gap-4">
                       <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/10">
                          {shopDetails?.shopImage ? (
                             <img src={shopDetails.shopImage} alt="Shop" className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-3xl font-black">🏪</div>
                          )}
                       </div>
                       <div className="flex-1">
                          <h2 className="text-lg font-black text-white leading-tight">{shopDetails?.shopName}</h2>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{shopDetails?.location}</span>
                             <div className={`w-1.5 h-1.5 rounded-full ${shopDetails?.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          </div>
                       </div>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</span>
                          <button onClick={toggleStatus} className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${shopDetails?.isOpen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>{shopDetails?.isOpen ? 'ONLINE' : 'OFFLINE'}</button>
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => window.location.href='/vendor/dashboard'} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Go to Dashboard</button>
                      <label className="w-full py-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center cursor-pointer">Update Photo<input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label>
                    </div>
                 </div>
              </div>
            </>
          )}
        </div>

        {/* 📊 STATS CARD (FLOATING ON KDS) */}
        <div className="hidden lg:flex items-center gap-4 pointer-events-auto bg-[#0f172a]/90 backdrop-blur-2xl border border-white/10 p-2.5 rounded-[2rem] shadow-2xl shadow-black ring-1 ring-white/5">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active queue</span>
             <span className="text-xl font-black font-mono text-orange-400">{stats.active}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completed</span>
             <span className="text-xl font-black font-mono text-emerald-400">{stats.completedToday}</span>
          </div>
          <div className="flex items-center gap-2 ml-2 pl-4 border-l border-white/10">
             <div className="flex flex-col items-end">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Next Sync</span>
               <span className="text-sm font-mono font-black text-primary">{nextRefresh}s</span>
             </div>
             <button onClick={() => { fetchOrders(true); setNextRefresh(30); }} className={`p-2.5 hover:bg-white/5 rounded-xl transition-all ${refreshing ? 'animate-spin text-primary' : 'text-slate-400'}`}>
                <FiRefreshCw size={18} />
             </button>
          </div>
        </div>
      </div>

      {/* 🚀 FULL-SCREEN KANBAN BOARD */}
      <div className="max-w-[1800px] mx-auto px-6 h-screen overflow-hidden pt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full pb-8">
          {COLS.map(col => {
            const colOrders = orders.filter(o => col.statuses.includes(o.status));
            return (
              <div key={col.key} className={`flex flex-col h-full rounded-[2rem] border ${col.border} bg-slate-900/20 backdrop-blur-md overflow-hidden relative group`}>
                <div className={`${col.headerBg} border-b ${col.border} px-6 py-5 flex items-center justify-between shrink-0`}>
                   <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${col.dotColor}`} />
                      <div>
                        <h2 className={`font-black text-sm uppercase tracking-[0.2em] ${col.headerText}`}>{col.title}</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{col.subtitle}</p>
                      </div>
                   </div>
                   <div className={`text-xs font-black px-3 py-1 rounded-full ${col.headerBg} ${col.headerText} border ${col.border}`}>{colOrders.length}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 pb-20">
                  {colOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 py-24"><FiCheckSquare size={48} /><p className="text-xs font-black uppercase tracking-[0.2em]">Queue Neutral</p></div>
                  ) : (
                    colOrders.map(order => (
                      <div key={order._id} className="bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 px-5 py-5 rounded-2xl transition-all duration-300 hover:border-slate-600 shadow-xl">
                        {col.key === 'dispatched' && (
                           <div className={`mb-3 py-1.5 px-3 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${order.deliveryBoyId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse'}`}>
                              {order.deliveryBoyId ? <FiTruck /> : <FiClock />}
                              {order.deliveryBoyId ? `Rider Assigned` : 'Searching for Rider'}
                           </div>
                        )}
                        <div className="flex items-start justify-between mb-4">
                           <div>
                              <span className="text-xl font-black font-mono text-white leading-none">#{order.orderId?.slice(-6).toUpperCase()}</span>
                              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                <FiUser className="text-primary/70" /> {order.studentId?.name || 'Anonymous Guest'}
                              </p>
                           </div>
                           <ElapsedTimer createdAt={order.createdAt} isUrgentThreshold={col.key === 'new' ? 5 : 15} />
                        </div>
                        <div className="space-y-2 mb-4">
                           {order.items?.map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between group-hover/card:translate-x-1 transition-transform">
                                <div className="flex items-center gap-2.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                   <span className="text-[13px] text-slate-300 font-medium">{item.menuItemId?.name || 'Custom Item'}</span>
                                </div>
                                <span className="font-black text-xs text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-lg group-hover/card:bg-primary group-hover/card:text-white transition-colors">×{item.quantity}</span>
                             </div>
                           ))}
                        </div>
                        {col.next && (
                           <button onClick={() => updateStatus(order._id, col.next)} className={`w-full py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white bg-gradient-to-r ${col.bumpColor} active:scale-95 transition-all`}>
                             {col.icon} {col.nextLabel} ➔
                           </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VendorKDS;
