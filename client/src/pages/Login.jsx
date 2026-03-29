import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { GoogleLogin } from '@react-oauth/google';
import api from '../services/api';

import toast from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      dispatch(setCredentials({ user: data, token: data.token, role: data.role }));
      toast.success('Login Successful!');
      
      if (data.role === 'admin') navigate('/admin/dashboard');
      else if (data.role === 'student') navigate('/student/home');
      else if (data.role === 'vendor') navigate('/vendor/dashboard');
      else if (data.role === 'delivery') navigate('/delivery/dashboard');
      else navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-8">Welcome Back</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
              placeholder="you@campus.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition pr-10"
                placeholder="••••••••"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
              >
                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
              </button>
            </div>
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" size="sm" className="text-primary hover:underline font-medium text-sm">
                Forgot Password?
              </Link>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Login'}
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
                toast.success('Login Successful!');
                navigate(data.role === 'admin' ? '/admin/dashboard' : data.role === 'student' ? '/student/home' : data.role === 'vendor' ? '/vendor/dashboard' : '/delivery/dashboard');
              } catch (err) {
                toast.error('Google Login failed');
              }
            }}
            onError={() => {
              toast.error('Google Login failed');
            }}
            shape="pill"
          />
        </div>

        <p className="mt-6 text-center text-textSecondary">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
