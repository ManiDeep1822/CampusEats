import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';
import { 
  FiClock, FiCheckSquare, FiRefreshCw, 
  FiShoppingBag, FiTruck, FiCheckCircle,
  FiVolume2, FiVolumeX, FiLogOut, FiLayout
} from 'react-icons/fi';
import { Link } from 'react-router-dom';

// --- Safe Audio Helper (No external dependencies) ---
const playBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5 
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  } catch (e) {
    console.warn("Audio Context not supported or interaction required first.");
  }
};

// --- Helper: Elapsed time since order was placed ---
const ElapsedTimer = ({ createdAt, isUrgentThreshold = 10, isFlashingThreshold = 5, extraClasses = "" }) => {
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
  const isFlashing = mins >= isFlashingThreshold;
  const isUrgent = mins >= isUrgentThreshold;

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 font-mono font-black text-sm transition-all ${
      isFlashing ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse' :
      isUrgent   ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' :
      'bg-slate-800/50 border-slate-600 text-slate-300'
    } ${extraClasses}`}>
      <FiClock size={14} className={isFlashing ? "text-rose-400 shrink-0" : "shrink-0"} />
      <span className="truncate">{elapsed}</span>
    </div>
  );
};

// --- Advanced Kanban Columns ---
const COLS = [
  {
    key: 'new',
    title: 'New Orders',
    subtitle: 'Accept Immediately',
    statuses: ['placed'],
    next: 'preparing',
    nextLabel: 'Accept & Cook',
    bg: 'bg-slate-900',
    border: 'border-rose-500/30',
    headerAccent: 'bg-rose-500',
    buttonTheme: 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]',
  },
  {
    key: 'cooking',
    title: 'In Kitchen',
    subtitle: 'Preparing Food',
    statuses: ['preparing'],
    next: 'ready',
    nextLabel: 'Mark as Ready',
    bg: 'bg-slate-900',
    border: 'border-amber-500/30',
    headerAccent: 'bg-amber-500',
    buttonTheme: 'bg-amber-500 hover:bg-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
  },
  {
    key: 'dispatched',
    title: 'Ready / Dispatch',
    subtitle: 'Waiting for Rider',
    statuses: ['ready'],
    next: null,
    nextLabel: 'Awaiting Pickup',
    bg: 'bg-slate-900',
    border: 'border-emerald-500/30',
    headerAccent: 'bg-emerald-500',
    buttonTheme: 'bg-slate-800 text-slate-500 cursor-not-allowed',
  },
];

const VendorKDS = () => {
  const [orders, setOrders] = useState([]);
  const [shopDetails, setShopDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [nextRefresh, setNextRefresh] = useState(30);

  const [verifyingOrder, setVerifyingOrder] = useState(null);
  const [pickupPin, setPickupPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Time Selection Modal State
  const [selectingTimeFor, setSelectingTimeFor] = useState(null);

  // Tracking last known orders to play sound only for truly NEW orders
  const previousOrderIds = useRef(new Set());

  const fetchOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data);
      const statsRes = await api.get('/vendor/dashboard');
      setShopDetails(statsRes.data.shopDetails);

      // Check if there are NEW 'placed' orders to trigger sound
      const currentPlacedIds = new Set(data.filter(o => o.status === 'placed').map(o => o._id));
      let hasNewOrder = false;
      
      currentPlacedIds.forEach(id => {
        if (!previousOrderIds.current.has(id)) {
          hasNewOrder = true;
        }
      });

      if (hasNewOrder && soundEnabled) {
        playBeep();
      }

      previousOrderIds.current = currentPlacedIds;
    } catch {
      toast.error('Failed to sync board', { id: 'kds-err' });
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  const toggleStatus = async () => {
    try {
      // Optimistic UI for toggling shop status
      const oldStatus = shopDetails.isOpen;
      setShopDetails(prev => ({ ...prev, isOpen: !oldStatus }));
      
      const res = await api.put('/vendor/toggle-status');
      setShopDetails(prev => ({ ...prev, isOpen: res.data.isOpen }));
      toast.success(`Restaurant is now ${res.data.isOpen ? 'ONLINE' : 'OFFLINE'}`);
    } catch {
      toast.error('Failed to toggle status');
      fetchOrders(true); // Re-sync
    }
  };

  useEffect(() => {
    fetchOrders();
    const autoRefresh = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) { fetchOrders(true); return 30; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(autoRefresh);
  }, [fetchOrders]);

  // Real-time socket events
  useSocketEvent('order:new', () => {
    fetchOrders(true);
    toast('🚨 NEW ORDER ALERT!', { icon: '🔥', style: { background: '#e11d48', color: '#fff', fontSize: '1.2rem', fontWeight: 900 } });
  });
  useSocketEvent('order:status_update', () => fetchOrders(true));
  useSocketEvent('order:cancelled', () => { fetchOrders(true); toast.error("An order was CANCELLED."); });
  useSocketEvent('order:picked', () => { fetchOrders(true); toast.success("Rider picked up order!"); });

  const updateStatus = async (id, status, extraData = {}) => {
    // Optimistic UI
    const oldOrders = [...orders];
    setOrders(orders.map(o => o._id === id ? { ...o, status } : o));

    try {
      await api.put(`/vendor/orders/${id}/status`, { status, ...extraData });
      toast.success('Moved to ' + status.replace('_', ' ').toUpperCase());
      // Re-fetch to ensure full data sync (riders, etc.) matches backend
      fetchOrders(true);
      return true;
    } catch (err) {
      setOrders(oldOrders);
      toast.error(err.response?.data?.message || 'Update failed. Restoring queue.');
      return false;
    }
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (pickupPin.length !== 6) return toast.error("Enter full 6-digit PIN");
    setIsVerifying(true);
    const success = await updateStatus(verifyingOrder._id, 'delivered', { otp: pickupPin });
    if (success) {
      setVerifyingOrder(null);
      setPickupPin('');
    }
    setIsVerifying(false);
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => ['placed', 'preparing', 'ready'].includes(o.status)).length;
    const completedToday = orders.filter(o => o.status === 'delivered' && new Date(o.updatedAt).toDateString() === new Date().toDateString()).length;
    return { active, completedToday };
  }, [orders]);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans flex flex-col xl:flex-row overflow-hidden selection:bg-rose-500/30">
      
      {/* 🚀 RESPONSIVE SIDEBAR/HEADER (Command Center Controls) */}
      <aside className="w-full xl:w-72 bg-[#0B1121] border-b xl:border-b-0 xl:border-r border-slate-800 flex flex-row xl:flex-col justify-between shrink-0 z-50 p-4 lg:p-6 pb-2 xl:pb-6 overflow-x-auto xl:overflow-visible scrollbar-none">
         <div className="flex flex-row xl:flex-col items-center xl:items-stretch gap-6 xl:gap-8 min-w-max xl:min-w-0 w-full h-full">
            
            {/* Brand / Role */}
            <div className="flex items-center gap-3 shrink-0">
               <div className="w-10 h-10 xl:w-12 xl:h-12 rounded-xl bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.4)] shrink-0">
                  <FiLayout className="text-white text-lg xl:text-xl" />
               </div>
               <div className="hidden md:block">
                  <h1 className="font-black text-white text-lg xl:text-xl tracking-tighter leading-none">KDS <span className="text-rose-500">PRO</span></h1>
                  <p className="text-[9px] xl:text-[10px] uppercase font-bold tracking-widest text-slate-500">Terminal</p>
               </div>
            </div>

            {/* Shop Profile Toggle */}
            <div className="flex flex-row xl:flex-col gap-4 xl:gap-6 flex-1 shrink-0">
                <div className="bg-slate-900/50 rounded-2xl p-2 lg:p-4 border border-slate-800 flex flex-row xl:flex-col items-center gap-4">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="relative shrink-0">
                            <div className="w-10 h-10 xl:w-14 xl:h-14 rounded-xl bg-slate-800 overflow-hidden border border-slate-700">
                                {shopDetails?.shopImage ? (
                                    <img src={shopDetails.shopImage} alt="Shop" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl">🏪</div>
                                )}
                            </div>
                            <div className={`absolute -top-1 -right-1 w-3.5 h-3.5 xl:w-4 xl:h-4 rounded-full border-2 border-[#0B1121] ${shopDetails?.isOpen ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
                        </div>
                        <div className="hidden lg:block text-left">
                            <h2 className="font-black text-white leading-tight truncate max-w-[140px]">{shopDetails?.shopName}</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate max-w-[140px]">{shopDetails?.location}</p>
                        </div>
                    </div>
                    <button 
                        onClick={toggleStatus}
                        className={`w-auto xl:w-full px-4 py-2.5 xl:py-3 rounded-xl border-2 font-black text-xs uppercase tracking-widest transition-all focus:outline-none shrink-0 ${shopDetails?.isOpen ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/20' : 'bg-rose-500/10 border-rose-500 text-rose-400 hover:bg-rose-500/20'}`}
                    >
                        <span className="hidden xl:inline">{shopDetails?.isOpen ? 'Go Offline' : 'Go Online'}</span>
                        <span className="xl:hidden">{shopDetails?.isOpen ? 'ON' : 'OFF'}</span>
                    </button>
                </div>

                {/* KPI Metrics */}
                <div className="hidden xl:flex flex-col gap-3">
                   <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Queue</span>
                      <span className="text-2xl font-black font-mono text-white">{stats.active}</span>
                   </div>
                   <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Completed</span>
                      <span className="text-2xl font-black font-mono text-emerald-400">{stats.completedToday}</span>
                   </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-row xl:flex-col gap-3 shrink-0 ml-auto xl:ml-0 mt-auto">
               <button 
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-3 xl:px-4 xl:py-3 rounded-xl flex items-center justify-center xl:justify-start gap-3 transition-colors ${soundEnabled ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-500 hover:bg-slate-700 hover:text-white'}`}
                  title={soundEnabled ? "Disable Sound Alerts" : "Enable Sound Alerts"}
               >
                  {soundEnabled ? <FiVolume2 size={24} /> : <FiVolumeX size={24} />}
                  <span className="hidden xl:block font-bold text-sm">Alerts {soundEnabled ? 'ON' : 'OFF'}</span>
               </button>
               <Link 
                 to="/vendor/dashboard"
                 className="p-3 xl:px-4 xl:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center xl:justify-start gap-3 transition-colors"
               >
                  <FiLogOut size={24} className="rotate-180" />
                  <span className="hidden xl:block font-bold text-sm">Exit KDS</span>
               </Link>
            </div>
         </div>
      </aside>

      {/* 🚀 MAIN CONTENT: KANBAN BOARD */}
      <main className="flex-1 h-full xl:h-screen flex flex-col relative overflow-hidden bg-[#020617] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(244,63,94,0.1),rgba(2,6,23,0))]">
        
        {/* Sync Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-6 lg:px-10 border-b border-slate-800/50">
            <h2 className="text-xl font-black text-white/90">KITCHEN DISPLAY</h2>
            <div className="flex items-center gap-4 text-xs font-bold font-mono">
               <div className="flex items-center gap-2 text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 API Sync: {nextRefresh}s
               </div>
               <button onClick={() => { fetchOrders(true); setNextRefresh(30); }} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors">
                  <FiRefreshCw size={16} />
               </button>
            </div>
        </header>

        {/* Columns Container */}
        <div className="flex-1 overflow-y-auto xl:overflow-y-hidden overflow-x-hidden p-4 lg:p-8 xl:p-10 scrollbar-none">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 h-full pb-20 xl:pb-4 min-h-[max-content] xl:min-h-0">
            
            {COLS.map(col => {
              const colOrders = orders.filter(o => col.statuses.includes(o.status));
              return (
                <div key={col.key} className={`flex flex-col h-full rounded-[2rem] border-2 ${col.border} ${col.bg} overflow-hidden relative group`}>
                  
                  {/* Column Header */}
                  <div className={`px-6 py-4 flex items-center justify-between shrink-0 border-b-2 ${col.border} relative overflow-hidden`}>
                     <div className={`absolute top-0 left-0 w-1.5 h-full ${col.headerAccent}`} />
                     <div>
                       <h2 className={`font-black text-xl text-white uppercase tracking-wider`}>{col.title}</h2>
                       <p className="text-xs font-bold text-slate-400 mt-1">{col.subtitle}</p>
                     </div>
                     <div className={`text-xl font-black px-4 py-2 rounded-xl bg-[#0B1121] text-white border ${col.border}`}>{colOrders.length}</div>
                  </div>

                  {/* Column Body (Scrollable Order Cards) */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {colOrders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20 py-24 text-slate-500">
                         <FiCheckSquare size={64} />
                         <p className="text-sm font-black uppercase tracking-[0.2em]">Queue Clear</p>
                      </div>
                    ) : (
                      colOrders.map((order, idx) => (
                        <motion.div 
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.05 }}
                           key={order._id} 
                           className="bg-[#0B1121] rounded-2xl border-2 border-slate-800 p-5 shadow-2xl flex flex-col"
                        >
                           {/* Card Header: Details & Badges */}
                           <div className="flex flex-col gap-3 mb-5">
                             <div className="flex justify-between items-center bg-slate-900/50 rounded-lg px-3 py-2 border border-slate-800/50">
                               <span className="text-sm font-black text-white">#{order.orderId?.slice(-4).toUpperCase()}</span>
                               <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-600"/>
                                 {order.studentId?.name?.split(' ')[0] || 'Guest'}
                               </span>
                             </div>

                             <div className="flex items-stretch gap-2 w-full h-11">
                               {order.orderType === 'take_away' ? (
                                 <div className="flex-1 flex justify-center items-center rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest gap-2 text-center leading-tight">
                                    <FiShoppingBag size={14} className="shrink-0"/> <span>Takeaway</span>
                                 </div>
                               ) : (
                                 <div className={`flex-1 flex justify-center items-center rounded-lg border text-[10px] font-black uppercase tracking-widest gap-2 text-center leading-tight ${order.deliveryBoyId ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'}`}>
                                    <FiTruck size={14} className="shrink-0"/> <span>{order.deliveryBoyId ? (
                                      <span className="block">Rider<br/>Alerted</span>
                                    ) : (
                                      <span className="block">Searching<br/>Rider</span>
                                    )}</span>
                                 </div>
                               )}
                               
                               <ElapsedTimer createdAt={order.createdAt} isFlashingThreshold={col.key === 'new' ? 5 : 999} isUrgentThreshold={10} extraClasses="flex-1 justify-center h-full w-full" />
                             </div>
                           </div>

                           {/* Card Body: The Massive Items List */}
                           <div className="flex-1 space-y-3 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50">
                              {order.items?.map((item, idxx) => (
                                <div key={idxx} className="flex font-black text-white items-start gap-4">
                                   <div className={`px-3 py-1 rounded-lg text-lg min-w-[3rem] text-center shrink-0 ${col.headerAccent} text-slate-900 shadow-inner border border-white/20`}>
                                     {item.quantity}×
                                   </div>
                                   <span className="text-xl leading-tight pt-1 break-words">{item.menuItemId?.name || 'Item'}</span>
                                </div>
                              ))}
                           </div>

                           {/* Card Footer: The Core Action Button */}
                           <div className="mt-auto">
                              {order.orderType === 'take_away' && order.status === 'ready' ? (
                                <button 
                                  onClick={() => setVerifyingOrder(order)} 
                                  className="w-full py-5 rounded-xl font-black text-sm uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-500 hover:-translate-y-1 active:translate-y-0 shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all duration-200"
                                >
                                  Verify PIN & Handover
                                </button>
                              ) : col.next ? (
                                 <button 
                                   onClick={() => col.next === 'preparing' ? setSelectingTimeFor(order) : updateStatus(order._id, col.next)} 
                                   className={`w-full py-5 rounded-xl font-black text-sm uppercase tracking-widest transition-all duration-200 hover:-translate-y-1 active:translate-y-0 ${col.buttonTheme}`}
                                 >
                                   {col.nextLabel}
                                 </button>
                              ) : (
                                 <div className="w-full py-4 text-center rounded-xl font-black text-xs uppercase tracking-widest bg-slate-900 text-slate-600 border-2 border-dashed border-slate-800">
                                   Awaiting Rider Pickup
                                 </div>
                              )}
                           </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 🚀 COMPACT PIN VERIFICATION MODAL 🚀 */}
      <AnimatePresence>
        {verifyingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="relative w-full max-w-[400px] bg-[#0B1121] border border-white/20 lg:border-2 lg:border-indigo-500/50 rounded-[2rem] p-6 lg:p-8 shadow-[0_0_50px_rgba(79,70,229,0.3)]"
            >
               {/* Modal Header */}
               <div className="text-center mb-6">
                 <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner border border-indigo-500/30">
                   🔑
                 </div>
                 <h2 className="text-2xl font-black text-white mb-1.5 tracking-tight">Verify Handover</h2>
                 <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-balance px-4">
                   Student <span className="text-indigo-400">{(verifyingOrder.studentId?.name || '').split(' ')[0]}</span> must provide 6-digit PIN
                 </p>
               </div>

               {/* Modal Form */}
               <form onSubmit={handleVerifyPin} className="space-y-6">
                  <input 
                    type="text" 
                    maxLength="6"
                    value={pickupPin}
                    onChange={(e) => setPickupPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••" 
                    className="w-full bg-[#020617] border-2 border-slate-700 rounded-xl px-4 py-4 text-center text-3xl sm:text-4xl font-mono font-black tracking-[0.5em] pl-[calc(1rem+0.5em)] text-white outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all placeholder:text-slate-700"
                    autoFocus
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setVerifyingOrder(null)}
                      className="py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={pickupPin.length !== 6 || isVerifying}
                      className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isVerifying ? <FiRefreshCw className="animate-spin text-lg" /> : <FiCheckCircle className="text-lg" />}
                      HANDOVER
                    </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🚀 PREPARATION TIME SELECTION MODAL (Zomato/Swiggy Style) 🚀 */}
      <AnimatePresence>
        {selectingTimeFor && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 20 }}
               className="relative w-full max-w-[450px] bg-[#0B1121] border border-white/10 lg:border-2 lg:border-rose-500/30 rounded-[2.5rem] p-8 shadow-[0_0_60px_rgba(225,29,72,0.2)]"
            >
               <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-rose-500/30">
                    🍳
                  </div>
                  <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">How much time?</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                    Set preparation time for order <span className="text-rose-500">#{selectingTimeFor.orderId?.slice(-4).toUpperCase()}</span>
                  </p>
               </div>

               <div className="grid grid-cols-2 gap-3 mb-8">
                  {[10, 15, 20, 30, 45, 60].map((mins) => (
                    <button 
                      key={mins}
                      onClick={async () => {
                        const success = await updateStatus(selectingTimeFor._id, 'preparing', { prepTime: mins });
                        if (success) setSelectingTimeFor(null);
                      }}
                      className="group p-4 bg-slate-900/50 border-2 border-slate-800 rounded-2xl hover:border-rose-500 hover:bg-rose-500/5 transition-all flex flex-col items-center justify-center gap-1"
                    >
                      <span className="text-2xl font-black text-white group-hover:text-rose-500">{mins}</span>
                      <span className="text-[10px] font-black text-slate-500 group-hover:text-rose-400 uppercase tracking-widest">Minutes</span>
                    </button>
                  ))}
               </div>

               <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectingTimeFor(null)}
                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    Not Now (Default 15m)
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorKDS;
