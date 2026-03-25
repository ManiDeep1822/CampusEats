import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
  });
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user?.role === 'student') navigate('/student/home', { replace: true });
      else if (user?.role === 'vendor') navigate('/vendor/dashboard', { replace: true });
      else if (user?.role === 'delivery') navigate('/delivery/dashboard', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSendOTP = async (e, isResend = false) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: formData.email });
      toast.success(isResend ? 'New verification code sent!' : 'Verification code sent to email!');
      setStep(2);
      setResendTimer(30); // 30 second anti-spam cooldown
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-register', { ...formData, otp });
      dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
      toast.success('Registration Successful!');
      
      if (data.role === 'admin') navigate('/admin/dashboard');
      else if (data.role === 'student') navigate('/student/home');
      else if (data.role === 'vendor') navigate('/vendor/dashboard');
      else if (data.role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-2">Create Account</h2>
        <p className="text-center text-textSecondary mb-8">
          {step === 1 ? 'Join the CampusEats platform today!' : 'Check your email for the verification code'}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
              <input type="password" name="password" required minLength="6" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 mt-4 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1 text-center font-bold">Enter 6-Digit Code</label>
              <input 
                type="text" 
                maxLength="6" 
                required 
                value={otp} 
                onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                className="w-full px-4 py-4 text-3xl tracking-[1em] text-center font-mono rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none bg-gray-50" 
                placeholder="000000"
              />
            </div>
            <button type="submit" disabled={loading || otp.length < 6} className="w-full bg-green-500 text-white font-bold py-3 mt-4 rounded-lg hover:bg-green-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-green-500/20">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify & Register'}
            </button>
            <div className="flex justify-between items-center mt-4">
              <button 
                type="button" 
                onClick={() => handleSendOTP(null, true)} 
                disabled={resendTimer > 0 || loading} 
                className="text-sm font-bold text-primary hover:underline disabled:text-gray-400 disabled:no-underline transition"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
              <button type="button" onClick={() => setStep(1)} className="text-sm text-textSecondary font-bold hover:text-textPrimary transition">
                Change Details
              </button>
            </div>
          </form>
        )}
        <p className="mt-6 text-center text-textSecondary">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
