import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiCheckCircle, FiXCircle, FiStar, FiArrowLeft, FiUserPlus, FiEye, FiEyeOff, FiTrash2, FiExternalLink } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', shopName: '', location: '', upiId: '', role: 'vendor' });
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data } = await api.get('/admin/vendors');
      setVendors(data);
    } catch (error) {
      toast.error('Failed to load vendors');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus, isVerified, email) => {
    if (!currentStatus && !isVerified) {
      // If we are approving a vendor that is not yet verified, show OTP modal
      setSelectedVendor({ id, email });
      setShowOtpModal(true);
      return;
    }

    const oldVendors = [...vendors];
    // ⚡ Optimistic UI: Toggle approval status immediately
    setVendors(prev => prev.map(v => v._id === id ? { ...v, isApproved: !currentStatus } : v));

    try {
      const { data } = await api.put(`/admin/vendors/${id}/status`, { isApproved: !currentStatus });
      toast.success(data.isApproved ? 'Vendor Approved ✅' : 'Vendor Suspended 🚫');
    } catch (error) {
      // Rollback on failure
      setVendors(oldVendors);
      toast.error('Error updating vendor status. Changes reverted.');
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    try {
      // 1. Verify OTP first
      await api.post('/auth/verify-account', { email: selectedVendor.email, otp });
      
      // 2. Then approve vendor
      const { data } = await api.put(`/admin/vendors/${selectedVendor.id}/status`, { isApproved: true });
      
      toast.success('Account Verified & Vendor Approved!');
      setVendors(prev => prev.map(v => v._id === selectedVendor.id ? { 
        ...v, 
        isApproved: true,
        userId: { ...v.userId, isVerified: true }
      } : v));
      setShowOtpModal(false);
      setOtp('');
      setSelectedVendor(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed. Please check the OTP.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const { data } = await api.post('/admin/users/resend-otp', { email: selectedVendor.email });
      toast.success(data.message || 'New verification code sent!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to completely remove this vendor account? This cannot be undone.')) return;
    
    const oldVendors = [...vendors];
    // ⚡ Optimistic UI: Remove vendor immediately from view
    setVendors(prev => prev.filter(v => v._id !== id));

    try {
      await api.delete(`/admin/vendors/${id}`);
      toast.success('Vendor account removed successfully');
    } catch (error) {
      // Rollback on failure
      setVendors(oldVendors);
      toast.error('Error deleting vendor. Account restored.');
    }
  };

  const openCreateModal = () => {
    const randomPassword = Math.random().toString(36).slice(-8) + '@' + Math.floor(Math.random() * 100);
    setFormData({ ...formData, password: randomPassword });
    setShowModal(true);
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await api.post('/admin/users', formData);
      toast.success('Vendor Account Created Successfully!');
      
      // Auto-transition to OTP verification
      setSelectedVendor({ id: data.profileId, email: data.email, tempPassword: data.password });
      setShowModal(false);
      setShowOtpModal(true);
      
      setFormData({ name: '', email: '', password: '', phone: '', shopName: '', location: '', upiId: '', role: 'vendor' });
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating vendor');
    } finally {
      setIsCreating(false);
    }
  };

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
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <FiShoppingBag className="text-orange-500" />
                Manage Vendors
              </h1>
              <p className="text-gray-500 mt-2">Approve new restaurant applications and monitor active vendors.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={openCreateModal} className="bg-primary hover:bg-orange-600 text-white font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95">
                <FiUserPlus /> Add Vendor
              </button>
              <Link to="/admin/dashboard" className="text-gray-500 hover:text-primary font-bold flex items-center gap-2 transition-colors bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md w-fit active:scale-95">
                <FiArrowLeft /> Back
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-sm font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Shop</th>
                  <th className="px-6 py-4">Owner (User ID)</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Rating</th>
                  <th className="px-6 py-4 text-right">Status / Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(vendors || []).map((vendor, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={vendor?._id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500 font-bold overflow-hidden">
                          {vendor?.shopImage ? (
                            <img src={vendor.shopImage} alt={vendor?.shopName} className="w-full h-full object-cover" />
                          ) : (
                            <FiShoppingBag />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{vendor?.shopName || 'Shop'}</p>
                          <p className="text-xs text-gray-400">{(vendor?.cuisineType || []).join(', ') || 'General'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">{vendor?.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{vendor?.userId?.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {vendor?.location}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 group">
                        <FiStar className="text-yellow-400 fill-yellow-400" size={14} />
                        <span className="font-bold text-gray-700">{vendor?.rating ? vendor.rating.toFixed(1) : 'New'}</span>
                        <span className="text-xs text-gray-400">({vendor?.numReviews || 0})</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(vendor?._id, vendor?.isApproved, vendor?.userId?.isVerified, vendor?.userId?.email)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                            vendor?.isApproved 
                              ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:scale-105' 
                              : !vendor?.userId?.isVerified
                                ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:scale-105'
                                : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:scale-105'
                          }`}
                        >
                          {vendor?.isApproved ? (
                            <><FiCheckCircle size={14} /> Approved</>
                          ) : !vendor?.userId?.isVerified ? (
                            <><FiXCircle size={14} /> Verify & Approve</>
                          ) : (
                            <><FiXCircle size={14} /> Needs Approval</>
                          )}
                        </button>
                        <Link 
                          to={`/student/restaurant/${vendor?._id}`}
                          className="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-blue-50 transition-all"
                          title="View Live Stall"
                        >
                          <FiExternalLink size={18} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteVendor(vendor?._id)}
                          className="text-gray-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all"
                          title="Delete Vendor"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {vendors.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No vendors found.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Vendor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-heading">Create New Vendor</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-rose-500 p-2"><FiXCircle size={24}/></button>
            </div>
            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Owner Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone</label>
                  <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Temporary Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    minLength="6" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Shop Name</label>
                  <input type="text" required value={formData.shopName} onChange={e => setFormData({...formData, shopName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Campus Location</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">UPI ID (For Weekly Payouts)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. shopname@okaxis" 
                  value={formData.upiId} 
                  onChange={e => setFormData({...formData, upiId: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
              <button 
                type="submit" 
                disabled={isCreating}
                className={`w-full py-3 mt-6 text-white font-bold rounded-xl transition shadow-lg ${isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-orange-600 shadow-orange-500/30'}`}
              >
                {isCreating ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Granting Access...
                  </div>
                ) : (
                  'Grant Vendor Access'
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Vendor OTP</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Enter the 6-digit verification code sent to <br />
              <span className="font-bold text-gray-800">{selectedVendor?.email}</span>
            </p>
            <form onSubmit={handleOtpVerify}>
              <input 
                type="text" 
                maxLength="6" 
                required 
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-3 border-2 border-gray-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-orange-500/10 outline-none transition-all mb-4"
              />
              <div className="text-sm text-gray-500 mb-6">
                Didn&apos;t receive the code?{' '}
                <button 
                  type="button" 
                  onClick={handleResendOtp}
                  className="text-primary font-bold hover:underline"
                >
                  Resend Code
                </button>
              </div>
              {/* Credentials Persistence Card */}
              {selectedVendor?.tempPassword && (
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedVendor.tempPassword);
                        toast.success('Password copied!');
                      }}
                      className="p-1.5 bg-white shadow-sm border rounded-lg text-primary hover:bg-primary hover:text-white transition-all active:scale-95"
                      title="Copy Password"
                    >
                      <FiCheckCircle size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Temporary Password</p>
                  <p className="font-mono text-slate-700 font-bold break-all select-all">{selectedVendor.tempPassword}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  type="button"
                  disabled={isVerifying}
                  onClick={() => { setShowOtpModal(false); setOtp(''); }}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/30 disabled:opacity-70 flex justify-center items-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : 'Verify & Approve'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageVendors;
