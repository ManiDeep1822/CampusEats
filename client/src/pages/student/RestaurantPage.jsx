import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FiStar, FiClock, FiPlus, FiMinus, FiHeart } from 'react-icons/fi';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import toast from 'react-hot-toast';

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
      } catch(e) {}
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
      <div className="bg-slate-900 text-white pb-10 pt-8 px-4">
        <div className="max-w-4xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold mb-2 flex items-center gap-4">
              {vendor.shopName}
              <button onClick={toggleFav} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition cursor-pointer">
                <FiHeart className={`text-2xl ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
            </h1>
            <p className="text-gray-300 mb-4">{vendor.cuisineType.join(', ')} • {vendor.location}</p>
            <div className="flex items-center space-x-6">
              <span className="flex items-center"><FiStar className="mr-1 text-accent"/> {vendor.rating.toFixed(1)} ({vendor.numReviews || 0} Reviews)</span>
              <span className="flex items-center"><FiClock className="mr-1"/> 20-30 mins</span>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto mt-8 px-4">
        <h2 className="text-2xl font-bold font-heading mb-6">Menu</h2>
        <div className="space-y-6">
          {menu.map((item) => (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={item._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-colors">
              <div className="flex-1 pr-4">
                <div className={`w-4 h-4 rounded-sm border mb-2 flex items-center justify-center ${item.isVeg ? 'border-accent' : 'border-red-500'}`}><div className={`w-2 h-2 rounded-full ${item.isVeg ? 'bg-accent' : 'bg-red-500'}`}></div></div>
                <h3 className="text-lg font-bold text-textPrimary">{item.name}</h3>
                <p className="text-sm text-textSecondary mb-2">{item.description}</p>
                <div className="font-medium text-textPrimary">₹{item.price}</div>
              </div>
              <div className="w-32 flex flex-col items-center">
                <div className="w-full h-24 bg-gray-50 rounded-lg mb-2 overflow-hidden border border-gray-100 flex items-center justify-center p-1">{item.image ? <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain rounded"/> : <div className="text-2xl opacity-30">🍲</div>}</div>
                {getQuantity(item._id) === 0 ? (
                  <button onClick={() => handleAddToCart(item)} disabled={item.isAvailable === false} className={`w-full py-1.5 px-4 bg-white border font-bold rounded shadow-sm text-sm uppercase transition ${item.isAvailable !== false ? 'border-primary text-primary hover:bg-orange-50' : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50'}`}>
                    {item.isAvailable !== false ? 'Add' : 'Out of Stock'}
                  </button>
                ) : (
                  <div className="flex items-center justify-between w-full bg-white border border-primary rounded shadow-sm px-2 py-1.5">
                    <button onClick={() => handleRemove(item._id)} className="text-gray-600 hover:text-primary"><FiMinus/></button>
                    <span className="font-bold text-primary text-sm">{getQuantity(item._id)}</span>
                    <button onClick={() => handleAddToCart(item)} disabled={item.isAvailable === false} className="text-gray-600 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"><FiPlus/></button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {menu.length === 0 && <div className="text-center text-gray-500 py-10">No items available currently.</div>}
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
    </div>
  );
};
export default RestaurantPage;
