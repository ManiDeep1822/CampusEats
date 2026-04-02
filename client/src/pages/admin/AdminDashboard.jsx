import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiShoppingBag, 
  FiDollarSign, 
  FiTruck,
  FiTrendingUp,
  FiActivity,
  FiMessageSquare,
  FiTag
} from 'react-icons/fi';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard statistics');
      console.error(error);
    } finally {
      setLoading(false);
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
              <Link to="/admin/feedback" className="bg-purple-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-purple-600 transition flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 text-sm">
                <FiMessageSquare /> Manage Feedback
              </Link>
              <Link to="/admin/coupons" className="bg-rose-500 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-rose-600 transition flex items-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 text-sm">
                <FiTag /> Manage Coupons
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
            icon={<FiDollarSign size={24} />} 
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
