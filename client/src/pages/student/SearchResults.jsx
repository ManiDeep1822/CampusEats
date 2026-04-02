import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiSearch, FiStar, FiClock, FiTruck, FiPackage, FiHeart } from 'react-icons/fi';
import api from '../../services/api';
import SkeletonLoader from '../../components/shared/SkeletonLoader';

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const query = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(query);
  const [results, setResults] = useState({ vendors: [], items: [], query: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('restaurants'); // 'restaurants' | 'dishes'

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/student/search?query=${encodeURIComponent(query)}`);
        setResults(data);
        // Auto-switch to dishes tab if no vendors found but items exist
        if (data.vendors.length === 0 && data.items.length > 0) setActiveTab('dishes');
        else setActiveTab('restaurants');
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!localQuery.trim()) return;
    setSearchParams({ q: localQuery.trim() });
  };

  const totalResults = results.vendors.length + results.items.length;

  // Deduplicate items — group by vendor
  const itemsByVendor = results.items.reduce((acc, item) => {
    const vid = item.vendorId?._id;
    if (!vid) return acc;
    if (!acc[vid]) acc[vid] = { vendor: item.vendorId, items: [] };
    acc[vid].items.push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <form onSubmit={handleSearch} className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/student/home')}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
          >
            <FiArrowLeft size={20} />
          </button>

          <div className="flex-1 relative">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
            <input
              ref={inputRef}
              type="text"
              value={localQuery}
              onChange={e => setLocalQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
              placeholder="Restaurant, dish, or cuisine..."
              className="w-full pl-11 pr-5 py-3.5 rounded-2xl bg-slate-100 border-2 border-transparent focus:border-primary/30 focus:bg-white outline-none font-bold text-slate-800 text-sm transition-all"
            />
            {localQuery && (
              <button
                type="button"
                onClick={() => { setLocalQuery(''); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-black text-lg"
              >×</button>
            )}
          </div>
        </form>

        {/* Results count + Tabs */}
        {!loading && query && totalResults > 0 && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-3">
              {totalResults} results for "{query}"
            </span>
            {[
              { id: 'restaurants', label: `Restaurants`, count: results.vendors.length },
              { id: 'dishes', label: `Dishes`, count: results.items.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all border ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <SkeletonLoader count={4} />
        ) : !query ? (
          // Empty prompt state
          <div className="text-center py-24">
            <div className="text-6xl mb-5 opacity-30">🔍</div>
            <h3 className="text-xl font-black text-slate-700 mb-2">What are you craving?</h3>
            <p className="text-slate-400 font-bold text-sm">Search for a restaurant, dish, or cuisine above</p>
          </div>
        ) : totalResults === 0 ? (
          // Zero results state
          <div className="text-center py-24">
            <div className="text-6xl mb-6">😕</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">Nothing found for "{query}"</h3>
            <p className="text-slate-400 font-bold text-sm mb-8">Try a different name or browse categories</p>
            <button
              onClick={() => navigate('/student/home')}
              className="px-8 py-3 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              Back to Home
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* RESTAURANTS TAB */}
            {activeTab === 'restaurants' && (
              <motion.div key="restaurants" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {results.vendors.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="text-5xl mb-4 opacity-40">🏪</div>
                    <p className="font-black text-slate-600">No restaurants match "{query}"</p>
                    <button onClick={() => setActiveTab('dishes')} className="mt-4 text-primary font-black text-sm underline">
                      See {results.items.length} matching dishes →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1 mb-4">
                      {results.vendors.length} Restaurants
                    </h2>
                    {results.vendors.map(vendor => (
                      <motion.div
                        key={vendor._id}
                        layout
                        whileHover={{ x: 4 }}
                        className={`bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer group ${!vendor.isOpen ? 'opacity-60 grayscale-[0.5]' : ''}`}
                        onClick={() => navigate(`/student/restaurant/${vendor._id}`)}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {vendor.shopImage ? (
                              <img
                                src={vendor.shopImage}
                                alt={vendor.shopName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=200&h=200&auto=format&fit=crop'; }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl opacity-30">🏪</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="text-base font-black text-slate-900 truncate group-hover:text-primary transition-colors">{vendor.shopName}</h3>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-white font-black text-xs shrink-0 ${vendor.rating >= 4 ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                                <FiStar className="fill-current" size={10} /> {(vendor.rating || 0).toFixed(1)}
                              </div>
                            </div>
                            <p className="text-slate-500 text-xs font-medium mb-3 truncate">
                              {(vendor.cuisineType || []).join(' • ')}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1">
                                <FiClock className="text-primary" size={10} /> 25-35 MIN
                              </span>
                              <span className="w-1 h-1 bg-slate-200 rounded-full" />
                              <span className="flex items-center gap-1">
                                <FiTruck className="text-primary" size={10} /> {vendor.location}
                              </span>
                              <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${vendor.isOpen ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-400'}`}>
                                {vendor.isOpen ? 'OPEN' : 'CLOSED'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* DISHES TAB */}
            {activeTab === 'dishes' && (
              <motion.div key="dishes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {results.items.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="text-5xl mb-4 opacity-40">🍽️</div>
                    <p className="font-black text-slate-600">No dishes match "{query}"</p>
                    <button onClick={() => setActiveTab('restaurants')} className="mt-4 text-primary font-black text-sm underline">
                      See {results.vendors.length} matching restaurants →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">
                      {results.items.length} Dishes across {Object.keys(itemsByVendor).length} restaurants
                    </h2>
                    {Object.values(itemsByVendor).map(({ vendor, items }) => (
                      <div key={vendor._id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                        {/* Vendor Header */}
                        <Link
                          to={`/student/restaurant/${vendor._id}`}
                          className="flex items-center gap-3 px-5 py-4 border-b border-slate-50 hover:bg-slate-50 transition-colors group"
                        >
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                            {vendor.shopImage ? (
                              <img src={vendor.shopImage} alt={vendor.shopName} className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=100&auto=format&fit=crop'; }} />
                            ) : <div className="w-full h-full flex items-center justify-center text-xl opacity-30">🏪</div>}
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-slate-800 text-sm group-hover:text-primary transition-colors">{vendor.shopName}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{items.length} matching {items.length === 1 ? 'dish' : 'dishes'}</p>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-white font-black text-[10px] ${vendor.rating >= 4 ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                            <FiStar className="fill-current" size={9} /> {(vendor.rating || 0).toFixed(1)}
                          </div>
                        </Link>
                        {/* Items list */}
                        <div className="divide-y divide-slate-50">
                          {items.map(item => (
                            <Link
                              key={item._id}
                              to={`/student/restaurant/${vendor._id}`}
                              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
                            >
                              <div className={`w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center ${item.isVeg ? 'border-emerald-500' : 'border-rose-500'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 text-sm truncate group-hover:text-primary transition-colors">{item.name}</p>
                                {item.description && <p className="text-slate-400 text-xs font-medium line-clamp-1">{item.description}</p>}
                              </div>
                              <div className="shrink-0 flex items-center gap-3">
                                <span className="font-black text-slate-900 text-sm">₹{item.price}</span>
                                <FiPackage className="text-slate-200 group-hover:text-primary transition-colors" size={18} />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
