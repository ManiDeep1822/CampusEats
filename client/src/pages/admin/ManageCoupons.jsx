import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, 
  FiTrash2, 
  FiPercent, 
  FiActivity, 
  FiCalendar, 
  FiTag, 
  FiX,
  FiMoreVertical,
  FiClock,
  FiShoppingBag
} from 'react-icons/fi';
import api from '../../services/api';

const ManageCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    expiryDate: '',
    usageLimit: ''
  });

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/admin/coupons');
      setCoupons(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch coupons', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggleStatus = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/admin/coupons/${id}/toggle`);
      fetchCoupons();
    } catch (error) {
      console.error('Failed to toggle status', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign forever?')) return;
    setProcessingId(id);
    try {
      await api.delete(`/admin/coupons/${id}`);
      fetchCoupons();
    } catch (error) {
      console.error('Failed to delete coupon', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/coupons', formData);
      setShowDrawer(false);
      fetchCoupons();
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderAmount: '',
        maxDiscountAmount: '',
        expiryDate: '',
        usageLimit: ''
      });
    } catch (error) {
      console.error('Failed to create coupon', error);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen bg-white">
      {/* Dense Header */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Promotions & Campaigns</h1>
          <p className="text-gray-500 text-xs md:text-sm mt-1">Manage discount logic and promo codes</p>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded hover:bg-black transition-colors text-sm font-semibold shadow-sm"
        >
          <FiPlus size={16} />
          Create Promo
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
           <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-800"></div>
           <p className="text-xs font-semibold text-gray-500">Loading campaign data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-5">
          <AnimatePresence>
            {(coupons || []).map((coupon) => (
              <motion.div
                key={coupon?._id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border rounded-lg p-4 transition-all ${
                  coupon?.isActive 
                  ? 'border-gray-200 bg-white shadow-sm hover:border-gray-300' 
                  : 'border-slate-100 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded text-slate-700">
                      <FiTag size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 font-mono text-sm tracking-tight">{coupon?.code || 'NO CODE'}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${coupon?.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{coupon?.isActive ? 'Active' : 'Paused'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Menu Bubble */}
                  <div className="flex items-center gap-1">
                     <button
                        onClick={() => handleToggleStatus(coupon?._id)}
                        disabled={processingId === coupon?._id}
                        className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${coupon?.isActive ? 'text-gray-500 hover:bg-gray-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                     >
                       {processingId === coupon?._id ? '...' : coupon?.isActive ? 'PAUSE' : 'ACTIVATE'}
                     </button>
                     <button
                        onClick={() => handleDelete(coupon?._id)}
                        disabled={processingId === coupon?._id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                     >
                        <FiTrash2 size={14} />
                     </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                   <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Discount</p>
                      <p className="text-sm font-bold text-gray-900 leading-tight mt-0.5">
                         {coupon?.discountValue || 0}{coupon?.discountType === 'percentage' ? '%' : '₹'}
                      </p>
                   </div>
                   <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Min Order</p>
                      <p className="text-sm font-semibold text-gray-700 leading-tight mt-0.5">₹{coupon?.minOrderAmount || 0}</p>
                   </div>
                   <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Usage</p>
                      <p className="text-sm font-semibold text-gray-700 leading-tight mt-0.5">
                        {coupon?.usedCount || 0} / {coupon?.usageLimit || '∞'}
                      </p>
                   </div>
                   <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Expiry</p>
                      <p className="text-sm font-semibold text-gray-700 leading-tight mt-0.5 whitespace-nowrap">
                        {coupon?.expiryDate ? new Date(coupon.expiryDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}) : 'No Expiry'}
                      </p>
                   </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {coupons.length === 0 && (
            <div className="col-span-full py-16 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-4">
              <FiTag size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-500">No active campaigns</p>
            </div>
          )}
        </div>
      )}

      {/* Swiggy/Zomato Partner Hub Style Slide-Over Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 transition-opacity"
            />
            
            {/* Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-100"
            >
              {/* Drawer Header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                 <div>
                    <h2 className="text-base font-bold text-gray-900">Create New Promo</h2>
                 </div>
                 <button 
                   onClick={() => setShowDrawer(false)} 
                   className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                 >
                   <FiX size={20} />
                 </button>
              </div>

              {/* Drawer Content / Form */}
              <div className="flex-1 overflow-y-auto bg-gray-50/50 p-5">
                <form id="coupon-form" onSubmit={handleSubmit} className="space-y-6">
                   {/* Section 1 */}
                   <div className="bg-white p-4 rounded-lg border border-gray-200/60 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2"><FiTag className="text-gray-400" /> Basic Details</h4>
                      
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Promo Code <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="e.g. FESTIVAL50"
                          className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded font-mono text-sm outline-none transition-colors uppercase placeholder:text-gray-300"
                          value={formData.code}
                          onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Type</label>
                            <div className="flex border border-gray-300 rounded p-0.5 bg-gray-50">
                               {['percentage', 'fixed'].map(type => (
                                 <button
                                   key={type}
                                   type="button"
                                   onClick={() => setFormData({...formData, discountType: type})}
                                   className={`flex-1 py-1.5 text-xs font-semibold rounded-sm transition-all ${
                                     formData.discountType === type 
                                     ? 'bg-white text-gray-900 shadow-sm border border-gray-200' 
                                     : 'text-gray-500 border border-transparent'
                                   }`}
                                 >
                                   {type === 'percentage' ? '%' : 'Flat'}
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Value <span className="text-red-500">*</span></label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">
                                 {formData.discountType === 'percentage' ? '%' : '₹'}
                              </span>
                              <input
                                type="number"
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded text-sm outline-none transition-colors"
                                value={formData.discountValue}
                                onChange={(e) => setFormData({...formData, discountValue: e.target.value})}
                                required
                              />
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Section 2 */}
                   <div className="bg-white p-4 rounded-lg border border-gray-200/60 shadow-sm space-y-4">
                      <h4 className="text-xs font-bold text-gray-800 mb-3 flex items-center gap-2"><FiShoppingBag className="text-gray-400" /> Restrictions</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Min Order</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded text-sm outline-none transition-colors"
                                value={formData.minOrderAmount}
                                onChange={(e) => setFormData({...formData, minOrderAmount: e.target.value})}
                              />
                            </div>
                         </div>
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Max Discount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-xs">₹</span>
                              <input
                                type="number"
                                placeholder="No Cap"
                                disabled={formData.discountType === 'fixed'}
                                className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded text-sm outline-none transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                                value={formData.maxDiscountAmount}
                                onChange={(e) => setFormData({...formData, maxDiscountAmount: e.target.value})}
                              />
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Total Limit</label>
                            <input
                              type="number"
                              placeholder="0 = Unlimited"
                              className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded text-sm outline-none transition-colors"
                              value={formData.usageLimit}
                              onChange={(e) => setFormData({...formData, usageLimit: e.target.value})}
                            />
                         </div>
                         <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1.5 uppercase">Expiry</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 bg-white border border-gray-300 focus:border-slate-800 rounded text-sm outline-none transition-colors"
                              value={formData.expiryDate}
                              onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                            />
                         </div>
                      </div>
                   </div>
                </form>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                 <button 
                   type="submit"
                   form="coupon-form"
                   disabled={!formData.code || !formData.discountValue}
                   className="w-full py-3 bg-slate-900 text-white font-semibold rounded hover:bg-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-sm text-sm"
                 >
                   Launch Promo Code
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageCoupons;
