import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, FiClock, FiStar, FiHeart, FiFilter, FiX, FiCheck, 
  FiChevronRight, FiMapPin, FiTruck, FiZap 
} from 'react-icons/fi';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import CartFloatingButton from '../../components/student/CartFloatingButton';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import LiveOrderTracker from '../../components/student/LiveOrderTracker';

const StudentHome = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [address, setAddress] = useState('Campus Block');
  const [locating, setLocating] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const categories = [
    { id: 'biryani', label: 'Biryani', icon: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-orange-50' },
    { id: 'pizza', label: 'Pizza', icon: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-red-50' },
    { id: 'burger', label: 'Burgers', icon: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-yellow-50' },
    { id: 'chinese', label: 'Chinese', icon: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-emerald-50' },
    { id: 'south', label: 'South Indian', icon: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-blue-50' },
    { id: 'desserts', label: 'Desserts', icon: 'https://images.unsplash.com/photo-1551024622-d2845FA7C113?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-pink-50' },
    { id: 'beverages', label: 'Drinks', icon: 'https://images.unsplash.com/photo-1437419764061-2473afe69fc2?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-cyan-50' },
    { id: 'rolls', label: 'Rolls', icon: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=300&h=300&auto=format&fit=crop', color: 'bg-amber-50' },
  ];

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data } = await api.get('/student/vendors');
        setVendors(Array.isArray(data) ? data : []);
      } catch (error) {
        setVendors([]);
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    const fetchFavs = async () => {
      try {
        const { data } = await api.get('/student/favorites');
        // Ensure we store strictly String IDs for accurate filtering
        setFavorites((data || []).map(f => (f._id || f).toString()));
      } catch(e) { 
        setFavorites([]);
        console.error('Failed to fetch favs', e); 
      }
    };
    fetchVendors();
    fetchFavs();
  }, []);

  const toggleFav = async (e, vendorId) => {
    e.preventDefault(); 
    try {
      const { data } = await api.put(`/student/favorites/${vendorId}`);
      // Store String IDs from server response
      const updatedFavs = (data?.favorites || []).map(id => id.toString());
      setFavorites(updatedFavs);
      toast.success(updatedFavs.includes(vendorId?.toString()) ? "Saved to Favorites" : "Removed from Favorites");
    } catch(err) { toast.error("Failed to update favorites"); }
  };

  const filteredVendors = vendors
    .filter(v => {
      const matchesSearch = v.shopName.toLowerCase().includes(search.toLowerCase()) || 
                            v.cuisineType.join(',').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || v.cuisineType.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()));
      const matchesRating = v.rating >= minRating;
      const matchesVeg = !onlyVeg || v.cuisineType.some(c => c.toLowerCase().includes('veg'));
      const matchesFavorites = !showOnlyFavorites || favorites.includes(v._id);
      return matchesSearch && matchesCategory && matchesRating && matchesVeg && matchesFavorites;
    })
    .sort((a, b) => {
      // Prioritize Favorites in the "Recommended" (default) view
      if (sortBy === 'default') {
        const isAFav = (favorites || []).includes(a._id?.toString());
        const isBFav = (favorites || []).includes(b._id?.toString());
        if (isAFav && !isBFav) return -1;
        if (!isAFav && isBFav) return 1;
      }
      
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'time') return (a.deliveryTime || 30) - (b.deliveryTime || 30);
      if (sortBy === 'popularity') return (b.totalOrders || 0) - (a.totalOrders || 0);
      return 0;
    });
  
  const clearFilters = () => {
    setSelectedCategory(null);
    setMinRating(0);
    setOnlyVeg(false);
    setShowOnlyFavorites(false);
    setSortBy('default');
    setSearch('');
  };

  const handleGetLocation = () => {
    console.log("Location detection triggered...");

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAddress(`LPU (Detected)`);
        setLocating(false);
        toast.success('Location detected!');
      },
      (error) => {
        setLocating(false);
        toast.error('Location error: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const RestaurantCard = ({ vendor }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={`relative bg-white rounded-3xl overflow-hidden premium-shadow border border-gray-100/50 group transition-all duration-300 ${!vendor.isOpen ? 'grayscale-[0.8] opacity-75' : ''}`}
    >
      <Link to={`/student/restaurant/${vendor._id}`} className="block">
        <div className="relative h-52 overflow-hidden bg-slate-50">
          {vendor.shopImage ? (
            <img 
              src={vendor.shopImage} 
              alt={vendor.shopName} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&h=500&auto=format&fit=crop'; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl opacity-40">🏪</div>
          )}
          
          {/* Offer Badge - Swiggy Style */}
          <div className="absolute bottom-3 left-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-black tracking-tight shadow-lg uppercase">
            Flat ₹100 OFF
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-sm border ${
              vendor.isOpen ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-rose-500/90 text-white border-rose-400'
            }`}>
              {vendor.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={(e) => toggleFav(e, vendor._id)} 
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md hover:bg-white transition-all z-10"
          >
            <FiHeart className={`text-xl ${favorites.includes(vendor._id) ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`} />
          </motion.button>
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="text-xl font-black text-slate-800 leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {vendor.shopName}
            </h3>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white font-black text-xs shrink-0 ${
              vendor.rating >= 4 ? 'bg-emerald-600' : 'bg-amber-500'
            }`}>
              <FiStar className="fill-current" /> {vendor.rating.toFixed(1)}
            </div>
          </div>
          
          <p className="text-slate-500 text-sm font-medium mb-4 line-clamp-1">{vendor.cuisineType.join(', ')}</p>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-1.5"><FiClock className="text-primary" /> 25-35 MIN</div>
            <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
            <div className="flex items-center gap-1.5"><FiTruck className="text-primary" /> {vendor.location}</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      <LiveOrderTracker />
      
      {/* Header & Search Section */}
      <div className="bg-white px-4 pt-12 pb-6 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            onClick={handleGetLocation}
            className="flex items-center gap-2 mb-8 text-primary cursor-pointer hover:opacity-80 transition-opacity"
          >
            <FiMapPin className={`text-2xl ${locating ? 'animate-bounce' : ''}`} />
            <div>
              <div className="flex items-center gap-1 font-black text-slate-800 tracking-tighter">
                {locating ? 'Locating...' : address} <FiChevronRight />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Detect My Location</p>
            </div>
          </motion.div>

          <h1 className="text-4xl max-sm:text-3xl font-black text-slate-900 mb-8 tracking-tighter leading-none">
            Hungry? Let&apos;s fix that <span className="text-primary">instantly.</span>
          </h1>

          <div className="relative group">
            <input 
              type="text" 
              placeholder="Search for restaurants or dishes..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white outline-none font-bold text-slate-700 transition-all shadow-inner" 
            />
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl group-focus-within:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Horizontal Categories - "What's on your mind?" */}
      <div className="px-4 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">What&apos;s on your mind?</h2>
          </div>
          
          <div className="flex gap-8 overflow-x-auto no-scrollbar py-8 -mx-4 px-4">
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
                className="flex flex-col items-center gap-3 shrink-0"
              >
                <div className={`w-24 h-24 rounded-full overflow-hidden p-1.5 transition-all duration-300 ${
                  selectedCategory === cat.label ? 'ring-4 ring-primary ring-offset-2' : 'hover:shadow-xl hover:scale-110'
                } ${cat.color}`}>
                  <img 
                    src={cat.icon} 
                    alt={cat.label} 
                    className="w-full h-full object-cover rounded-full mix-blend-multiply" 
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&h=200&auto=format&fit=crop'; }}
                  />
                </div>
                <span className={`text-xs font-black tracking-tight ${selectedCategory === cat.label ? 'text-primary' : 'text-slate-600'}`}>
                  {cat.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 py-4 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          
          {/* STATIC SORT BUTTON (Outside overflow to prevent clipping) */}
          <div className="relative shrink-0">
            <button 
              onClick={() => setIsSortOpen(!isSortOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all ${
                sortBy !== 'default' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Sort <FiChevronRight className={`transition-transform duration-300 ${isSortOpen ? '-rotate-90' : 'rotate-90'}`} />
            </button>

            <AnimatePresence>
              {isSortOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setIsSortOpen(false)}
                    className="fixed inset-0 z-40 bg-black/5"
                  />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-3 z-50 origin-top-left overflow-hidden ring-8 ring-black/5"
                  >
                    {[
                      { id: 'default', label: 'Recommended', icon: <FiFilter /> },
                      { id: 'rating', label: 'Ratings: High to Low', icon: <FiStar /> },
                      { id: 'time', label: 'Delivery Time', icon: <FiClock /> },
                      { id: 'popularity', label: 'Popularity', icon: <FiZap /> }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setIsSortOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-xs font-bold transition-all mb-1 last:mb-0 ${
                          sortBy === opt.id ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                           <span className={sortBy === opt.id ? 'text-primary' : 'text-slate-400'}>{opt.icon}</span>
                           {opt.label}
                        </div>
                        {/* Radio Selector Visual */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          sortBy === opt.id ? 'border-primary' : 'border-slate-200'
                        }`}>
                          {sortBy === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Separator Line */}
          <div className="h-6 w-[1px] bg-slate-200 shrink-0" />

          {/* SCROLLABLE FILTERS */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar relative flex-1">
            <button 
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${
                showOnlyFavorites ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Favorites <FiHeart className={showOnlyFavorites ? 'fill-current' : ''} />
            </button>

            <button 
              onClick={() => setMinRating(minRating === 4 ? 0 : 4)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${
                minRating === 4 ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Ratings 4.0+ {minRating === 4 && <FiCheck />}
            </button>

            <button 
              onClick={() => setOnlyVeg(!onlyVeg)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${
                onlyVeg ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Pure Veg {onlyVeg && <FiCheck />}
            </button>

            <button 
              onClick={() => setSortBy(sortBy === 'time' ? 'default' : 'time')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${
                sortBy === 'time' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              Fast Delivery <FiZap className="text-amber-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Vendor Grid */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-black text-slate-900 mb-8 tracking-tight">
          {search || selectedCategory ? `Results for "${search || selectedCategory}"` : 'Top Restaurants for you'}
        </h2>

        {loading ? (
          <SkeletonLoader count={8} />
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            <AnimatePresence>
              {filteredVendors.map((vendor) => (
                <RestaurantCard key={vendor._id} vendor={vendor} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {filteredVendors.length === 0 && !loading && (
          <div className="text-center py-24 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100 mt-8">
            <div className="text-6xl mb-6">🏜️</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No restaurants match those filters</h3>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-4">Try resetting your filters to explore more campus spots</p>
            <button 
              onClick={() => { setSearch(''); setSelectedCategory(null); setMinRating(0); setOnlyVeg(false); setSortBy('default'); }}
              className="mt-8 px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      <CartFloatingButton />
    </div>
  );
};

export default StudentHome;
