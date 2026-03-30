import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';
import { 
  FiClock, FiAlertCircle, FiCheckSquare, FiRefreshCw, 
  FiUser, FiShoppingBag, FiTruck, FiCheckCircle, FiPlayCircle 
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
    } catch {
      toast.error('Failed to sync board');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  // Reliable Real-time Listeners
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

  // --- KDS Live Metrics ---
  const stats = useMemo(() => {
    const active = orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length;
    const completedToday = orders.filter(o => 
      o.status === 'delivered' && 
      new Date(o.updatedAt).toDateString() === new Date().toDateString()
    ).length;
    
    // Simple Kitchen Efficiency Logic
    const avgPrep = orders.filter(o => o.estimatedTime).reduce((acc, curr) => acc + curr.estimatedTime, 0);
    const avgLoad = active > 0 ? Math.round(avgPrep / active) : 15;

    return { active, completedToday, avgLoad };
  }, [orders]);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-primary/30">
      
      {/* 🍱 DYNAMIC HUB HEADER */}
      <div className="bg-[#0f172a] border-b border-slate-800/60 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-[1800px] mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <FiShoppingBag className="text-primary text-2xl" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                🍳 Kitchen Center
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">LIVE</span>
              </h1>
              <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest leading-none mt-1">Operational Excellence Dashboard</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl hidden lg:grid grid-cols-3 gap-4">
            {[
              { label: 'Active Queue', val: stats.active, icon: <FiClock />, color: 'text-orange-400' },
              { label: 'Avg Prep Time', val: `${stats.avgLoad}m`, icon: <FiZap className="inline -mt-1" />, color: 'text-blue-400' },
              { label: 'Completed Today', val: stats.completedToday, icon: <FiCheckCircle />, color: 'text-emerald-400' },
            ].map((s, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center justify-between group hover:border-slate-700 transition-all">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                <p className={`text-lg font-black font-mono ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Next Sync</span>
                <span className="text-base font-mono font-black text-primary w-8">{nextRefresh}s</span>
                <button onClick={() => { fetchOrders(true); setNextRefresh(30); }} className={`p-1.5 hover:bg-slate-800 rounded-lg transition-all ${refreshing ? 'animate-spin text-primary' : 'text-slate-500'}`}>
                  <FiRefreshCw size={16} />
                </button>
             </div>
             
             <div className="bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 hidden md:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Station Time</p>
                <p className="text-base font-mono font-black text-white">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
             </div>
          </div>
        </div>
      </div>

      {/* 🚀 ELITE KANBAN BOARD */}
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[calc(100vh-180px)]">
          {COLS.map(col => {
            const colOrders = orders.filter(o => col.statuses.includes(o.status));
            return (
              <div key={col.key} className={`flex flex-col rounded-[2rem] border ${col.border} bg-slate-900/20 backdrop-blur-md overflow-hidden relative group`}>
                
                {/* Lane Header */}
                <div className={`${col.headerBg} border-b ${col.border} px-6 py-5 flex items-center justify-between shrink-0 relative overflow-hidden`}>
                   <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">{col.emoji}</div>
                   <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-3 h-3 rounded-full ${col.dotColor} ${colOrders.length > 0 ? 'animate-pulse' : 'opacity-20'}`} />
                      <div>
                        <h2 className={`font-black text-sm uppercase tracking-[0.2em] ${col.headerText}`}>{col.title}</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{col.subtitle}</p>
                      </div>
                   </div>
                   <div className={`text-xs font-black px-3 py-1 rounded-full ${col.headerBg} ${col.headerText} border ${col.border}`}>
                     {colOrders.length}
                   </div>
                </div>

                {/* Card Container */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800/60 pb-10">
                  {colOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 py-24 grayscale">
                      <FiCheckSquare size={48} />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">Queue Neutral</p>
                    </div>
                  ) : (
                    colOrders.map(order => (
                      <div key={order._id} className="group/card bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 px-5 py-5 rounded-2xl transition-all duration-300 hover:border-slate-600 hover:shadow-2xl hover:shadow-black/50 active:scale-[0.98]">
                        
                        {/* Status Bar for Dispatched Lane */}
                        {col.key === 'dispatched' && (
                           <div className={`mb-3 py-1.5 px-3 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                              order.deliveryBoyId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400 animate-pulse'
                           }`}>
                              {order.deliveryBoyId ? <FiTruck /> : <FiClock />}
                              {order.deliveryBoyId ? `Rider ${order.deliveryBoyId.userId?.name || 'Assigned'} is on the way` : '🔍 Searching for nearby rider...'}
                           </div>
                        )}

                        <div className="flex items-start justify-between mb-4">
                           <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xl font-black font-mono text-white leading-none">#{order.orderId?.slice(-6).toUpperCase()}</span>
                                {order.scheduledFor && <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded-lg">SCHEDULED</span>}
                              </div>
                              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                <FiUser className="text-primary/70" /> {order.studentId?.name || 'Anonymous Guest'}
                              </p>
                           </div>
                           <ElapsedTimer createdAt={order.createdAt} isUrgentThreshold={col.key === 'new' ? 5 : 15} />
                        </div>

                        {/* Item Breakdown (High Contrast) */}
                        <div className="space-y-2 mb-4">
                           {order.items.map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between group-hover/card:translate-x-1 transition-transform">
                                <div className="flex items-center gap-2.5">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                                   <span className="text-[13px] text-slate-300 font-medium">{item.menuItemId?.name || 'Custom Item'}</span>
                                </div>
                                <span className="font-black text-xs text-primary bg-primary/5 border border-primary/20 px-2 py-0.5 rounded-lg group-hover/card:bg-primary group-hover/card:text-white transition-colors">×{item.quantity}</span>
                             </div>
                           ))}
                        </div>

                        {/* Special Instructions & Scheduling */}
                        {(order.specialInstructions || order.scheduledFor) && (
                          <div className="bg-slate-950/50 rounded-xl p-3 mb-4 space-y-2 border border-slate-800/40">
                             {order.scheduledFor && (
                               <p className="text-[11px] font-bold text-blue-400 flex items-center gap-2">
                                 ⏰ Prepare for pickup: <span className="font-mono">{new Date(order.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                               </p>
                             )}
                             {order.specialInstructions && (
                               <div className="flex items-start gap-2 text-[11px] text-orange-200 leading-relaxed italic">
                                 <FiAlertCircle size={14} className="shrink-0 mt-0.5 text-orange-400" />
                                 <span>{order.specialInstructions}</span>
                               </div>
                            )}
                          </div>
                        )}

                        {/* ACTION CALL-TO-ACTION */}
                        {col.next && (
                           <button 
                             onClick={() => updateStatus(order._id, col.next)}
                             className={`w-full group/btn flex items-center justify-center py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] text-white bg-gradient-to-r ${col.bumpColor} overflow-hidden relative active:scale-95 transition-all outline-none`}
                           >
                             <span className="relative z-10 flex items-center group-hover/btn:translate-x-1 transition-transform">{col.icon} {col.nextLabel} ➔</span>
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

// Dummy icon for stats since FiZap was used
const FiZap = ({ className, size=16 }) => {
  return (
    <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height={size} width={size} xmlns="http://www.w3.org/2000/svg">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
};
