import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiShoppingBag, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiFilter, 
  FiSearch, 
  FiArrowLeft,
  FiTruck,
  FiUser
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchOrders();
  }, [pagination.page]);

  const fetchOrders = async () => {
    try {
      const { data } = await api.get(`/admin/orders?pageNumber=${pagination.page}`);
      setOrders(data.orders);
      setPagination({ page: data.page, pages: data.pages, total: data.total });
    } catch (error) {
      toast.error('Failed to load platform orders');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    pending_payment: 'bg-gray-100 text-gray-500',
    placed: 'bg-blue-100 text-blue-600',
    confirmed: 'bg-indigo-100 text-indigo-600',
    preparing: 'bg-amber-100 text-amber-600',
    ready: 'bg-purple-100 text-purple-600',
    picked_up: 'bg-emerald-100 text-emerald-600',
    delivered: 'bg-green-100 text-green-600',
    cancelled: 'bg-rose-100 text-rose-600'
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         order.vendorId?.shopName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <FiShoppingBag className="text-primary" />
                Global Order Management
              </h1>
              <p className="text-gray-500 mt-2">Monitor all platform transactions and delivery statuses.</p>
            </div>
            <Link to="/admin/dashboard" className="text-gray-500 hover:text-primary font-bold flex items-center gap-2 transition-colors bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md w-fit active:scale-95">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </motion.div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Shop..." 
              className="w-full bg-white border border-gray-100 rounded-2xl py-3.5 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 shadow-sm overflow-hidden">
            <FiFilter className="text-gray-400" />
            <select 
              className="w-full py-3.5 outline-none bg-transparent text-sm font-bold text-gray-700"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="picked_up">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl px-6 py-3.5 shadow-sm text-center">
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block mb-0.5">Total Tracked Entries</span>
            <span className="text-xl font-black text-gray-800">{pagination.total} Orders</span>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Order Details</th>
                  <th className="px-6 py-4 text-center">Volume</th>
                  <th className="px-6 py-4">Participants</th>
                  <th className="px-6 py-4 text-right">Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-gray-400 font-medium italic">
                       No orders matching your criteria...
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      key={order._id} 
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm ${statusColors[order.status]}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-black text-gray-800">#{order.orderId}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{order.orderType === 'delivery' ? '🚚 Delivery' : '🥡 Takeaway'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <p className="text-base font-black text-emerald-600 font-mono">₹{order.totalAmount}</p>
                         <p className="text-[10px] text-gray-400 font-bold uppercase">{order.items.length} Items</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center text-[10px] text-orange-600"><FiShoppingBag /></div>
                             <span className="text-xs font-bold text-gray-700">{order.vendorId?.shopName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center text-[10px] text-blue-600"><FiUser /></div>
                             <span className="text-xs text-gray-500 font-medium">{order.studentId?.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-[10px] font-black uppercase text-gray-400 leading-none mb-1">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs font-bold text-gray-600">
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}
                        </p>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-6 py-6 border-t border-gray-100 flex items-center justify-center gap-2 bg-gray-50/30">
               {[...Array(pagination.pages).keys()].map(x => (
                 <button
                   key={x + 1}
                   onClick={() => setPagination(prev => ({ ...prev, page: x + 1 }))}
                   className={`w-10 h-10 rounded-xl font-bold transition-all shadow-sm ${
                     pagination.page === x + 1 ? 'bg-primary text-white scale-110 shadow-primary/30' : 'bg-white text-gray-500 hover:text-primary hover:bg-orange-50'
                   }`}
                 >
                   {x + 1}
                 </button>
               ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageOrders;
