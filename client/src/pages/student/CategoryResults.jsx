import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiStar, FiClock, FiTruck, FiHeart, FiFilter, FiCheck, FiZap } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

const CategoryResults = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryVendorIds, setCategoryVendorIds] = useState([]);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [sortBy, setSortBy] = useState('default');
  const [isSortOpen, setIsSortOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchEverything = async () => {
      setLoading(true);
      try {
        // Fetch vendors and favorites in parallel, but handle search separately for resilience
        const [vendorsRes, favsRes] = await Promise.all([
          api.get('/student/vendors').catch(() => ({ data: [] })),
          api.get('/student/favorites').catch(() => ({ data: [] }))
        ]);

        setVendors(Array.isArray(vendorsRes.data) ? vendorsRes.data : []);
        setFavorites((favsRes.data || []).map(f => (f._id || f).toString()));

        // Fetch search results for the category items
        try {
          const searchRes = await api.get(`/student/search?query=${encodeURIComponent(categoryId)}`);
          const searchItems = Array.isArray(searchRes.data?.items) ? searchRes.data.items : [];
          const itemVendorIds = [...new Set(searchItems.map(item => item.vendorId?._id || item.vendorId))];
          setCategoryVendorIds(itemVendorIds.filter(Boolean));
        } catch (searchError) {
          console.warn("Search fetch failed for category, falling back to cuisine matching only.", searchError);
          setCategoryVendorIds([]);
        }

      } catch (error) {
        console.error("Critical fetch failed:", error);
        toast.error("Could not load your food mood. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchEverything();
  }, [categoryId]);

  const toggleFav = async (e, vendorId) => {
    e.preventDefault(); 
    const vendorIdStr = vendorId.toString();
    const isCurrentlyFav = favorites.includes(vendorIdStr);
    const oldFavs = [...favorites];
    
    setFavorites(isCurrentlyFav ? favorites.filter(id => id !== vendorIdStr) : [...favorites, vendorIdStr]);

    try {
      const { data } = await api.put(`/student/favorites/${vendorId}`);
      setFavorites((data?.favorites || []).map(id => id.toString()));
      toast.success(isCurrentlyFav ? "Removed from Favorites" : "Saved to Favorites");
    } catch(err) { 
      setFavorites(oldFavs);
      toast.error("Cloud sync failed. Favorited status rolled back."); 
    }
  };

  const filteredVendors = vendors
    .filter(v => {
      const isCuisineMatch = (v?.cuisineType || []).some(c => c.toLowerCase().includes(categoryId.toLowerCase()));
      const isItemMatch = categoryVendorIds.some(id => id?.toString() === (v?._id || v?.id)?.toString());
      if (!isCuisineMatch && !isItemMatch) return false;

      if ((v?.rating || 0) < minRating) return false;
      if (onlyVeg && !(v?.cuisineType || []).some(c => c.toLowerCase().includes('veg'))) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'default') {
        const isAFav = favorites.includes(a._id?.toString());
        const isBFav = favorites.includes(b._id?.toString());
        if (isAFav && !isBFav) return -1;
        if (!isAFav && isBFav) return 1;
      }
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'time') return (a.deliveryTime || 30) - (b.deliveryTime || 30);
      if (sortBy === 'popularity') return (b.totalOrders || 0) - (a.totalOrders || 0);
      return 0;
    });

  const RestaurantCard = ({ vendor }) => (
    <motion.div 
      layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={`relative bg-white rounded-3xl overflow-hidden premium-shadow border border-gray-100/50 group transition-all duration-300 ${!vendor.isOpen ? 'grayscale-[0.8] opacity-75' : ''}`}
    >
      <Link to={`/student/restaurant/${vendor._id}`} className="block">
        <div className="relative h-52 overflow-hidden bg-slate-50">
          {vendor.shopImage ? (
            <img 
              src={vendor.shopImage} alt={vendor.shopName} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&h=500&auto=format&fit=crop'; }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-4xl opacity-40">🏪</div>
          )}
          
          <div className="absolute top-3 left-3">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase backdrop-blur-md shadow-sm border ${vendor.isOpen ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-rose-500/90 text-white border-rose-400'}`}>
              {vendor.isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>

          <button 
            onClick={(e) => toggleFav(e, vendor._id)} 
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-md hover:bg-white transition-all z-10 hover:scale-110 active:scale-90"
          >
            <FiHeart className={`text-xl ${favorites.includes(vendor._id?.toString()) ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex justify-between items-start gap-2 mb-2">
            <h3 className="text-xl font-black text-slate-800 leading-tight line-clamp-1 group-hover:text-primary transition-colors">{vendor.shopName}</h3>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white font-black text-xs shrink-0 ${vendor.rating >= 4 ? 'bg-emerald-600' : 'bg-amber-500'}`}>
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
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* Dynamic App Bar */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
           <button onClick={() => navigate('/student/home')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-3 md:mb-4 bg-slate-100 hover:bg-slate-200 w-max px-3 py-1.5 rounded-lg text-sm font-bold">
              <FiArrowLeft /> Home
           </button>
           <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter capitalize leading-none">
              Top spots for <span className="text-primary">{categoryId}</span>
           </h1>
           <p className="text-slate-500 text-sm font-bold mt-2">Explore the best {categoryId} from reliable Campus vendors.</p>
        </div>

        {/* Filters specific to Category */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
           <div className="flex items-center gap-3 w-full">
              {/* SORT Toggle */}
              <div className="relative shrink-0">
                  <button 
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all ${sortBy !== 'default' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}
                  >
                    Sort <FiFilter className={`transition-transform duration-300 ${isSortOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isSortOpen && (
                      <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSortOpen(false)} className="fixed inset-0 z-40 bg-black/5" />
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute left-0 mt-3 w-64 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-3 z-50 origin-top-left overflow-hidden ring-8 ring-black/5">
                          {[
                            { id: 'default', label: 'Recommended', icon: <FiFilter /> },
                            { id: 'rating', label: 'Ratings: High to Low', icon: <FiStar /> },
                            { id: 'time', label: 'Delivery Time', icon: <FiClock /> },
                            { id: 'popularity', label: 'Popularity', icon: <FiZap /> }
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => { setSortBy(opt.id); setIsSortOpen(false); }}
                              className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl text-xs font-bold transition-all mb-1 last:mb-0 ${sortBy === opt.id ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              <div className="flex items-center gap-3"><span className={sortBy === opt.id ? 'text-primary' : 'text-slate-400'}>{opt.icon}</span>{opt.label}</div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${sortBy === opt.id ? 'border-primary' : 'border-slate-200'}`}>
                                {sortBy === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
              </div>
              
              <div className="h-6 w-[1px] bg-slate-300 shrink-0" />

              <div className="flex gap-3 overflow-x-auto no-scrollbar relative flex-1">
                 <button onClick={() => setMinRating(minRating === 4 ? 0 : 4)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${minRating === 4 ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    Ratings 4.0+ {minRating === 4 && <FiCheck />}
                 </button>
                 <button onClick={() => setOnlyVeg(!onlyVeg)} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black tracking-tight transition-all shrink-0 ${onlyVeg ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                    Pure Veg {onlyVeg && <FiCheck />}
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Main Grid Floor */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {loading ? (
          <SkeletonLoader count={4} />
        ) : (
          <div className="space-y-10">
             {filteredVendors.length > 0 ? (
               <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
                 <AnimatePresence>
                   {filteredVendors.map((vendor) => (
                     <RestaurantCard key={vendor._id} vendor={vendor} />
                   ))}
                 </AnimatePresence>
               </motion.div>
             ) : (
               <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 mt-8 shadow-sm">
                 <div className="text-6xl mb-6 grayscale opacity-60">🍕</div>
                 <h3 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">No spots found for this category</h3>
                 <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest px-4">There are currently no active vendors selling {categoryId}.</p>
                 <button 
                   onClick={() => navigate('/student/home')}
                   className="mt-8 px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
                 >
                   Explore Other Food
                 </button>
               </div>
             )}
          </div>
        )}
      </div>

    </div>
  );
};

export default CategoryResults;
