import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { GoogleLogin } from '@react-oauth/google';


const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'student',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const validateForm = () => {
    const { name, email, password, phone } = formData;
    
    // 1. Name Check
    if (name.length < 2) {
      toast.error('Name is too short');
      return false;
    }

    // 2. Email Validation (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Invalid email format');
      return false;
    }

    // 3. Phone Number Validation (10-digit Indian format)
    const phoneRegex = /^[6789]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      toast.error('Invalid phone number. Must be a 10-digit number starting with 6-9.');
      return false;
    }

    // 4. Password Strength Validation
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error('Password must be 8+ chars and include: uppercase, lowercase, number, and special character');
      return false;
    }

    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', formData);
      dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
      toast.success('Registration Successful!');
      
      if (data.role === 'admin') navigate('/admin/dashboard');
      else if (data.role === 'student') navigate('/student/home');
      else if (data.role === 'vendor') navigate('/vendor/dashboard');
      else if (data.role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-2">Create Account</h2>
        <p className="text-center text-textSecondary mb-8">
          Join the CampusEats platform today!
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Full Name</label>
            <input 
              type="text" 
              name="name" 
              required 
              value={formData.name} 
              onChange={handleChange} 
              className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              value={formData.email} 
              onChange={handleChange} 
              className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                required 
                value={formData.password} 
                onChange={handleChange} 
                className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none pr-10" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Phone Number</label>
            <input 
              type="text" 
              name="phone" 
              required
              value={formData.phone} 
              onChange={handleChange} 
              className="w-full px-4 py-2 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none" 
              placeholder="e.g. 9876543210"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-primary text-white font-bold py-3 mt-4 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Create Account'}
          </button>
        </form>

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
            onSuccess={async (credentialResponse) => {
              try {
                const { data } = await api.post('/auth/google', { 
                  credential: credentialResponse.credential 
                });
                dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
                toast.success('Registration Successful!');
                navigate(data.role === 'admin' ? '/admin/dashboard' : data.role === 'student' ? '/student/home' : data.role === 'vendor' ? '/vendor/dashboard' : '/delivery/dashboard');
              } catch (err) {
                toast.error('Google Sign-up failed');
              }
            }}
            onError={() => {
              toast.error('Google Sign-up failed');
            }}
            text="signup_with"
            shape="pill"
          />
        </div>


        <p className="mt-6 text-center text-textSecondary">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
