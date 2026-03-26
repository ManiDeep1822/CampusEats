import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { setCredentials } from '../../store/authSlice';
import { FiArrowLeft, FiPlus, FiDollarSign, FiZap, FiShield } from 'react-icons/fi';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000];

const CampusWallet = () => {
  const { user } = useSelector(state => state.auth);
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTopUp = async (e) => {
    e.preventDefault();
    const parsed = Number(amount);
    if (!parsed || parsed <= 0 || parsed > 10000) {
      return toast.error('Enter a valid amount between ₹1 and ₹10,000');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/wallet/topup', { amount: parsed });
      // Update user in Redux so Navbar refreshes immediately
      dispatch(setCredentials({ ...user, walletBalance: data.walletBalance }));
      toast.success(data.message);
      setAmount('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Top-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 py-10 px-4">
      <div className="max-w-md mx-auto">

        {/* Back Button */}
        <Link to="/student/home" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition mb-6 group">
          <FiArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Wallet Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-rose-600 rounded-3xl p-8 text-white shadow-2xl shadow-orange-500/30 mb-8">
          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <FiZap size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-200">Campus Wallet</p>
                <p className="text-xs text-orange-300 font-medium">Instant payment &amp; cashback</p>
              </div>
            </div>

            <p className="text-sm font-bold text-orange-200 mb-1">Available Balance</p>
            <h1 className="text-5xl font-black tracking-tighter">
              ₹{(user?.walletBalance || 0).toFixed(2)}
            </h1>

            <div className="mt-6 flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2 w-fit">
              <FiShield size={14} className="text-orange-200" />
              <p className="text-xs font-bold text-orange-200">Secured &amp; Instant</p>
            </div>
          </div>
        </div>

        {/* Top-Up Form */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FiPlus className="text-primary" />
            Add Money
          </h2>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {QUICK_AMOUNTS.map(val => (
              <button
                key={val}
                onClick={() => setAmount(String(val))}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  amount === String(val)
                    ? 'bg-primary text-white border-primary shadow-md shadow-orange-500/20'
                    : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-primary hover:text-primary'
                }`}
              >
                +₹{val}
              </button>
            ))}
          </div>

          <form onSubmit={handleTopUp} className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-gray-400">₹</span>
              <input
                type="number"
                min="1"
                max="10000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="Enter custom amount"
                className="w-full pl-9 pr-4 py-4 border-2 border-gray-100 rounded-2xl text-lg font-bold text-gray-800 focus:outline-none focus:border-primary transition-all bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !amount}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <FiZap size={20} />
                  Add ₹{amount || '0'} to Wallet
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4 font-medium">
            💳 Demo mode: No real money involved. Max ₹10,000 per top-up.
          </p>
        </div>

        {/* How it works */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">How it works</h3>
          <ul className="space-y-2 text-sm text-gray-500">
            <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> Add money to your Campus Wallet above.</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> At checkout, choose "Campus Wallet" as your payment method.</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> Pay instantly — no OTP or bank app needed!</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default CampusWallet;
