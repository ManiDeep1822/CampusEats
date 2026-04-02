import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FiStar, FiClock, FiPlus, FiMinus, FiHeart } from 'react-icons/fi';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import toast from 'react-hot-toast';
import CartFloatingButton from '../../components/student/CartFloatingButton';


const RestaurantPage = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const currentVendorId = useSelector(state => state.cart.vendorId);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const { data } = await api.get(`/student/vendors/${id}`);
        setVendor(data.vendor);
        setMenu(data.menu);
      } catch (error) { toast.error('Failed to load restaurant details'); } finally { setLoading(false); }
    };
    const fetchFavs = async () => {
      try {
        const { data } = await api.get('/student/favorites');
        setIsFavorite(data.some(f => (f._id || f) === id));
      } catch(e) { console.error('Failed to fetch favorites', e); }
    }
    fetchRestaurant();
    fetchFavs();
  }, [id]);

  const toggleFav = async () => {
    try {
      const { data } = await api.put(`/student/favorites/${id}`);
      setIsFavorite(data.favorites.includes(id));
      toast.success(data.favorites.includes(id) ? "Saved to favorites!" : "Removed from favorites");
    } catch(err) { toast.error("Failed to update favorites"); }
  };

  const submitReviewHandler = async (e) => {
    e.preventDefault();
    if (rating === 0 || comment.trim() === '') {
      toast.error('Please select a rating and write a comment');
      return;
    }
    const toastId = toast.loading('Submitting review...');
    try {
      await api.post(`/student/vendors/${id}/reviews`, { rating, comment });
      toast.success('Review submitted successfully', { id: toastId });
      setRating(0);
      setComment('');
      // Refresh the vendor to show new review
      const { data } = await api.get(`/student/vendors/${id}`);
      setVendor(data.vendor);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review', { id: toastId });
    }
  };

  const handleAddToCart = (item) => {
    if (currentVendorId && currentVendorId !== vendor._id) {
      if(!window.confirm('Your cart contains items from another restaurant. Do you want to discard them and add this item?')) return;
    }
    dispatch(addToCart({ menuItemId: item._id, vendorId: vendor._id, name: item.name, price: item.price, isVeg: item.isVeg }));
    toast.success('Added to Cart');
  };

  const handleRemove = (itemId) => dispatch(removeFromCart(itemId));
  const getQuantity = (itemId) => cartItems.find(i => i.menuItemId === itemId)?.quantity || 0;

  if (loading) return <Loader />;
  if (!vendor) return <div className="text-center py-20">Restaurant not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-slate-900 text-white pb-12 pt-12 px-4 max-sm:pb-8 max-sm:pt-8">
        <div className="max-w-4xl mx-auto flex flex-row items-end justify-between gap-6 max-sm:flex-col max-sm:items-start">
          <div className="w-full">
            <div className="flex items-center justify-start gap-4 mb-4 max-sm:justify-between">
              <h1 className="text-4xl font-heading font-bold tracking-tight max-sm:text-2xl">
                {vendor.shopName}
              </h1>
              <button 
                onClick={toggleFav} 
                className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-all flex items-center justify-center shrink-0"
              >
                <FiHeart className={`text-2xl ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'} max-sm:text-xl`} />
              </button>
            </div>
            <p className="text-gray-400 text-base mb-6 max-sm:text-sm max-sm:mb-4">{vendor.cuisineType.join(', ')} • {vendor.location}</p>
            <div className="flex flex-wrap items-center gap-8 max-sm:gap-4">
              <span className="flex items-center text-base font-medium max-sm:text-sm">
                <FiStar className="mr-2 text-accent fill-accent"/> {vendor.rating.toFixed(1)} 
                <span className="text-gray-500 ml-1 font-normal text-sm max-sm:text-xs">({vendor.numReviews || 0} reviews)</span>
              </span>
              <span className="flex items-center text-base font-medium max-sm:text-sm">
                <FiClock className="mr-2 text-primary"/> 20-30 mins
              </span>
            </div>
          </div>
        </div>
        {!vendor.isOpen && (
          <div className="max-w-4xl mx-auto mt-6 px-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4 text-red-700 shadow-sm backdrop-blur-sm">
              <span className="text-2xl">🚧</span>
              <div>
                <p className="font-bold tracking-tight">Restaurant is Currently Closed</p>
                <p className="text-sm opacity-90">This restaurant is not accepting orders at the moment. You can still browse the menu.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto mt-10 px-4 max-sm:mt-6">
        <div className="flex items-center justify-between mb-8 max-sm:mb-6">
          <h2 className="text-2xl font-bold font-heading text-textPrimary max-sm:text-xl">Menu</h2>
          <div className="h-0.5 flex-1 bg-gray-100 ml-6 max-sm:hidden"></div>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          {menu.map((item) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              key={item._id} 
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-row justify-between items-center gap-4 hover:shadow-md transition-shadow max-sm:flex-col max-sm:items-start max-sm:p-4"
            >
              <div className="flex-1 w-full max-sm:order-2">
                <div className={`w-4 h-4 rounded-sm border mb-2 flex items-center justify-center ${item.isVeg ? 'border-accent' : 'border-red-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-accent' : 'bg-red-500'}`}></div>
                </div>
                <h3 className="text-lg font-bold text-textPrimary mb-1">{item.name}</h3>
                <p className="text-sm text-textSecondary mb-3 line-clamp-2 max-sm:text-xs">{item.description}</p>
                <div className="font-bold text-textPrimary text-lg">₹{item.price}</div>
              </div>
              
              <div className="w-32 flex flex-col items-center justify-center gap-3 max-sm:w-full max-sm:flex-row max-sm:justify-between max-sm:order-1">
                <div className="relative w-full h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center p-1 group shrink-0 max-sm:w-24 max-sm:h-24">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  ) : (
                    <div className="text-3xl opacity-20">🍲</div>
                  )}
                  {item.isAvailable === false && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/80 px-2 py-1 rounded">Out</span>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-[120px] max-sm:flex-1">
                  {getQuantity(item._id) === 0 ? (
                    <button 
                      onClick={() => handleAddToCart(item)} 
                      disabled={item.isAvailable === false || vendor.isOpen === false} 
                      className={`w-full py-2 px-4 border-2 font-bold rounded-xl shadow-sm text-sm uppercase transition-all max-sm:text-xs ${item.isAvailable !== false && vendor.isOpen !== false ? 'border-primary/20 bg-white text-primary hover:bg-primary hover:text-white' : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'}`}
                    >
                      {item.isAvailable === false ? 'Sold Out' : vendor.isOpen === false ? 'Closed' : 'Add'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between w-full bg-primary rounded-xl shadow-md px-1 py-1 transform transition-transform animate-in zoom-in-95 duration-200">
                      <button onClick={() => handleRemove(item._id)} className="p-1 px-2 text-white hover:bg-white/20 rounded-lg transition"><FiMinus size={14}/></button>
                      <span className="font-bold text-white text-sm">{getQuantity(item._id)}</span>
                      <button onClick={() => handleAddToCart(item)} disabled={item.isAvailable === false} className="p-1 px-2 text-white hover:bg-white/20 rounded-lg transition disabled:opacity-30"><FiPlus size={14}/></button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {menu.length === 0 && (
            <div className="text-center text-gray-400 py-16 bg-white rounded-2xl border border-dashed border-gray-200">
              <span className="text-4xl block mb-2">🍽️</span>
              No items available currently.
            </div>
          )}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-4xl mx-auto mt-16 px-4">
        <h2 className="text-2xl font-bold font-heading mb-6">Reviews & Ratings</h2>
        
        {/* Add Review Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-bold mb-4 text-textPrimary">Write a Review</h3>
          <form onSubmit={submitReviewHandler}>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full p-3 border border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none">
                <option value="0">Select Rating...</option>
                <option value="1">1 - Poor</option>
                <option value="2">2 - Fair</option>
                <option value="3">3 - Good</option>
                <option value="4">4 - Very Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Comment</label>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="3" placeholder="Share your experience with this vendor..." className="w-full p-3 border border-gray-300 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none"></textarea>
            </div>
            <button type="submit" className="bg-primary text-white font-bold py-2 px-6 rounded hover:bg-orange-600 transition disabled:opacity-50">Submit Review</button>
          </form>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {(!vendor.reviews || vendor.reviews.length === 0) && (
            <div className="text-center text-gray-500 py-6 bg-white rounded-xl shadow-sm border border-gray-100">No reviews yet. Be the first to review this restaurant!</div>
          )}
          {vendor.reviews && vendor.reviews.map((review) => (
            <div key={review._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-orange-100 text-primary rounded-full flex items-center justify-center font-bold text-lg">
                  {review.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{review.name}</div>
                  <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="ml-auto flex items-center bg-orange-50 text-accent font-bold px-2 py-1 rounded text-sm"><FiStar className="mr-1"/> {review.rating}</div>
              </div>
              <p className="text-gray-600">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>
      <CartFloatingButton />
    </div>
  );
};
export default RestaurantPage;
