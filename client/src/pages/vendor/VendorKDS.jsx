import { useState, useEffect } from 'react';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { useSocketEvent } from '../../hooks/useSocket';

const VendorKDS = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data);
    } catch (e) { toast.error('Failed to load orders'); } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchOrders(); 
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useSocketEvent('order:new', () => { fetchOrders(); toast.success('New Order Received!', { icon: '🔔' }); });

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/vendor/orders/${id}/status`, { status });
      fetchOrders();
    } catch (err) { toast.error('Failed to update status'); }
  };

  if (loading) return <Loader />;

  const cols = [
    { title: '🛑 INCOMING', statuses: ['placed', 'confirmed'], next: 'preparing' },
    { title: '🍳 PREPARING', statuses: ['preparing'], next: 'ready' },
    { title: '🛍️ READY', statuses: ['ready'], next: null }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 font-sans selection:bg-orange-500/30">
      <div className="flex justify-between items-center mb-6">
        <div>
           <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-rose-400">Kitchen Display System</h1>
           <p className="text-gray-400 text-sm mt-1">Tablet-Optimized Live Kanban Board</p>
        </div>
        <div className="text-sm bg-gray-800 px-5 py-3 rounded-xl font-mono shadow-inner border border-gray-700 flex items-center space-x-3">
          <span className="text-orange-400">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-gray-500">|</span>
          <span className="font-bold">{orders.filter(o => ['placed', 'confirmed', 'preparing', 'ready'].includes(o.status)).length} Active Orders</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[85vh]">
        {cols.map(col => (
          <div key={col.title} className="bg-gray-800 rounded-2xl p-5 flex flex-col h-full overflow-hidden border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold mb-5 border-b border-gray-700 pb-3 tracking-wide">{col.title}</h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {orders.filter(o => col.statuses.includes(o.status)).map(order => (
                <div key={order._id} className="bg-gray-700 p-5 rounded-xl shadow-lg border-l-4 border-orange-500 flex flex-col transform transition hover:scale-[1.02]">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-xl font-mono text-white">#{order.orderId.substring(order.orderId.length - 6)}</span>
                    {order.scheduledFor ? (
                      <span className="text-xs font-bold bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-lg border border-purple-500/30">
                        SCHED: {new Date(order.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-600/50 text-gray-300 px-3 py-1.5 rounded-lg font-medium">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <ul className="mb-6 flex-1 space-y-2 relative">
                    {order.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between border-b border-gray-600/50 border-dashed pb-2 text-sm text-gray-100">
                        <span><span className="text-orange-400 font-extrabold text-base mr-3">{i.quantity}x</span> {i.menuItemId?.name || 'Item'}</span>
                      </li>
                    ))}
                    {order.specialInstructions && (
                       <li className="bg-orange-500/10 border border-orange-500/30 text-orange-200 p-2 rounded text-xs italic mt-2">
                         📝 "{order.specialInstructions}"
                       </li>
                    )}
                  </ul>
                  {col.next && (
                    <button 
                      onClick={() => updateStatus(order._id, col.next)}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                    >
                      BUMP ➔ {col.next.toUpperCase()}
                    </button>
                  )}
                </div>
              ))}
              {orders.filter(o => col.statuses.includes(o.status)).length === 0 && (
                <div className="h-full flex items-center justify-center opacity-30 text-sm font-bold uppercase tracking-widest text-gray-400">
                  Queue Empty
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default VendorKDS;
