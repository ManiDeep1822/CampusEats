import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiShoppingBag, 
  FiTruck,
  FiTrendingUp,
  FiActivity,
  FiMessageSquare,
  FiTag
} from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, payoutsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/payouts')
      ]);
      setStats(statsRes.data);
      setPayouts(payoutsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (type, id) => {
    if (!window.confirm(`Are you sure you have paid this ${type} and want to settle the balance?`)) return;
    
    const settleToast = toast.loading('Recording settlement...');
    try {
      await api.post('/admin/payouts/settle', { type, id });
      toast.success('Payout settled and balance reset!', { id: settleToast });
      fetchData(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to settle payout', { id: settleToast });
    }
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) return null;

  const totalRevenue = (stats?.revenueData || []).reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalOrders7Days = (stats?.revenueData || []).reduce((acc, curr) => acc + (curr.orders || 0), 0);
  const weeklyCommission = Number((totalRevenue * 0.05).toFixed(2));

  const pieData = [
    { name: 'Students', value: stats?.totalStudents || 0, color: '#3B82F6' },
    { name: 'Vendors', value: stats?.totalVendors || 0, color: '#F97316' },
    { name: 'Delivery', value: stats?.totalDelivery || 0, color: '#10B981' }
  ].filter(d => d.value > 0);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <FiActivity className="text-primary" />
                Command Center
              </h1>
              <p className="text-gray-500 mt-2">Platform overview and real-time statistics</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/admin/users" className="bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95">
                <FiUsers /> Manage Users
              </Link>
              <Link to="/admin/vendors" className="bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition flex items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95">
                <FiShoppingBag /> Manage Vendors
              </Link>
              <Link to="/admin/riders" className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95">
                <FiTruck /> Manage Riders
              </Link>
              <Link to="/admin/coupons" className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-amber-600 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 text-sm">
                <FiTag /> Manage Coupons
              </Link>
              <Link to="/admin/feedback" className="bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-600 transition flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 text-sm">
                <FiMessageSquare /> Manage Feedback
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatCard 
            title="Lifetime Volume" 
            value={`₹${(stats?.lifetimeTurnover || 0).toLocaleString()}`} 
            subtitle="Gross Platform Processing"
            icon={<FaRupeeSign size={24} />} 
            color="bg-blue-500 text-white" 
            lightColor="bg-blue-50"
          />
          <StatCard 
            title="Platform Earnings" 
            value={`₹${(stats?.lifetimeCommission || 0).toLocaleString()}`} 
            subtitle="5% Lifetime Commission"
            icon={<FiActivity size={24} />} 
            color="bg-emerald-500 text-white" 
            lightColor="bg-emerald-50"
          />
          <StatCard 
            title="Weekly Revenue" 
            value={`₹${(totalRevenue || 0).toLocaleString()}`} 
            subtitle={`+ ₹${weeklyCommission} Tax`}
            icon={<FiTrendingUp size={24} />} 
            color="bg-orange-500 text-white" 
            lightColor="bg-orange-50"
          />
          <StatCard 
            title="Total Users" 
            value={(stats?.totalUsers || 0).toLocaleString()} 
            subtitle="Active accounts"
            icon={<FiUsers size={24} />} 
            color="bg-purple-500 text-white" 
            lightColor="bg-purple-50"
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart */}
          <motion.div 
            variants={itemVariants}
            className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <FiTrendingUp className="text-primary" />
              7-Day Revenue Trends
            </h2>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dx={-10} tickFormatter={(value) => `₹${value}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value) => [`₹${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* User Demographics */}
          <motion.div 
            variants={itemVariants}
            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <FiUsers className="text-blue-500" />
              Platform Demographics
            </h2>
            <p className="text-sm text-gray-500 mb-6">Breakdown of registered roles</p>
            <div className="flex-1 flex justify-center items-center h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value) => [value, 'Users']}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Weekly Payouts Section */}
        <div className="mt-10 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Settlement Command Center</h2>
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-xs font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest">Pending Payouts</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vendor Payouts */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FiShoppingBag className="text-orange-500" />
                  Vendors
                </h2>
                <span className="text-xs font-bold text-gray-400">Net unpaid balance</span>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {payouts?.vendorPayouts?.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 font-medium">All vendors are settled. Great job! ✅</p>
                ) : (
                  payouts?.vendorPayouts?.map((vendor, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white text-orange-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                            {vendor.shopName?.[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-none">{vendor.shopName}</h4>
                            <p className="text-xs text-gray-500 mt-1">{vendor.name} • {vendor.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-green-600 leading-none">₹{vendor.pendingPayout?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Pending Transfer</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        {vendor.paymentDetails?.upiId ? (
                           <button 
                             onClick={() => { navigator.clipboard.writeText(vendor.paymentDetails.upiId); toast.success('UPI ID Copied!'); }}
                             className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition active:scale-95"
                           >
                             <FiTrendingUp className="text-primary" /> {vendor.paymentDetails.upiId}
                           </button>
                        ) : (
                          <span className="text-[10px] text-red-400 font-bold uppercase italic">Missing UPI/Bank Info</span>
                        )}
                        <button 
                          onClick={() => handleSettle('vendor', vendor._id)}
                          className="ml-auto text-xs font-black bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition active:scale-95 shadow-lg shadow-orange-500/20"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Rider Payouts */}
            <motion.div 
              variants={itemVariants}
              className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FiTruck className="text-emerald-500" />
                  Riders
                </h2>
                <span className="text-xs font-bold text-gray-400">Pending delivery commissions</span>
              </div>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {payouts?.riderPayouts?.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 font-medium">All riders are settled. Excellent work! ✅</p>
                ) : (
                  payouts?.riderPayouts?.map((rider, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all group">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white text-emerald-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                            {rider.name?.[0]}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-none">{rider.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{rider.vehicleType} • {rider.phone}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-green-600 leading-none">₹{rider.pendingPayout?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-400 font-black uppercase mt-1">Pending Transfer</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                        {rider.paymentDetails?.upiId ? (
                           <button 
                             onClick={() => { navigator.clipboard.writeText(rider.paymentDetails.upiId); toast.success('UPI ID Copied!'); }}
                             className="text-xs font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition active:scale-95"
                           >
                             <FiTrendingUp className="text-primary" /> {rider.paymentDetails.upiId}
                           </button>
                        ) : (
                          <span className="text-[10px] text-red-400 font-bold uppercase italic">Missing UPI/Bank Info</span>
                        )}
                        <button 
                          onClick={() => handleSettle('rider', rider._id)}
                          className="ml-auto text-xs font-black bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition active:scale-95 shadow-lg shadow-emerald-500/20"
                        >
                          Mark as Paid
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        </div>

      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon, color, lightColor }) => (
  <motion.div 
    variants={{
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 }
    }}
    className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden group"
  >
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ${lightColor}`}></div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${color} relative z-10`}>
      {icon}
    </div>
    <div className="relative z-10">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</h3>
      <p className="text-xs text-gray-400 font-medium">{subtitle}</p>
    </div>
  </motion.div>
);

export default AdminDashboard;
