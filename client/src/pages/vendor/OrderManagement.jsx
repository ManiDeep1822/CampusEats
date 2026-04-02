import { useState, useEffect } from 'react';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiCheck, FiCheckCircle } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get('/vendor/orders');
      setOrders(data);
    } catch(err) { toast.error("Failed to load orders"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  useSocketEvent('order:new', () => {
    fetchOrders();
    toast.success("New Order Arrived!", { duration: 5000, icon: '🔔' });
  });

  // Keep the Dashboard Synced with Status Changes (Rider Pickup, Student Cancellation, etc.)
  useSocketEvent('order:status_update', () => { fetchOrders(); });
  useSocketEvent('order:cancelled', () => { fetchOrders(); toast.error("An order was cancelled by the student"); });
  useSocketEvent('order:ready', () => { fetchOrders(); });
  useSocketEvent('order:picked', () => { fetchOrders(); });
  useSocketEvent('order:delivered', () => { fetchOrders(); });

  const handleUpdateStatus = async (orderId, newStatus, prepTime = null) => {
    const oldOrders = [...orders];
    
    // ⚡ Optimistic UI Update: Move to new status immediately
    setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));

    try {
      const payload = { status: newStatus };
      if (prepTime) payload.prepTime = prepTime;
      const { data } = await api.put(`/vendor/orders/${orderId}/status`, payload);
      // Sync with server result (this includes full object with potential backend updates)
      setOrders(orders.map(o => o._id === orderId ? data : o));
    } catch(e) { 
      // Rollback if the server fails
      setOrders(oldOrders);
      toast.error("Cloud sync failed. Status rolled back."); 
    }
  };

  if (loading) return <Loader />;

  const pendingCount = (orders || []).filter(o => ['placed', 'confirmed', 'preparing'].includes(o?.status)).length;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">Order Management</h1>
          <div className="bg-orange-100 text-primary px-4 py-2 rounded-lg font-bold">{pendingCount} Pending</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(orders || []).map(order => (
            <div key={order?._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">#{order?.orderId || 'N/A'}</span>
                  <h3 className="font-bold text-lg mt-2">{order?.studentId?.name || 'Unknown Student'}</h3>
                  <div className="text-sm text-gray-500">{order?.createdAt ? formatDistanceToNow(new Date(order.createdAt), {addSuffix: true}) : 'Recently'}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-xl text-primary">₹{order?.totalAmount || 0}</div>
                  <div className={`mt-1 text-xs font-bold uppercase ${order?.status === 'placed' ? 'text-blue-500' : order?.status === 'preparing' ? 'text-yellow-500' : order?.status === 'ready' ? 'text-green-500' : order?.status === 'cancelled' ? 'text-red-500' : 'text-gray-500'}`}>
                    {order?.status?.replace('_', ' ') || 'status'}
                  </div>
                </div>
              </div>

              <div className="flex-1 mb-4">
                {(order?.items || []).map(item => (
                  <div key={item?._id || Math.random()} className="flex justify-between text-sm mb-1">
                    <span>{item?.quantity || 1}x {item?.menuItemId?.name || 'Item'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t pt-4 flex gap-2">
                {order?.status === 'placed' && <button onClick={() => handleUpdateStatus(order._id, 'confirmed')} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-blue-100 border-b-4 border-blue-800 active:border-b-0 active:mt-1"><FiCheck className="text-xl "/> Accept & Start Cooking</button>}
                {order?.status === 'preparing' && <button onClick={() => handleUpdateStatus(order._id, 'ready')} className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-green-100 border-b-4 border-green-800 active:border-b-0 active:mt-1"><FiCheckCircle className="text-xl"/> Mark as Ready for Pickup</button>}
                {order?.status === 'ready' && <div className="w-full text-center py-2 text-orange-500 font-bold bg-orange-50 rounded-lg">Waiting for Rider Pickup</div>}
                {order?.status === 'picked_up' && <div className="w-full text-center py-2 text-blue-500 font-bold bg-blue-50 rounded-lg">Out for Delivery 🛵</div>}
                {order?.status === 'delivered' && <div className="w-full text-center py-2 text-green-500 font-bold bg-green-50 rounded-lg">Delivered Successfully 🎉</div>}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="col-span-full text-center py-20 text-gray-500">No orders yet.</div>}
        </div>
      </div>
    </div>
  );
};
export default OrderManagement;
