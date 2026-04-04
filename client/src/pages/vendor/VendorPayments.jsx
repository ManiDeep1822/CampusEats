import { useState, useEffect } from 'react';
import { FiCalendar, FiCheckCircle, FiPackage, FiSearch } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';

const VendorPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = async () => {
    try {
      const { data } = await api.get('/vendor/payments');
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

  const totalEarnings = payments.reduce((acc, order) => acc + order.totalAmount, 0);
  
  const filteredPayments = payments.filter(p => {
    const search = searchTerm.toLowerCase().replace('#', '');
    const orderIdStr = String(p.orderId || '').toLowerCase();
    const studentName = (p.studentId?.name || '').toLowerCase();
    const mongoId = String(p._id || '').toLowerCase();
    
    return orderIdStr.includes(search) || 
           studentName.includes(search) || 
           mongoId.includes(search);
  });

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 font-heading">Payment History</h1>
            <p className="text-gray-500 mt-1">Track your earnings and transaction details</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-primary rounded-xl flex items-center justify-center">
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
            placeholder="Search by Order ID or Student Name..." 
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
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Order Details</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Amount</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPayments.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
                          <FiPackage size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase">#{order.orderId}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{order.items.length} items</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-500">
                        <FiCalendar size={14} />
                        <span className="text-sm font-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <p className="text-sm font-bold text-gray-700">{order.studentId?.name || 'Customer'}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-base font-black text-gray-900">₹{order.totalAmount}</p>
                    </td>
                    <td className="px-6 py-5">
                      {order.paymentId?.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-black uppercase tracking-tight">
                          <FiCheckCircle size={12} /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-black uppercase tracking-tight">
                           Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredPayments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center">
                      <div className="opacity-20 mb-4">
                        <FaRupeeSign size={48} className="mx-auto" />
                      </div>
                      <p className="text-gray-400 font-bold">No payment records found.</p>
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

export default VendorPayments;
