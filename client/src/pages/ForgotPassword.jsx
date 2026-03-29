import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiMail, FiArrowLeft } from 'react-icons/fi';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      toast.success(data.message || 'Reset code sent to your email!');
      // Navigate to reset password page, passing email as state
      navigate('/reset-password', { state: { email } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="mb-6">
          <Link to="/login" className="text-primary flex items-center gap-2 font-medium hover:underline">
            <FiArrowLeft /> Back to Login
          </Link>
        </div>
        
        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-4">Forgot Password?</h2>
        <p className="text-gray-500 mb-8 whitespace-pre-wrap">
          Enter the email address you used when you joined and we&apos;ll send you a temporary password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Email Address</label>
            <div className="relative">
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="you@campus.edu"
              />
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Reset Code'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
