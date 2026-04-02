import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiTrendingUp, FiShoppingBag, FiClock, FiChevronRight, FiMapPin, FiTrash2, FiCamera, FiMonitor } from 'react-icons/fi';
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

    // ⚡ Optimistic UI Update: Toggle switch instantly
    setData({ 
      ...data, 
      shopDetails: { ...data.shopDetails, isOpen: !oldIsOpen } 
    });

    try {
      const res = await api.put('/vendor/toggle-status');
      // Sync with server result
      setData({ 
        ...data, 
        shopDetails: { ...data.shopDetails, isOpen: res.data.isOpen } 
      });
      toast.success(`Shop is now ${res.data.isOpen ? 'OPEN' : 'CLOSED'} 🏪`);
    } catch (error) { 
      // Rollback if the server fails
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
      // 1. Upload to Cloudinary
      const uploadRes = await api.post('/upload', formData);
      const imageUrl = uploadRes.data.imageUrl;

      // 2. Update Vendor Profile
      await api.put('/vendor/profile', { shopImage: imageUrl });
      
      setData({ ...data, shopDetails: { ...data.shopDetails, shopImage: imageUrl } });
      await fetchStats(); // Refresh all stats and details from backend
      toast.success('Restaurant image updated!', { id: uploadToast });
    } catch (error) {
      console.error(error);
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

  if (loading) return <Loader />;
  if (!data || !data.stats) return <div className="text-center py-20 text-red-500 font-bold">Error loading dashboard. Please refresh.</div>;

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
              <h3 className="text-textSecondary font-bold">Today&apos;s Revenue</h3>
              <div className="p-2 bg-orange-100 text-primary rounded-lg"><FiTrendingUp size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">₹{data.stats.revenue}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Today&apos;s Orders</h3>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FiShoppingBag size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{data.stats.todaysOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-textSecondary font-bold">Pending Orders</h3>
              <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg"><FiClock size={20}/></div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{(data?.stats?.rating || 0).toFixed(1)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2">
          {/* Chart Section */}
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
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#ea580c" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Items Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold font-heading">Top Selling Items</h2>
              <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2 py-1 rounded">All Time</span>
            </div>
            
            <div className="space-y-4">
              {data.popularItems?.length === 0 && (
                 <p className="text-sm text-gray-400 text-center py-10 border-2 border-dashed border-gray-100 rounded-lg">No delivered sales data yet.</p>
              )}
              {(data?.popularItems || []).map((item, idx) => (
                <div key={item?._id || idx} className="flex items-center gap-4 p-3 hover:bg-orange-50 rounded-xl transition cursor-pointer border border-transparent hover:border-orange-100">
                  <div className="text-xl font-extrabold text-orange-300 w-6">#{idx + 1}</div>
                  {item?.image ? (
                    <img src={item.image} alt={item?.name} className="w-12 h-12 object-cover rounded-lg shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🍲</div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1">{item?.name || 'Item'}</h4>
                    <p className="text-xs font-medium text-gray-500">{item?.totalSold || 0} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-green-600 text-sm">₹{item?.revenue || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
           <h2 className="text-xl font-bold font-heading mb-4">Quick Actions</h2>
           <div className="flex flex-wrap gap-3 items-stretch">
             <Link to="/vendor/menu" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary hover:text-primary transition text-base max-sm:text-sm">Manage Menu</Link>
             <Link to="/vendor/orders" className="px-5 py-3 border border-gray-200 rounded-lg font-bold text-gray-700 hover:border-primary hover:text-primary transition text-base max-sm:text-sm">Live Orders Queue</Link>
             
             {/* KDS — Command Center Card */}
             <Link
               to="/vendor/kds"
               className="group relative flex items-center gap-4 px-6 py-4 rounded-xl font-bold text-white overflow-hidden shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 border border-orange-500/20"
             >
               {/* Glow blob */}
               <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               
               {/* Icon with pulse ring */}
               <div className="relative shrink-0">
                 <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-20" />
                 <div className="relative w-10 h-10 flex items-center justify-center bg-orange-500/20 rounded-full border border-orange-500/30">
                   <FiMonitor size={20} className="text-orange-400" />
                 </div>
               </div>

               {/* Text */}
               <div className="flex flex-col leading-tight">
                 <span className="text-[11px] font-black uppercase tracking-[0.15em] text-orange-400">Command Center</span>
                 <span className="text-base font-black text-white">Kitchen Display (KDS)</span>
                 <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                   {data.stats.pendingOrders > 0 ? `🔴 ${data.stats.pendingOrders} active order${data.stats.pendingOrders > 1 ? 's' : ''} in queue` : '✅ All queues clear'}
                 </span>
               </div>

               {/* Arrow */}
               <FiChevronRight size={18} className="ml-auto shrink-0 text-orange-400 group-hover:translate-x-1 transition-transform" />
             </Link>
           </div>
        </div>
      </div>
    </div>
  );
};
export default VendorDashboard;
