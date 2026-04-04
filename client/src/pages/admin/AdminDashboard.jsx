import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUsers, 
  FiShoppingBag, 
  FiTruck,
  FiTrendingUp,
  FiActivity,
  FiMessageSquare,
  FiTag,
  FiClock,
  FiFileText,
  FiDownload,
  FiCheckCircle,
  FiX,
  FiEye
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
import { downloadCSV } from '../../utils/exportUtils';
import Loader from '../../components/shared/Loader';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [payouts, setPayouts] = useState({ vendorPayouts: [], riderPayouts: [], settlementHistory: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBreakdown, setSelectedBreakdown] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(false);

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
      setPayouts(payoutsRes.data || { vendorPayouts: [], riderPayouts: [], settlementHistory: [] });
    } catch (error) {
      toast.error('Failed to load dashboard data');
      console.error('ADMIN DASHBOARD DATA ERROR:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (type, id) => {
    if (!window.confirm(`Settle all pending orders for this ${type}? This will generate a permanent payout record.`)) return;
    
    const settleToast = toast.loading('Recording settlement...');
    try {
      await api.post('/admin/payouts/settle', { type, id });
      toast.success('Funds settled successfully!', { id: settleToast });
      setSelectedBreakdown(null);
      fetchData(); // Refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to settle payout', { id: settleToast });
    }
  };

  const handleExportWeeklyExpenditure = () => {
    const vPayouts = payouts?.vendorPayouts || [];
    const rPayouts = payouts?.riderPayouts || [];
    const exportData = [];
    
    vPayouts.forEach(v => {
      (v.unsettledOrders || []).forEach(o => {
        exportData.push({
          type: 'Vendor',
          name: v.shopName,
          orderId: o.orderId,
          totalAmount: o.totalAmount,
          netEarning: o.vendorEarnings,
          deliveredAt: new Date(o.deliveredAt).toLocaleString(),
          status: 'Pending Settlement'
        });
      });
    });

    rPayouts.forEach(r => {
      (r.unsettledOrders || []).forEach(o => {
        exportData.push({
          type: 'Rider',
          name: r.name,
          orderId: o.orderId,
          totalAmount: o.totalAmount,
          netEarning: o.deliveryEarnings,
          deliveredAt: new Date(o.deliveredAt).toLocaleString(),
          status: 'Pending Settlement'
        });
      });
    });

    if (exportData.length === 0) {
      toast.error('No pending expenditure found to export');
      return;
    }

    downloadCSV(exportData, "Platform_Expenditure_Report", [
      { label: 'Recipient Type', key: 'type' },
      { label: 'Name', key: 'name' },
      { label: 'Order ID', key: 'orderId' },
      { label: 'Gross Amount (₹)', key: 'totalAmount' },
      { label: 'Net Payout (₹)', key: 'netEarning' },
      { label: 'Delivered At', key: 'deliveredAt' }
    ]);
    
    toast.success('Audit Report generated! 📊');
  };

  if (loading || !stats) return <Loader />;

  const totalRevenue = (stats?.revenueData || []).reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const weeklyCommission = Number((totalRevenue * 0.05).toFixed(2));

  const pieData = [
    { name: 'Students', value: stats?.totalStudents || 0, color: '#3B82F6' },
    { name: 'Vendors', value: stats?.totalVendors || 0, color: '#F97316' },
    { name: 'Delivery', value: stats?.totalDelivery || 0, color: '#10B981' }
  ].filter(d => d.value > 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* HEADER BLOCK */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
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

        {/* TOP STATS */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <StatCard title="Lifetime Volume" value={`₹${(stats?.lifetimeTurnover || 0).toLocaleString()}`} subtitle="Gross Processing" icon={<FaRupeeSign size={24}/>} color="bg-blue-500 text-white" lightColor="bg-blue-50" />
           <StatCard title="Platform Earnings" value={`₹${(stats?.lifetimeCommission || 0).toLocaleString()}`} subtitle="5% Commission" icon={<FiActivity size={24}/>} color="bg-emerald-500 text-white" lightColor="bg-emerald-50" />
           <StatCard title="Weekly Revenue" value={`₹${(totalRevenue || 0).toLocaleString()}`} subtitle={`+ ₹${weeklyCommission} Service Fee`} icon={<FiTrendingUp size={24}/>} color="bg-orange-500 text-white" lightColor="bg-orange-50" />
           <StatCard title="Total Users" value={(stats?.totalUsers || 0).toLocaleString()} subtitle="Active accounts" icon={<FiUsers size={24}/>} color="bg-purple-500 text-white" lightColor="bg-purple-50" />
        </motion.div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 min-h-[380px] flex flex-col">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FiTrendingUp className="text-primary" /> 7-Day Revenue Trends</h2>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.revenueData || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col min-h-[380px]">
            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2"><FiUsers className="text-blue-500" /> Demographics</h2>
            <div className="flex-1 w-full min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                    {pieData.map((e, index) => <Cell key={`idx-${index}`} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* SETTLEMENT CENTER */}
        <div className="mt-10 mb-8 pt-10 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Settlement <span className="text-orange-500">Center</span></h2>
            <div className="h-px flex-1 bg-gray-200 hidden sm:block"></div>
            <div className="flex flex-wrap items-center gap-3">
              <button 
                onClick={() => setViewingHistory(!viewingHistory)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-xs border ${
                  viewingHistory ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                }`}
              >
                {viewingHistory ? 'View Pending Batches' : 'View Settlement History'}
              </button>
              {!viewingHistory && (
                <button onClick={handleExportWeeklyExpenditure} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all text-xs active:scale-95 shadow-sm">
                  <FiDownload /> Export Weekly Report
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!viewingHistory ? (
              <motion.div key="pending" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6"><FiShoppingBag className="text-orange-500" /> Vendors</h3>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                     {payouts.vendorPayouts.length === 0 ? (
                       <div className="text-center py-12 flex flex-col items-center">
                         <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2"><FiCheckCircle className="text-emerald-400" size={24} /></div>
                         <p className="text-gray-400 font-bold text-sm">Platform Audit Clear ✅</p>
                       </div>
                     ) : (
                       payouts.vendorPayouts.map((vendor) => (
                         <div key={vendor._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-orange-200 transition-all group">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white text-orange-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">{vendor.shopName?.[0]}</div>
                                  <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{vendor.shopName}</h4>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{vendor.unsettledOrders?.length} Pending Orders</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-lg font-black text-emerald-600 leading-none">₹{vendor.pendingPayout?.toLocaleString()}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                               <button onClick={() => setSelectedBreakdown({ ...vendor, type: 'vendor' })} className="text-[10px] font-black uppercase text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100">View Breakdown</button>
                               <button onClick={() => handleSettle('vendor', vendor._id)} className="ml-auto text-xs font-black bg-orange-500 text-white px-4 py-1.5 rounded-lg hover:bg-orange-600 transition shadow-lg active:scale-95">Settle Batch</button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 mb-6"><FiTruck className="text-emerald-500" /> Riders</h3>
                   <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                     {payouts.riderPayouts.length === 0 ? (
                       <div className="text-center py-12 flex flex-col items-center">
                         <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2"><FiCheckCircle className="text-emerald-400" size={24} /></div>
                         <p className="text-gray-400 font-bold text-sm">Delivery Audit Clear ✅</p>
                       </div>
                     ) : (
                       payouts.riderPayouts.map((rider) => (
                         <div key={rider._id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all group">
                            <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white text-emerald-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">{rider.name?.[0]}</div>
                                  <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{rider.name}</h4>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{rider.unsettledOrders?.length} Deliveries</p>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-lg font-black text-emerald-600 leading-none">₹{rider.pendingPayout?.toLocaleString()}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                               <button onClick={() => setSelectedBreakdown({ ...rider, type: 'rider' })} className="text-[10px] font-black uppercase text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100">View Breakdown</button>
                               <button onClick={() => handleSettle('rider', rider._id)} className="ml-auto text-xs font-black bg-emerald-500 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-600 transition shadow-lg active:scale-95">Settle Batch</button>
                            </div>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference ID</th><th className="px-4 py-3">Recipient</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Orders</th><th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {payouts.settlementHistory.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-20 text-center text-gray-400 font-black uppercase opacity-50">No historical records.</td></tr>
                      ) : (
                        payouts.settlementHistory.map((log) => (
                          <tr key={log._id}>
                            <td className="px-4 py-4 text-xs text-gray-500">{new Date(log.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-4 text-xs font-black text-gray-700 uppercase">{log.settlementId}</td>
                            <td className="px-4 py-4">
                              <span className="text-sm font-bold text-gray-700">{log.actorId?.shopName || log.actorId?.name || '---'}</span>
                              <span className="ml-2 text-[8px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-black uppercase">{log.actorType}</span>
                            </td>
                            <td className="px-4 py-4 text-sm font-black text-emerald-600 font-mono">₹{log.amount}</td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-500">{log.orderIds?.length} Items</td>
                            <td className="px-4 py-4"><span className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-full w-max"><FiCheckCircle /> Settled</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedBreakdown && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedBreakdown(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden">
               <div className="px-8 py-6 border-b flex justify-between items-center bg-gray-50">
                  <div><h3 className="text-2xl font-black text-gray-900">{selectedBreakdown.shopName || selectedBreakdown.name}</h3><p className="text-sm text-gray-500 mt-1">Found {selectedBreakdown.unsettledOrders?.length} pending orders</p></div>
                  <button onClick={() => setSelectedBreakdown(null)} className="p-2 hover:bg-white rounded-full transition"><FiX size={24} /></button>
               </div>
               <div className="max-h-[50vh] overflow-y-auto px-8 py-6 space-y-4">
                  {selectedBreakdown.unsettledOrders?.map((order) => (
                    <div key={order._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black text-gray-400 border border-gray-100">#</div>
                          <div><p className="text-xs font-black text-gray-800">Order ID: {order.orderId}</p><p className="text-[10px] text-gray-400 font-bold">{new Date(order.deliveredAt).toLocaleString()}</p></div>
                       </div>
                       <div className="text-right"><p className="text-sm font-black text-slate-800 font-mono">₹{selectedBreakdown.type === 'vendor' ? order.vendorEarnings : order.deliveryEarnings}</p></div>
                    </div>
                  ))}
               </div>
               <div className="px-8 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="max-sm:text-center"><p className="text-sm text-gray-400 font-black uppercase tracking-tighter">Total Batch Value</p><p className="text-3xl font-black text-emerald-600">₹{selectedBreakdown.pendingPayout?.toLocaleString()}</p></div>
                  <div className="flex gap-3 w-full sm:w-auto">
                      <button onClick={() => {
                        const content = selectedBreakdown.unsettledOrders.map(o => `Order #${o.orderId} - ₹${selectedBreakdown.type === 'vendor' ? o.vendorEarnings : o.deliveryEarnings}`).join('\n');
                        const blob = new Blob([`Breakdown: ${selectedBreakdown.shopName || selectedBreakdown.name}\nTotal: ₹${selectedBreakdown.pendingPayout}\n\n${content}`], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'payout_breakdown.txt'; a.click();
                      }} className="flex items-center gap-2 text-xs font-black bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition"><FiDownload /> TXT</button>
                      <button onClick={() => handleSettle(selectedBreakdown.type, selectedBreakdown._id)} className="flex-1 sm:flex-none bg-orange-500 text-white px-8 py-3 rounded-xl font-black shadow-lg hover:bg-orange-600 transition active:scale-95">Settle Now</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon, color, lightColor }) => (
  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500 ${lightColor}`}></div>
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${color} relative z-10 shrink-0 text-white`}>
      {icon}
    </div>
    <div className="relative z-10 min-w-0">
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-gray-900 leading-none mb-1 truncate">{value}</h3>
      <p className="text-xs text-gray-400 font-medium truncate">{subtitle}</p>
    </div>
  </motion.div>
);

export default AdminDashboard;
