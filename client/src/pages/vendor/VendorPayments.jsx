import { useState, useEffect, useCallback } from 'react';
import { FiCalendar, FiCheckCircle, FiPackage, FiSearch, FiDownload, FiClock, FiFileText } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { downloadCSV } from '../../utils/exportUtils';
import { motion, AnimatePresence } from 'framer-motion';

const VendorPayments = () => {
  const [data, setData] = useState({ unsettledOrders: [], payoutHistory: [], settledOrders: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('unsettled');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPayments = useCallback(async () => {
    try {
      const res = await api.get('/vendor/payments');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const pendingPayout = data.unsettledOrders.reduce((acc, order) => acc + (order.vendorEarnings || 0), 0);
  
  const handleExport = (type) => {
    let exportItems = [];
    let fileName = "";
    
    if (type === 'earnings') {
      exportItems = data.unsettledOrders;
      fileName = "Unsettled_Earnings";
    } else if (type === 'archive') {
      exportItems = data.settledOrders;
      fileName = "Settled_Orders_Archive";
    } else {
        exportItems = data.payoutHistory;
        fileName = "Payout_History";
    }

    if (!exportItems.length) {
      toast.error('No data found to export');
      return;
    }

    if (type === 'history') {
        downloadCSV(exportItems, fileName, [
            { label: 'Reference ID', key: 'settlementId' },
            { label: 'Amount (₹)', key: 'amount' },
            { label: 'Date', key: 'createdAt' },
            { label: 'Order IDs', key: 'orderIds' }
        ]);
    } else {
        downloadCSV(exportItems, fileName, [
            { label: 'Order ID', key: 'orderId' },
            { label: 'Student', key: 'studentId.name' },
            { label: 'Order Date', key: 'deliveredAt' },
            { label: 'Total Amount (₹)', key: 'totalAmount' },
            { label: 'My Earning (₹)', key: 'vendorEarnings' },
            { label: 'Status', key: 'isSettled' }
        ]);
    }
    
    toast.success('Report downloaded! 📈');
  };

  const getFilteredData = () => {
    const source = activeTab === 'unsettled' ? data.unsettledOrders : data.settledOrders;
    return source.filter(p => {
      const search = searchTerm.toLowerCase();
      return String(p.orderId).toLowerCase().includes(search) || 
             (p.studentId?.name || '').toLowerCase().includes(search);
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 pt-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-3xl font-extrabold text-gray-900 font-heading">Financial Audit</h1>
            <p className="text-gray-500 mt-1">Real-time visibility into your earnings and settlements</p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-orange-100 text-primary rounded-xl flex items-center justify-center">
              <FaRupeeSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payout</p>
              <p className="text-2xl font-black text-emerald-600 leading-none mt-1">₹{pendingPayout.toLocaleString()}</p>
            </div>
          </motion.div>
        </div>

        {/* Tab Selection & Search */}
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex bg-gray-50 p-1.5 rounded-xl self-start">
             {[
               { id: 'unsettled', label: 'Pending Settlement' },
               { id: 'history', label: 'Payout History' },
               { id: 'settled', label: 'Archive' }
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id)}
                 className={`px-4 md:px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                   activeTab === tab.id 
                   ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
                   : 'text-gray-500 hover:text-gray-700'
                 }`}
               >
                 {tab.label}
               </button>
             ))}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1 min-w-[280px] flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl border border-gray-100 focus-within:border-primary/50 transition self-stretch">
              <FiSearch className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Search orders..." 
                className="w-full bg-transparent border-none outline-none focus:ring-0 text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={() => handleExport(activeTab === 'unsettled' ? 'earnings' : activeTab === 'history' ? 'history' : 'archive')}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition active:scale-95 text-xs shadow-lg shadow-black/10"
            >
              <FiDownload /> Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
          <AnimatePresence mode="wait">
            {activeTab === 'history' ? (
              <motion.div 
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6"
              >
                 <div className="space-y-4">
                    {data.payoutHistory?.length === 0 ? (
                      <div className="text-center py-20">
                        <FiFileText size={48} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-gray-400 font-bold">No payout history yet.</p>
                        <p className="text-xs text-gray-300 mt-1">Settlements appear here once processed by Admin.</p>
                      </div>
                    ) : (
                      data.payoutHistory.map((payout) => (
                        <div key={payout._id} className="p-5 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition group">
                           <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-white text-emerald-500 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                <FiCheckCircle size={24} />
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">REF: {payout.settlementId}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(payout.createdAt).toLocaleDateString()}</span>
                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{payout.orderIds.length} Orders bundled</span>
                                </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-xl font-black text-emerald-600 leading-none">₹{payout.amount?.toLocaleString()}</p>
                              <span className="inline-block mt-2 text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Received</span>
                           </div>
                        </div>
                      ))
                    )}
                 </div>
              </motion.div>
            ) : (
              <motion.div 
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="overflow-x-auto"
              >
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-5">Order Reference</th>
                      <th className="px-6 py-5 text-center">Batch Size</th>
                      <th className="px-6 py-5">Client Name</th>
                      <th className="px-6 py-5 text-right whitespace-nowrap">Net Payout Due</th>
                      <th className="px-6 py-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {getFilteredData().length === 0 ? (
                      <tr><td colSpan="5" className="px-6 py-32 text-center text-gray-300 font-black uppercase tracking-tighter text-xl italic opacity-50">Empty Audit Log</td></tr>
                    ) : (
                      getFilteredData().map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50/50 transition-colors group border-transparent hover:border-orange-50/50">
                          <td className="px-6 py-6 transition-all">
                            <p className="text-sm font-black text-gray-900 uppercase">#{order.orderId}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 font-mono">{new Date(order.deliveredAt).toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl uppercase tracking-tighter">{order.items?.length || 0} ITEMS</span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-sm font-bold text-gray-700 group-hover:text-primary transition-colors">{order.studentId?.name || 'Authorized Student'}</p>
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1 block">Student Hub</span>
                          </td>
                          <td className="px-6 py-6 text-right whitespace-nowrap">
                            <p className="text-base font-black text-emerald-600 leading-none">₹{(order.vendorEarnings || 0).toLocaleString()}</p>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mt-1.5">Gross Total: ₹{order.totalAmount}</p>
                          </td>
                          <td className="px-6 py-6">
                             <div className="flex justify-center">
                               {activeTab === 'unsettled' ? (
                                  <span className="text-[9px] font-black uppercase text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl ring-1 ring-orange-200/50 flex items-center gap-1.5"><FiClock size={12} /> Pending</span>
                               ) : (
                                  <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-50 px-3 py-1.5 rounded-xl ring-1 ring-emerald-200/50 flex items-center gap-1.5"><FiCheckCircle size={12} /> Settled</span>
                               )}
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default VendorPayments;
