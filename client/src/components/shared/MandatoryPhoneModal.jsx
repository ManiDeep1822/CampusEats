import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { FiPhone, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { setCredentials } from '../../store/authSlice';
import { useAuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const MandatoryPhoneModal = () => {
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);
  const { loading: authLoading } = useAuthContext();
  const dispatch = useDispatch();
  
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Only show if user is Google-authenticated and has no phone number
  const showModal = !authLoading && isAuthenticated && user?.provider === 'google' && !user?.phone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation: 10 digits
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const { data } = await api.put('/auth/profile', { phone });
      
      // Update local Redux state with new user data
      dispatch(setCredentials({ 
        user: data, 
        token: token, 
        role: data.role 
      }));
      
      toast.success('Mobile number updated successfully!');
    } catch (err) {
      console.error('Failed to update phone number', err);
      toast.error(err.response?.data?.message || 'Failed to update mobile number');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden relative"
          >
            {/* Decorative background element */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-tr from-orange-100 to-rose-100 text-primary rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                <FiPhone size={40} className="drop-shadow-sm" />
              </div>
              
              <h2 className="text-3xl font-black text-slate-900 mb-3 text-center tracking-tight">One Last Step!</h2>
              <p className="text-slate-500 mb-8 text-center leading-relaxed font-medium">
                To ensure a smooth delivery experience, we need your <span className="text-slate-900 font-bold">mobile number</span>. This allows our riders to reach you when your order arrives.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-black text-slate-700 mb-2 ml-1 uppercase tracking-wider">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                      <span className="font-bold border-r border-slate-200 pr-3 mr-1">+91</span>
                    </div>
                    <input 
                      type="tel"
                      required
                      maxLength="10"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setPhone(val);
                        if (error) setError('');
                      }}
                      className={`w-full pl-[72px] pr-4 py-4 bg-slate-50 border-2 rounded-2xl font-bold text-lg outline-none transition-all ${error ? 'border-red-200 focus:border-red-400 text-red-600' : 'border-slate-100 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 text-slate-900'}`}
                    />
                  </div>
                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-500 text-xs mt-2 ml-1 font-bold flex items-center gap-1"
                    >
                      <FiAlertCircle size={14} /> {error}
                    </motion.p>
                  )}
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading || phone.length !== 10}
                  type="submit"
                  className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${loading || phone.length !== 10 ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-primary text-white hover:bg-orange-600 shadow-orange-500/20'}`}
                >
                  {loading ? (
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Confirm & Start Ordering <FiCheckCircle size={20} />
                    </>
                  )}
                </motion.button>
              </form>
              
              <p className="text-[10px] text-slate-400 mt-8 text-center uppercase font-black tracking-widest px-4">
                🔒 Your data is secure and will only be shared with your assigned delivery partner.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MandatoryPhoneModal;
