import { useState, useEffect } from 'react';
import { FiCalendar, FiCheckCircle, FiTruck, FiSearch, FiMapPin } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';

const RiderPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = async () => {
    try {
      const { data } = await api.get('/delivery/payments');
      setPayments(data);
    } catch (error) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalEarnings = payments.reduce((acc, order) => acc + (order.deliveryFee || 15), 0);
  
  const filteredPayments = payments.filter(p => {
    const search = searchTerm.toLowerCase().replace('#', '');
    const orderIdStr = String(p.orderId || '').toLowerCase();
    const shopName = (p.vendorId?.shopName || '').toLowerCase();
    const mongoId = String(p._id || '').toLowerCase();
    
    return orderIdStr.includes(search) || 
           shopName.includes(search) || 
           mongoId.includes(search);
  });

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 font-heading">Earning History</h1>
            <p className="text-gray-500 mt-1">Track your delivery tips and service fees</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <FaRupeeSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Earnings</p>
              <p className="text-2xl font-black text-gray-900">₹{totalEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
          <FiSearch className="text-gray-400 ml-2" />
          <input 
            type="text" 
            placeholder="Search by Order ID or Restaurant..." 
            className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Details</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Restaurant</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Fee Earned</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                          <FiTruck size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase">#{order.orderId}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Delivered</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar size={14} />
                        <span className="text-sm font-medium">{new Date(order.deliveredAt || order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <FiMapPin className="text-gray-400" size={14} />
                        <p className="text-sm font-bold text-gray-700">{order.vendorId?.shopName || 'Campus Spot'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-lg font-black text-emerald-600">₹{order.deliveryFee || 15}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-tight">
                        <FiCheckCircle size={12} /> Earned
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="opacity-20 mb-4">
                        <FaRupeeSign size={48} className="mx-auto" />
                      </div>
                      <p className="text-gray-400 font-bold">No earning records found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderPayments;
