import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSocketEvent } from '../../hooks/useSocket';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiMapPin, FiPackage, FiDollarSign } from 'react-icons/fi';

const DeliveryDashboard = () => {
  const [data, setData] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Rider Dashboard</h1>
            <p className="text-gray-500">{data.profile.vehicleType} • ⭐ {data.profile.rating?.toFixed(1) || '0.0'}</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="font-bold text-gray-700">Status:</span>
            <button onClick={toggleAvailability} className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${data.profile.isAvailable ? 'bg-accent' : 'bg-gray-300'}`}>
              <span className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${data.profile.isAvailable ? 'translate-x-11' : 'translate-x-1'}`}/>
            </button>
            <span className={`font-bold ${data.profile.isAvailable ? 'text-accent' : 'text-gray-500'}`}>{data.profile.isAvailable ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3"><FiPackage size={24}/></div>
            <p className="text-3xl font-extrabold">{data.stats.totalDeliveries}</p>
            <p className="text-gray-500">Total Deliveries</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="p-3 bg-green-100 text-green-600 rounded-full mb-3"><FiDollarSign size={24}/></div>
            <p className="text-3xl font-extrabold text-green-600">₹{data.stats.earnings}</p>
            <p className="text-gray-500">Total Earnings</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-100 p-4 border-b"><h2 className="text-xl font-bold font-heading">Available Pickups</h2></div>
          <div className="p-6 space-y-4">
            {availableOrders.map(order => (
              <div key={order._id} className="border p-4 rounded-lg flex flex-col sm:flex-row shadow-sm">
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="font-bold text-lg mb-1">{order?.vendorId?.shopName || 'Shop'}</h3>
                  <div className="text-sm text-gray-800 font-bold mb-1">Customer: {order?.studentId?.name || 'Student'}</div>
                  <div className="flex items-start text-sm text-gray-600 mb-1"><FiMapPin className="mr-1 mt-1 text-primary"/> Pickup: {order?.vendorId?.location || 'Location'}</div>
                  <div className="flex items-start text-sm text-gray-600"><FiMapPin className="mr-1 mt-1 text-accent"/> Drop: {order?.deliveryAddress || 'Address'}</div>
                </div>
                <div className="flex flex-col justify-center items-end min-w-[120px]">
                  <div className="text-xl font-extrabold text-primary mb-2">₹{order.totalAmount}</div>
                  <button onClick={() => acceptOrder(order._id)} className="w-full bg-primary text-white py-2 px-4 rounded font-bold hover:bg-orange-600 transition shadow-sm">Accept</button>
                </div>
              </div>
            ))}
            {availableOrders.length === 0 && <div className="text-center text-gray-500 py-10">{data.profile.isAvailable ? "Searching for nearby orders..." : "Go ONLINE to view orders."}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DeliveryDashboard;
