import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTruck, FiCheckCircle, FiXCircle, FiArrowLeft, FiUserPlus, FiEye, FiEyeOff, FiTrash2 } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageRiders = () => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [selectedRider, setSelectedRider] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', vehicleType: 'Bicycle', role: 'delivery' });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      const { data } = await api.get('/admin/delivery');
      setRiders(data);
    } catch (error) {
      toast.error('Failed to load delivery personnel');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus, isVerified, email) => {
    if (!currentStatus && !isVerified) {
      // If activating a rider that is not yet verified, show OTP modal
      setSelectedRider({ id, email });
      setShowOtpModal(true);
      return;
    }

    try {
      const { data } = await api.put(`/admin/delivery/${id}/status`, { isAvailable: !currentStatus });
      toast.success(data.isAvailable ? 'Rider set to Available' : 'Rider set to Off-Duty');
      setRiders(riders.map(r => r._id === id ? { ...r, isAvailable: data.isAvailable } : r));
    } catch (error) {
      toast.error('Error updating rider status');
    }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    try {
      // 1. Verify OTP first
      await api.post('/auth/verify-account', { email: selectedRider.email, otp });
      
      // 2. Then set available
      const { data } = await api.put(`/admin/delivery/${selectedRider.id}/status`, { isAvailable: true });
      
      toast.success('Rider Verified & Set to Available!');
      setRiders(riders.map(r => r._id === selectedRider.id ? { 
        ...r, 
        isAvailable: true,
        userId: { ...r.userId, isVerified: true }
      } : r));
      setShowOtpModal(false);
      setOtp('');
      setSelectedRider(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed. Please check the OTP.');
    }
  };

  const handleResendOtp = async () => {
    try {
      const { data } = await api.post('/admin/users/resend-otp', { email: selectedRider.email });
      toast.success(data.message || 'New verification code sent!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP');
    }
  };

  const handleDeleteRider = async (id) => {
    if (window.confirm('Are you sure you want to completely remove this delivery personnel? This cannot be undone.')) {
      try {
        await api.delete(`/admin/delivery/${id}`);
        toast.success('Rider account removed successfully');
        setRiders(riders.filter(r => r._id !== id));
      } catch (error) {
        toast.error(error.response?.data?.message || 'Error deleting rider');
      }
    }
  };

  const handleCreateRider = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const { data } = await api.post('/admin/users', formData);
      toast.success('Delivery Personnel Created Successfully!');
      
      // Auto-transition to OTP verification
      setSelectedRider({ id: data.profileId, email: data.email });
      setShowModal(false);
      setShowOtpModal(true);
      
      setFormData({ name: '', email: '', password: '', phone: '', vehicleType: 'Bicycle', role: 'delivery' });
      fetchRiders(); // refresh list
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating rider');
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
                <FiTruck className="text-emerald-500" />
                Manage Delivery Fleet
              </h1>
              <p className="text-gray-500 mt-2">Monitor delivery personnel, active vehicles, and duty status.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-orange-600 text-white font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95">
                <FiUserPlus /> Add Rider
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
                  <th className="px-6 py-4">Rider Info</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Vehicle Details</th>
                  <th className="px-6 py-4 text-right">Availability Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {riders.map((rider, idx) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={rider._id} 
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 font-bold overflow-hidden border border-emerald-200">
                          {rider.userId?.profilePic ? (
                            <img src={rider.userId.profilePic} alt={rider.userId?.name} className="w-full h-full object-cover" />
                          ) : (
                            rider.userId?.name ? rider.userId.name.charAt(0).toUpperCase() : 'R'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{rider.userId?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-400">ID: {rider._id.slice(-6)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-700">{rider.userId?.email}</p>
                      <p className="text-xs text-gray-400">{rider.userId?.phone || 'No phone'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                        {rider.vehicleType}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">{rider.vehicleNumber}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(rider._id, rider.isAvailable, rider.userId?.isVerified, rider.userId?.email)}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                            rider.isAvailable 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:scale-105' 
                              : !rider.userId?.isVerified
                                ? 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 hover:scale-105'
                                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:scale-105'
                          }`}
                        >
                          {rider.isAvailable ? (
                            <><FiCheckCircle size={14} /> Available / On-Duty</>
                          ) : !rider.userId?.isVerified ? (
                            <><FiXCircle size={14} /> Verify & Activate</>
                          ) : (
                            <><FiXCircle size={14} /> Off-Duty</>
                          )}
                        </button>
                        <button 
                          onClick={() => handleDeleteRider(rider._id)}
                          className="text-gray-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all"
                          title="Delete Rider account"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            
            {riders.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                No delivery fleet assigned yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Create Delivery Rider Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold font-heading">Register New Rider</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-rose-500 p-2"><FiXCircle size={24}/></button>
            </div>
            <form onSubmit={handleCreateRider} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
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
              <div className="pt-2 border-t mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Type</label>
                <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none">
                  <option value="Bicycle">Bicycle</option>
                  <option value="Scooter">Motorized Scooter</option>
                  <option value="Walking">Walking</option>
                </select>
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
                  'Grant Delivery Access'
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Rider OTP</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Enter the 6-digit verification code sent to <br />
              <span className="font-bold text-gray-800">{selectedRider?.email}</span>
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
                Didn't receive the code?{' '}
                <button 
                  type="button" 
                  onClick={handleResendOtp}
                  className="text-primary font-bold hover:underline"
                >
                  Resend Code
                </button>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowOtpModal(false); setOtp(''); }}
                  className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/30"
                >
                  Verify & Activate
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ManageRiders;
