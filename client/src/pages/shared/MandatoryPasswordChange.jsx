import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials, logout } from '../../store/authSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { FiLock, FiShield, FiCheckCircle, FiEye, FiEyeOff, FiLogOut } from 'react-icons/fi';

const MandatoryPasswordChange = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { user, token, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters long');
    }
    if (newPassword !== confirmPassword) {
      return toast.error('Passwords do not match');
    }

    setLoading(true);
    try {
      await api.post('/auth/complete-setup', { newPassword });
      
      // Update local state to reflect that password change is complete
      const updatedUser = { ...user, mustChangePassword: false };
      dispatch(setCredentials({ user: updatedUser, token, role }));
      
      toast.success('Password updated successfully!');
      
      // Redirect to appropriate dashboard
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'vendor') navigate('/vendor/dashboard');
      else if (role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/student/home');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-100"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <FiShield size={40} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Secure Your Account</h1>
          <p className="text-slate-500 font-medium leading-relaxed">
            Since this is your first time logging in, you must set a new secure password to activate your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-11 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
              />
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-orange-500 transition-colors"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 ml-1">Confirm New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your new password"
                className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-medium"
              />
              <FiCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              💡 <strong>Pro Tip:</strong> Use a combination of letters, numbers, and symbols for a stronger password.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl shadow-orange-600/25 hover:bg-orange-700 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Activate My Account'
            )}
          </button>

          <button 
            type="button"
            onClick={handleLogout}
            className="w-full py-4 bg-white text-slate-500 font-bold rounded-2xl border-2 border-slate-100 hover:bg-slate-50 transition-all flex items-center justify-center gap-2 mt-4"
          >
            <FiLogOut /> Logout and Exit
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default MandatoryPasswordChange;
