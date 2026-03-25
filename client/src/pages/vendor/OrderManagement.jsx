import { useState, useEffect } from 'react';
import { useSocketEvent } from '../../hooks/useSocket';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiCheck, FiPlay, FiCheckCircle } from 'react-icons/fi';
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

  useSocketEvent('order:cancelled', () => {
    fetchOrders();
    toast.error("An order was cancelled by the student", { duration: 4000 });
  });

  const handleUpdateStatus = async (orderId, newStatus, prepTime = null) => {
    try {
      const payload = { status: newStatus };
      if (prepTime) payload.prepTime = prepTime;
      const { data } = await api.put(`/vendor/orders/${orderId}/status`, payload);
      setOrders(orders.map(o => o._id === orderId ? data : o));
      toast.success(`Order marked as ${newStatus}`);
    } catch(e) { toast.error("Failed to update status"); }
  };

  if (loading) return <Loader />;

  const pendingCount = orders.filter(o => ['placed', 'confirmed', 'preparing'].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold font-heading">Order Management</h1>
          <div className="bg-orange-100 text-primary px-4 py-2 rounded-lg font-bold">{pendingCount} Pending</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orders.map(order => (
            <div key={order._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="flex justify-between items-start mb-4 border-b pb-4">
                <div>
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">#{order.orderId}</span>
                  <h3 className="font-bold text-lg mt-2">{order.studentId?.name || 'Unknown Student'}</h3>
                  <div className="text-sm text-gray-500">{formatDistanceToNow(new Date(order.createdAt), {addSuffix: true})}</div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold text-xl text-primary">₹{order.totalAmount}</div>
                  <div className={`mt-1 text-xs font-bold uppercase ${order.status === 'placed' ? 'text-blue-500' : order.status === 'preparing' ? 'text-yellow-500' : order.status === 'ready' ? 'text-green-500' : order.status === 'cancelled' ? 'text-red-500' : 'text-gray-500'}`}>
                    {order.status.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <div className="flex-1 mb-4">
                {order.items.map(item => (
                  <div key={item._id || Math.random()} className="flex justify-between text-sm mb-1">
                    <span>{item.quantity}x {item.menuItemId?.name || 'Item'}</span>
                  </div>
                ))}
              </div>

              <div className="mt-auto border-t pt-4 flex gap-2">
                {order.status === 'placed' && <button onClick={() => handleUpdateStatus(order._id, 'confirmed')} className="flex-1 bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 flex items-center justify-center gap-1"><FiCheck/> Accept</button>}
                {order.status === 'confirmed' && <button onClick={() => handleUpdateStatus(order._id, 'preparing', 20)} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-bold hover:bg-yellow-600 flex items-center justify-center gap-1"><FiPlay/> Start Prep</button>}
                {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order._id, 'ready')} className="flex-1 bg-accent text-white py-2 rounded-lg font-bold hover:bg-green-600 flex items-center justify-center gap-1"><FiCheckCircle/> Mark Ready</button>}
                {order.status === 'ready' && <div className="w-full text-center py-2 text-orange-500 font-bold bg-orange-50 rounded-lg">Waiting for Rider Pickup</div>}
                {order.status === 'picked_up' && <div className="w-full text-center py-2 text-blue-500 font-bold bg-blue-50 rounded-lg">Out for Delivery 🛵</div>}
                {order.status === 'delivered' && <div className="w-full text-center py-2 text-green-500 font-bold bg-green-50 rounded-lg">Delivered Successfully 🎉</div>}
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
