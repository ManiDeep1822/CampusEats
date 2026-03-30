import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';
import { FiClock, FiAlertCircle, FiCheckSquare, FiRefreshCw } from 'react-icons/fi';

// --- Helper: Elapsed time since order was placed ---
const ElapsedTimer = ({ createdAt }) => {
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
  const isUrgent = mins >= 10;
  const isWarning = mins >= 5 && mins < 10;

  return (
    <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
      isUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' :
      isWarning ? 'bg-yellow-500/20 text-yellow-400' :
      'bg-slate-700 text-slate-400'
    }`}>
      <FiClock size={10} className="inline mr-1 -mt-0.5" />
      {elapsed}
    </span>
  );
};

// --- Column config ---
const COLS = [
  {
    key: 'incoming',
    title: 'Incoming Orders',
    emoji: '🛎️',
    statuses: ['placed'],
    next: 'confirmed',
    nextLabel: 'Accept & Start Cooking',
    accent: 'from-orange-500/10 to-rose-900/10',
    border: 'border-orange-500/30',
    headerBg: 'bg-orange-500/10',
    headerText: 'text-orange-400',
    bumpColor: 'from-blue-600 to-indigo-600 shadow-blue-500/30',
    dotColor: 'bg-orange-400',
  },
  {
    key: 'preparing',
    title: 'Cooking Now',
    emoji: '🍳',
    statuses: ['preparing'],
    next: 'ready',
    nextLabel: 'Mark Ready & Notify',
    accent: 'from-amber-500/10 to-yellow-900/10',
    border: 'border-amber-500/30',
    headerBg: 'bg-amber-500/10',
    headerText: 'text-amber-400',
    bumpColor: 'from-emerald-500 to-green-600 shadow-green-500/30',
    dotColor: 'bg-amber-400',
  },
];

const VendorKDS = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useSocketEvent('order:new', () => {
    fetchOrders(true);
    toast.success('🔔 New order received!', { style: { background: '#1e293b', color: '#fff', border: '1px solid #f97316' } });
  });

  // Keep KDS Synced with Status Changes (Rider Pickup, Student Cancellation, etc.)
  useSocketEvent('order:status_update', () => { fetchOrders(true); });
  useSocketEvent('order:cancelled', () => { fetchOrders(true); toast.error("An order was cancelled by the student"); });
  useSocketEvent('order:ready', () => { fetchOrders(true); });
  useSocketEvent('order:picked', () => { fetchOrders(true); });
  useSocketEvent('order:delivered', () => { fetchOrders(true); });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/vendor/orders/${id}/status`, { status });
      fetchOrders(true);
      toast.success(`Order bumped to ${status}!`, { icon: '⚡' });
    } catch {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <Loader />;

  const activeCount = orders.filter(o => ['placed', 'confirmed', 'preparing', 'ready'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white font-sans select-none">

      {/* ── PAGE HEADER (sits below shared Navbar) ── */}
      <div className="bg-[#0d1424] border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black tracking-tight">🍳 Kitchen Display System</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Live Kanban Board · Tablet-Optimized</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-center hidden sm:block">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Time</p>
            <p className="text-base font-mono font-black text-primary leading-none">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-sm ${activeCount > 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-primary animate-pulse' : 'bg-slate-600'}`} />
            {activeCount} Active {activeCount === 1 ? 'Order' : 'Orders'}
          </div>

          <button 
            onClick={() => fetchOrders(true)}
            disabled={refreshing}
            className={`flex items-center justify-center p-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-700 transition-all active:scale-90 ${refreshing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            title="Force Sync Board"
          >
            <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KANBAN BOARD ── */}
      <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[calc(100vh-130px)] max-w-7xl mx-auto w-full">
        {COLS.map(col => {
          const colOrders = orders.filter(o => col.statuses.includes(o.status));
          return (
            <div key={col.key} className={`flex flex-col rounded-2xl border ${col.border} bg-gradient-to-b ${col.accent} overflow-hidden`}>

              {/* Column Header */}
              <div className={`${col.headerBg} border-b ${col.border} px-5 py-3 flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} ${colOrders.length > 0 ? 'animate-pulse' : 'opacity-30'}`} />
                  <h2 className={`font-black text-sm uppercase tracking-widest ${col.headerText}`}>{col.emoji} {col.title}</h2>
                </div>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${col.headerBg} ${col.headerText} border ${col.border}`}>
                  {colOrders.length}
                </span>
              </div>

              {/* Order Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
                {colOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20 py-16">
                    <FiCheckSquare size={32} />
                    <p className="text-xs font-black uppercase tracking-widest">Queue Clear</p>
                  </div>
                ) : (
                  colOrders.map(order => (
                    <div
                      key={order._id}
                      className="bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-all"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black font-mono text-white">
                            #{order.orderId?.slice(-6).toUpperCase()}
                          </span>
                          {order.scheduledFor && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                              SCHED
                            </span>
                          )}
                        </div>
                        <ElapsedTimer createdAt={order.createdAt} />
                      </div>

                      {/* Customer name if available */}
                      {order.studentId?.name && (
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest -mt-1">
                          For: {order.studentId.name}
                        </p>
                      )}

                      {/* Scheduled time */}
                      {order.scheduledFor && (
                        <p className="text-[10px] text-purple-400 font-bold">
                          ⏰ Pickup: {new Date(order.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}

                      {/* Divider */}
                      <div className="border-t border-slate-700/50" />

                      {/* Items */}
                      <ul className="space-y-1.5">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-slate-200 font-medium">{item.menuItemId?.name || 'Item'}</span>
                            <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg text-xs">
                              ×{item.quantity}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* Special Instructions */}
                      {order.specialInstructions && (
                        <div className="flex items-start gap-2 bg-orange-500/5 border border-orange-500/20 rounded-lg px-3 py-2 text-xs text-orange-300">
                          <FiAlertCircle size={12} className="shrink-0 mt-0.5" />
                          <span>{order.specialInstructions}</span>
                        </div>
                      )}

                      {/* BUMP Button */}
                      {col.next && (
                        <button
                          onClick={() => updateStatus(order._id, col.next)}
                          className={`w-full mt-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-r ${col.bumpColor} shadow-lg active:scale-95 transition-all hover:brightness-110`}
                        >
                          {col.nextLabel} ➔
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
  );
};

export default VendorKDS;
