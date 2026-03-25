import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiShoppingBag, FiStar, FiClock } from 'react-icons/fi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      setData(res.data);
    } catch (error) { toast.error('Failed to load dashboard'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const toggleStatus = async () => {
    try {
      const res = await api.put('/vendor/toggle-status');
      setData({ ...data, shopDetails: { ...data.shopDetails, isOpen: res.data.isOpen } });
      toast.success(res.data.isOpen ? 'Shop is now OPEN' : 'Shop is now CLOSED');
    } catch (error) { toast.error('Failed to toggle status'); }
  };

  if (loading) return <Loader />;
  if (!data || !data.stats) return <div className="text-center py-20 text-red-500 font-bold">Error loading dashboard. Please refresh.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">{data.shopDetails.shopName}</h1>
            <p className="text-textSecondary text-sm">{data.shopDetails.location}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-700">Status:</span>
              <button onClick={toggleStatus} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${data.shopDetails.isOpen ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${data.shopDetails.isOpen ? 'translate-x-9' : 'translate-x-1'}`}/>
              </button>
              <span className={`font-bold ${data.shopDetails.isOpen ? 'text-accent' : 'text-gray-500'}`}>{data.shopDetails.isOpen ? 'OPEN' : 'CLOSED'}</span>
            </div>
            <Link to="/vendor/orders" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition">View Orders</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Today's Revenue</h3>
              <div className="p-2 bg-orange-100 text-primary rounded-lg"><FiTrendingUp size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">₹{data.stats.revenue}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Today's Orders</h3>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FiShoppingBag size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.todaysOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Pending Orders</h3>
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><FiClock size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.pendingOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Rating</h3>
              <div className="p-2 bg-green-100 text-accent rounded-lg"><FiStar size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.rating?.toFixed(1) || '0.0'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold font-heading mb-6">Weekly Sales Performance</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Items Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-heading">Top Selling Items</h2>
              <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded">All Time</span>
            </div>
            
            <div className="space-y-4">
              {data.popularItems?.length === 0 && (
                 <p className="text-sm text-gray-400 text-center py-10 border-2 border-dashed border-gray-100 rounded-lg">No delivered sales data yet.</p>
              )}
              {data.popularItems?.map((item, idx) => (
                <div key={item._id} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition cursor-pointer border border-transparent hover:border-orange-100">
                  <div className="text-xl font-extrabold text-orange-300 w-6">#{idx + 1}</div>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🍲</div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1">{item.name}</h4>
                    <p className="text-xs font-medium text-gray-500">{item.totalSold} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-green-600 text-sm">₹{item.revenue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h2 className="text-xl font-bold font-heading mb-4">Quick Actions</h2>
           <div className="flex flex-wrap gap-3">
             <Link to="/vendor/menu" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary hover:text-primary transition text-sm">Manage Menu</Link>
             <Link to="/vendor/orders" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary hover:text-primary transition text-sm">Live Orders Queue</Link>
             <Link to="/vendor/kds" className="px-5 py-3 border border-transparent bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition shadow-lg text-sm">🔥 Kitchen Display (KDS)</Link>
           </div>
        </div>
      </div>
    </div>
  );
};
export default VendorDashboard;
