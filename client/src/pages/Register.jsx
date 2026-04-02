import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiArrowLeft, FiShield } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    phone: '',
    otp: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      const roles = { admin: '/admin/dashboard', student: '/student/home', vendor: '/vendor/dashboard', delivery: '/delivery/dashboard' };
      navigate(roles[user?.role] || '/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateInfo = () => {
    const { name, email, password, confirmPassword, phone } = formData;
    if (name.length < 2) return toast.error('Name is too short'), false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error('Invalid email format'), false;
    if (!/^\d{10}$/.test(phone)) return toast.error('Invalid phone number (10 digits)'), false;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) return toast.error('Password must meet strength requirements'), false;
    if (password !== confirmPassword) return toast.error('Passwords do not match'), false;
    return true;
  };

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    if (!validateInfo()) return;

    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email: formData.email });
      toast.success('Verification code sent to your email!');
      setStep(2);
      setResendTimer(60); // 60 seconds cooldown
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.otp.length !== 6) return toast.error('Please enter the 6-digit OTP'), false;

    setLoading(true);
    try {
      const { confirmPassword, ...registerData } = formData;
      const { data } = await api.post('/auth/register', registerData);
      dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
      toast.success('Registration Successful!');
      const roles = { admin: '/admin/dashboard', student: '/student/home', vendor: '/vendor/dashboard', delivery: '/delivery/dashboard' };
      navigate(roles[data.role] || '/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        {step === 2 && (
          <button onClick={() => setStep(1)} className="text-primary flex items-center gap-2 mb-6 hover:underline font-medium">
            <FiArrowLeft /> Back to details
          </button>
        )}
        
        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-2">
          {step === 1 ? 'Create Account' : 'Verify Email'}
        </h2>
        <p className="text-center text-textSecondary mb-8">
          {step === 1 ? 'Join the CampusEats platform today!' : `Enter the code sent to ${formData.email}`}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
              <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" placeholder="john@university.edu" />
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password" required value={formData.password} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number</label>
              <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" placeholder="10-digit mobile number" />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 mt-4 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Next: Verify Email'}
            </button>
            <p className="text-[10px] text-center text-textSecondary px-4 leading-normal mt-2">
              By creating an account, I accept the 
              <Link to="/terms" className="text-primary hover:underline font-bold mx-1">Terms & Conditions</Link> 
              & 
              <Link to="/privacy" className="text-primary hover:underline font-bold mx-1">Privacy Policy</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-2">Verification Code</label>
              <div className="relative">
                <input 
                  type="text" 
                  name="otp" 
                  required 
                  value={formData.otp} 
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })} 
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none tracking-[1em] text-center font-bold text-xl" 
                  placeholder="000000"
                />
                <FiShield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            <div className="text-center">
              <button 
                type="button" 
                disabled={resendTimer > 0 || loading} 
                onClick={handleSendOTP} 
                className="text-primary font-bold hover:underline disabled:text-gray-400 disabled:no-underline"
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Verification Code'}
              </button>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20">
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Verify & Create Account'}
            </button>
            <p className="text-[10px] text-center text-textSecondary px-4 leading-normal mt-2">
              By continuing, I confirm my agreement to the 
              <Link to="/terms" className="text-primary hover:underline font-bold mx-1">Terms & Conditions</Link> 
              & 
              <Link to="/privacy" className="text-primary hover:underline font-bold mx-1">Privacy Policy</Link>
            </p>
          </form>
        )}

        {step === 1 && (
          <>
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-textSecondary font-medium">Or continue with</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async (res) => {
                  try {
                    const { data } = await api.post('/auth/google', { credential: res.credential });
                    dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
                    toast.success('Registration Successful!');
                    const roles = { admin: '/admin/dashboard', student: '/student/home', vendor: '/vendor/dashboard', delivery: '/delivery/dashboard' };
                    navigate(roles[data.role] || '/');
                  } catch (err) {
                    toast.error('Google Sign-up failed');
                  }
                }}
                onError={() => toast.error('Google Sign-up failed')}
                text="signup_with"
                shape="pill"
              />
            </div>
          </>
        )}

        <p className="mt-6 text-center text-textSecondary">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
