import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiShoppingBag, FiClock, FiChevronRight, FiMapPin, FiTrash2, FiCamera, FiMonitor } from 'react-icons/fi';
import { FaRupeeSign } from 'react-icons/fa';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';

const VendorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('Campus HQ');
  const [locating, setLocating] = useState(false);
  const [showProfile, setShowProfile] = useState(() => {
    return localStorage.getItem('vendor_show_profile') !== 'false';
  });
  const [isEditingUPI, setIsEditingUPI] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await api.get('/vendor/dashboard');
      setData(res.data);
    } catch (error) { toast.error('Failed to load dashboard'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  const dismissProfile = () => {
    setShowProfile(false);
    localStorage.setItem('vendor_show_profile', 'false');
  };

  const toggleStatus = async () => {
    const oldIsOpen = data.shopDetails.isOpen;
    setData({ 
      ...data, 
      shopDetails: { ...data.shopDetails, isOpen: !oldIsOpen } 
    });

    try {
      const res = await api.put('/vendor/toggle-status');
      setData({ 
        ...data, 
        shopDetails: { ...data.shopDetails, isOpen: res.data.isOpen } 
      });
      toast.success(`Shop is now ${res.data.isOpen ? 'OPEN' : 'CLOSED'} 🏪`);
    } catch (error) { 
      setData({ 
        ...data, 
        shopDetails: { ...data.shopDetails, isOpen: oldIsOpen } 
      });
      toast.error('Failed to update shop status. Rolled back.'); 
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    const uploadToast = toast.loading('Uploading image...');
    try {
      const uploadRes = await api.post('/upload', formData);
      const imageUrl = uploadRes.data.imageUrl;
      await api.put('/vendor/profile', { shopImage: imageUrl });
      setData({ ...data, shopDetails: { ...data.shopDetails, shopImage: imageUrl } });
      await fetchStats();
      toast.success('Restaurant image updated!', { id: uploadToast });
    } catch (error) {
      toast.error('Failed to upload image', { id: uploadToast });
    }
  };

  const handleImageRemove = async () => {
    if (!window.confirm('Remove shop image?')) return;
    try {
      await api.put('/vendor/profile', { shopImage: null });
      setData({ ...data, shopDetails: { ...data.shopDetails, shopImage: null } });
      toast.success('Shop image removed');
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setAddress('LPU (Detected)');
        setLocating(false);
        toast.success('Shop location verified!');
      },
      (err) => {
        setLocating(false);
        toast.error('Location error: ' + err.message);
      }
    );
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const upiId = e.target.upiId.value;
    const saveToast = toast.loading('Saving payment details...');
    try {
      await api.put('/vendor/profile', { paymentDetails: { upiId } });
      toast.success('Payment settings updated! 💸', { id: saveToast });
      setIsEditingUPI(false);
      fetchStats();
    } catch (error) {
      toast.error('Failed to update payment info', { id: saveToast });
    }
  };

  if (loading) return <Loader />;
  if (!data || !data.stats) return <div className="text-center py-20 text-red-500 font-bold">Error loading dashboard. Please refresh.</div>;

  const currentUpi = data.shopDetails.paymentDetails?.upiId;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {showProfile && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 relative group">
            <button 
              onClick={dismissProfile}
              className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
              title="Remove profile section"
            >
              <FiTrash2 size={18} />
            </button>
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-orange-100 border-4 border-white shadow-md flex-shrink-0">
                {data.shopDetails.shopImage ? (
                  <img src={data.shopDetails.shopImage} alt="Shop" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🏪</div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                <FiCamera className="text-white text-2xl" />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
              {data.shopDetails.shopImage && (
                <button 
                  onClick={handleImageRemove}
                  className="absolute top-1 left-1 bg-white p-1.5 rounded-full shadow-md text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 hover:scale-110 active:scale-95 z-20"
                  title="Remove shop image"
                >
                  <FiTrash2 size={14} />
                </button>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold font-heading text-gray-900">{data.shopDetails.shopName}</h1>
              <div 
                onClick={handleGetLocation}
                className="flex items-center gap-2 cursor-pointer hover:opacity-75 transition-opacity mt-1"
              >
                <div className="w-5 h-5 bg-orange-100 text-primary rounded-full flex items-center justify-center">
                  <FiMapPin size={12} className={locating ? 'animate-bounce' : ''} />
                </div>
                <span className="text-textSecondary text-xs font-black tracking-tight">{locating ? 'Verifying...' : address}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-gray-700">Status:</span>
              <button onClick={toggleStatus} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${data.shopDetails.isOpen ? 'bg-accent' : 'bg-gray-300'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${data.shopDetails.isOpen ? 'translate-x-9' : 'translate-x-1'}`}/>
              </button>
              <span className={`font-bold ${data.shopDetails.isOpen ? 'text-accent' : 'text-gray-500'}`}>{data.shopDetails.isOpen ? 'OPEN' : 'CLOSED'}</span>
            </div>
            <Link to="/vendor/orders" className="bg-primary text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition">View Orders</Link>
          </div>
        </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold text-xs uppercase tracking-widest">Today&apos;s Revenue</h3>
              <div className="p-2 bg-orange-100 text-primary rounded-lg"><FiTrendingUp size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">₹{data.stats.revenue}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold text-xs uppercase tracking-widest">Today&apos;s Orders</h3>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FiShoppingBag size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.todaysOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold text-xs uppercase tracking-widest">Pending Orders</h3>
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><FiClock size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.pendingOrders || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold text-green-700 text-xs uppercase tracking-widest">Lifetime Balance</h3>
              <div className="p-2 bg-green-100 text-green-600 rounded-lg"><FaRupeeSign size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-green-700">₹{data.stats.lifetimeEarnings || 0}</p>
          </div>
        </div>

        {/* Settlement & Payout Info */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center gap-10">
          <div className="flex-shrink-0 text-center lg:text-left">
            <h2 className="text-2xl font-bold font-heading text-gray-900 mb-2">Settlement Center</h2>
            <p className="text-sm text-gray-500 mb-4 max-w-xs">Your pending balance is settled every week by the admin via your provided UPI ID.</p>
            <div className="inline-block p-4 bg-orange-50 rounded-2xl border border-orange-100">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">Current Unpaid Balance</p>
              <p className="text-4xl font-black text-orange-600">₹{data.stats.pendingPayout || 0}</p>
            </div>
          </div>

          <div className="flex-1 w-full p-7 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FiTrendingUp className="text-primary" />
              Payout Destination
            </h3>
            
            {!isEditingUPI && currentUpi ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 leading-none">Registered UPI ID</p>
                  <p className="text-base font-bold text-gray-800">{currentUpi}</p>
                </div>
                <button 
                  onClick={() => setIsEditingUPI(true)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-orange-50 text-primary font-bold rounded-lg border border-orange-100 hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95 text-sm"
                >
                  Edit ID
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePayment} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input 
                    name="upiId"
                    defaultValue={currentUpi || ''}
                    placeholder="Enter UPI ID (e.g. name@upi)"
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none text-sm font-bold transition-all"
                    required
                    autoFocus={isEditingUPI}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-white font-bold px-8 py-3 rounded-xl hover:bg-orange-600 transition shadow-lg shadow-orange-500/20 active:scale-95 whitespace-nowrap"
                  >
                    {currentUpi ? 'Update UPI' : 'Save UPI'}
                  </button>
                  {isEditingUPI && (
                    <button 
                      type="button"
                      onClick={() => setIsEditingUPI(false)}
                      className="px-4 py-3 bg-white text-gray-500 font-bold border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
            <p className="text-[10px] text-gray-400 mt-4 font-black uppercase tracking-tighter">* Secure settlements are processed by the admin using this ID.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* Weekly Sales Performance Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold font-heading mb-6">Weekly Sales Performance</h2>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.weeklyData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <Tooltip />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-heading">Top Selling Items</h2>
            </div>
            <div className="space-y-4">
              {(data?.popularItems || []).map((item, idx) => (
                <div key={item?._id || idx} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition cursor-pointer">
                  <div className="text-xl font-extrabold text-orange-300 w-6">#{idx + 1}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm">{item?.name || 'Item'}</h4>
                    <p className="text-xs text-gray-500">{item?.totalSold || 0} units</p>
                  </div>
                  <p className="font-extrabold text-green-600 text-sm">₹{item?.revenue || 0}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h2 className="text-xl font-bold font-heading mb-4">Quick Actions</h2>
           <div className="flex flex-wrap gap-3 items-stretch">
             <Link to="/vendor/menu" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary transition">Manage Menu</Link>
             <Link to="/vendor/payments" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary transition">Payment History</Link>
             <Link to="/vendor/kds" className="flex items-center gap-4 px-6 py-4 rounded-xl font-bold text-white bg-slate-900 border border-orange-500/20">
               <FiMonitor size={20} className="text-orange-400" />
               Kitchen Display (KDS)
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
};
export default VendorDashboard;
