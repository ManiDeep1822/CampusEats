import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiLock, FiShield, FiEye, FiEyeOff, FiArrowLeft } from 'react-icons/fi';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
        // If emailed wasn't passed, redirect back to forgot password
        // Or if they came here directly
        // navigate('/forgot-password'); 
    }
  }, [location, navigate]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const { otp, newPassword, confirmPassword } = formData;
    if (otp.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must meet strength requirements');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email || formData.email, // Allow manual email entry if not passed in state
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      toast.success('Password reset successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="mb-6">
          <Link to="/forgot-password" className="text-primary flex items-center gap-2 font-medium hover:underline">
            <FiArrowLeft /> Back
          </Link>
        </div>

        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-4">Reset Password</h2>
        <p className="text-center text-textSecondary mb-8 text-sm">
          Enter the 6-digit code sent to <strong>{email || 'your email'}</strong> and set your new password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!email && (
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email || ''}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none transition"
                placeholder="you@campus.edu"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Verification Code</label>
            <div className="relative">
              <input 
                type="text" 
                name="otp"
                required
                value={formData.otp}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setFormData({ ...formData, otp: val });
                }}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none tracking-[1em] text-center font-bold"
                placeholder="000000"
              />
              <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="newPassword"
                required
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none transition pr-10"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 mt-4"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
