import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiClock, FiStar, FiHeart } from 'react-icons/fi';
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
  const [filterMode, setFilterMode] = useState('all');

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const { data } = await api.get('/student/vendors');
        setVendors(data);
      } catch (error) {
        console.error(error);
      } finally {
        // Add a tiny artificial delay to appreciate the beautiful skeleton loaders!
        setTimeout(() => setLoading(false), 800);
      }
    };
    const fetchFavs = async () => {
      try {
        const { data } = await api.get('/student/favorites');
        setFavorites(data.map(f => f._id || f));
      } catch(e) { console.error('Failed to fetch favs', e); }
    };
    fetchVendors();
    fetchFavs();
  }, []);

  const toggleFav = async (e, vendorId) => {
    e.preventDefault(); 
    try {
      const { data } = await api.put(`/student/favorites/${vendorId}`);
      setFavorites(data.favorites);
      toast.success(data.favorites.includes(vendorId) ? "Saved to Favorites" : "Removed from Favorites");
    } catch(err) { toast.error("Failed to update favorites"); }
  };

  const filteredVendors = vendors.filter(v => {
    const matchesSearch = v.shopName.toLowerCase().includes(search.toLowerCase()) || 
                          v.cuisineType.join(',').toLowerCase().includes(search.toLowerCase());
    if (filterMode === 'favorites') return matchesSearch && favorites.includes(v._id);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20 mt-[1rem]">
      <LiveOrderTracker />
      <div className="relative pt-16 pb-24 px-4 overflow-hidden border-b border-gray-100">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-rose-50 -z-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply blur-3xl animate-blob pointer-events-none opacity-50"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-5xl lg:text-6xl max-sm:text-3xl font-heading font-extrabold text-textPrimary mb-8 tracking-tight px-2">
            What are you <span className="text-gradient">craving?</span>
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative max-w-2xl mx-auto px-2">
            <input 
              type="text" 
              placeholder="Restaurants, cuisines, or dishes..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full pl-14 pr-6 py-5 max-sm:pl-12 max-sm:pr-4 max-sm:py-4 rounded-2xl shadow-xl shadow-slate-200/50 border border-white/50 bg-white/90 backdrop-blur-md focus:bg-white focus:ring-4 focus:ring-orange-500/20 outline-none text-lg max-sm:text-base transition-all" 
            />
            <FiSearch className="absolute left-5 max-sm:left-4 top-1/2 transform -translate-y-1/2 text-primary text-2xl max-sm:text-xl" />
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 relative z-20">
        
        {/* View Toggle Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterMode('all')} 
            className={`px-6 py-2.5 rounded-full text-base font-extrabold shadow-sm transition-all duration-300 ${filterMode === 'all' ? 'bg-primary text-white scale-105' : 'bg-white text-gray-500 hover:bg-orange-50'}`}
          >
            All Campus Spots
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setFilterMode('favorites')} 
            className={`px-6 py-2.5 rounded-full text-base font-extrabold shadow-sm transition-all duration-300 flex items-center gap-2 ${filterMode === 'favorites' ? 'bg-rose-500 text-white scale-105 shadow-rose-200' : 'bg-white text-gray-500 hover:bg-rose-50'}`}
          >
            <FiHeart className={filterMode === 'favorites' ? 'fill-white text-white' : 'text-rose-400'} /> 
            My Favorites
          </motion.button>
        </div>

        {loading ? (
          <SkeletonLoader count={8} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredVendors.map((vendor, idx) => (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
                key={vendor._id} 
                className={`bg-white rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border border-gray-100 group ${!vendor.isOpen ? 'grayscale-[0.8] opacity-75' : ''}`}
              >
                <Link to={`/student/restaurant/${vendor._id}`} className="block relative">
                  <div className="h-48 bg-slate-50 relative overflow-hidden border-b border-gray-100 flex items-center justify-center p-2">
                    {vendor.shopImage ? (
                      <img src={vendor.shopImage} alt={vendor.shopName} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500 rounded-lg shadow-sm" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-105 transition-transform duration-500"><span className="text-5xl">🏪</span></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                      {vendor.isOpen ? (
                        <span className="bg-white/90 backdrop-blur-sm text-accent px-3 py-1 rounded-full text-[10px] font-bold shadow-sm tracking-wider uppercase">OPEN</span>
                      ) : (
                        <span className="bg-white/90 backdrop-blur-sm text-red-500 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm tracking-wider uppercase">CLOSED</span>
                      )}
                    </div>
                    
                    <motion.button 
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => toggleFav(e, vendor._id)} 
                      className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm hover:scale-110 hover:bg-white transition-all z-10"
                    >
                      <FiHeart className={`text-xl ${favorites.includes(vendor._id) ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}`} />
                    </motion.button>
                  </div>
                  
                  <div className="p-6 relative bg-white min-h-[160px]">
                    <div className="flex justify-between items-start gap-2 mb-3 h-16">
                      <h2 className="text-2xl font-bold font-heading text-textPrimary group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-1">
                        {vendor.shopName}
                      </h2>
                      <div className="flex items-center bg-orange-50 px-2.5 py-1 rounded-lg text-primary font-bold text-sm border border-orange-100 shrink-0">
                        <FiStar className="mr-1 fill-primary" /> {vendor.rating.toFixed(1)}
                      </div>
                    </div>
                    <p className="text-textSecondary text-sm mb-4 line-clamp-1 h-5">{vendor.cuisineType.join(', ')}</p>
                    <div className="flex items-center text-textSecondary text-sm"><FiClock className="mr-2 shrink-0" /> 20-30 min • {vendor.location}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
        {filteredVendors.length === 0 && (
          <div className="text-center py-24 bg-white/50 backdrop-blur-md rounded-3xl border border-gray-100 shadow-sm mt-8 max-sm:mx-4">
            <span className="text-6xl mb-4 block">{filterMode === 'favorites' ? '💔' : '🍽️'}</span>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              {filterMode === 'favorites' ? 'No favorites yet' : 'No restaurants found'}
            </h3>
            <p className="text-gray-500 max-sm:text-sm max-sm:px-4">
              {filterMode === 'favorites' ? 'Click the heart icon on any restaurant to save it here.' : 'Try adjusting your search filters.'}
            </p>
          </div>
        )}
      </div>
      <CartFloatingButton />
    </div>
  );
};
export default StudentHome;
