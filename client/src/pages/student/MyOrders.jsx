import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import { formatDistanceToNow } from 'date-fns';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        const { data } = await api.get('/student/orders');
        // Defensive mapping to ensure data integrity
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch orders", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMyOrders();
  }, []);

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold font-heading mb-8">My Orders</h1>
        
        {orders.length === 0 ? (
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 text-center">
            <span className="text-6xl mb-4 block">🛒</span>
            <h3 className="text-xl font-bold mb-2">No orders yet</h3>
            <p className="text-gray-500 mb-6">Looks like you haven't bought anything yet.</p>
            <Link to="/student/home" className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-orange-500/20">Browse Restaurants</Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map(order => (
              <div key={order._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded text-gray-600">#{order.orderId}</span>
                    <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                      order.status === 'placed' ? 'bg-blue-100 text-blue-600' : 
                      order.status === 'preparing' ? 'bg-yellow-100 text-yellow-600' : 
                      order.status === 'ready' ? 'bg-green-100 text-green-600' : 
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="font-bold text-xl">{order.vendorId?.shopName || 'Unknown Vendor'}</h3>
                  <div className="text-sm text-gray-500 mt-1">
                    {order.createdAt ? formatDistanceToNow(new Date(order.createdAt), {addSuffix: true}) : 'Recently'}
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {order.items.map((item, i) => (
                      <span key={i} className="text-xs bg-gray-50 border px-2 py-1 rounded text-gray-600">
                        {item.quantity}x {item.menuItemId?.name || 'Item'}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-3 min-w-[140px]">
                  <div className="font-extrabold text-2xl text-primary">₹{order.totalAmount}</div>
                  <Link to={`/student/tracking/${order._id}`} className="w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-xl transition">
                    View Details
                  </Link>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default MyOrders;
