import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/authSlice';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  deleteNotifications 
} from '../../store/notificationSlice';
import { FiShoppingCart, FiUser, FiBell, FiCheck, FiTrash2 } from 'react-icons/fi';

const Navbar = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { totalItems } = useSelector((state) => state.cart);
  const { items: notifications, unreadCount } = useSelector((state) => state.notification);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const getDashboardLink = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'student') return '/student/home';
    if (user?.role === 'vendor') return '/vendor/dashboard';
    if (user?.role === 'delivery') return '/delivery/dashboard';
    return '/';
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to={isAuthenticated ? getDashboardLink() : '/'} className="flex items-center space-x-2 group">
            <span className="text-2xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 group-hover:from-orange-500 group-hover:to-rose-400 transition-all">CampusEats</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link to="/contact" className="text-textPrimary hover:text-primary font-bold transition-colors hidden sm:block text-sm">Contact</Link>
            {user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="text-primary hover:text-orange-600 font-bold transition-colors text-sm bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">🛡️ Admin Panel</Link>
            )}



            {!isAuthenticated ? (
              <>
                <Link to="/login" className="text-textPrimary hover:text-primary font-bold transition-colors">Login</Link>
                <Link to="/register" className="bg-primary text-white px-5 py-2 rounded-xl font-bold hover:bg-orange-600 transition-all hover:shadow-lg hover:shadow-orange-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95">Sign Up</Link>
              </>
            ) : (
              <>
                {user.role === 'student' && (
                  <Link to="/student/cart" className="relative p-2 text-textPrimary hover:text-primary hover:scale-110 active:scale-95 transition-all">
                    <FiShoppingCart size={24} />
                    {totalItems > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-accent rounded-full">
                        {totalItems}
                      </span>
                    )}
                  </Link>
                )}
                
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => {
                       setIsNotifOpen(!isNotifOpen);
                       setIsProfileOpen(false);
                    }}
                    className={`p-2 transition-all text-xl focus:outline-none rounded-full ${isNotifOpen ? 'bg-orange-100 text-primary scale-110' : 'text-textPrimary hover:text-primary hover:scale-110 active:scale-95'}`}
                  >
                    <FiBell />
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <div className={`absolute right-0 w-80 mt-2 bg-white rounded-xl shadow-2xl transition-all duration-300 transform origin-top-right border border-gray-100 overflow-hidden z-50 ${isNotifOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
                      <span className="font-bold text-gray-700">Notifications</span>
                      <div className="flex gap-3">
                        {unreadCount > 0 && (
                          <button onClick={(e) => { e.preventDefault(); dispatch(markAllNotificationsRead()); }} className="text-xs text-primary font-bold hover:underline">Mark all read</button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={(e) => { e.preventDefault(); dispatch(deleteNotifications()); }} className="text-gray-400 hover:text-red-500 transition-colors" title="Clear All"><FiTrash2 size={14} /></button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-gray-500 py-6 text-sm">No notifications yet.</p>
                      ) : (
                         notifications.map((notif) => (
                           <div 
                             key={notif._id} 
                             onClick={() => {
                               if (!notif.isRead) dispatch(markNotificationRead(notif._id));
                               setIsNotifOpen(false);
                               if (notif.orderId) {
                                  if (user?.role === 'student') navigate(`/student/tracking/${notif.orderId}`);
                                  else if (user?.role === 'vendor') navigate('/vendor/orders');
                               }
                             }}
                             className={`cursor-pointer px-4 py-3 border-b border-gray-50 flex justify-between items-start gap-3 transition ${!notif.isRead ? 'bg-orange-50/30 hover:bg-orange-100/50' : 'bg-white hover:bg-gray-50'}`}
                           >
                             <div className="flex-1">
                               <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{notif.message}</p>
                               <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                             {!notif.isRead && (
                               <button onClick={(e) => { e.stopPropagation(); dispatch(markNotificationRead(notif._id)); }} className="text-primary hover:text-orange-600 mt-1 bg-orange-100/50 p-1 rounded-full hover:bg-orange-200 transition"><FiCheck size={12} /></button>
                             )}
                           </div>
                         ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="relative" ref={profileRef}>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotifOpen(false);
                    }}
                    className="flex items-center space-x-2 text-textPrimary hover:text-primary focus:outline-none transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr flex items-center justify-center overflow-hidden transition-all text-primary ${isProfileOpen ? 'from-orange-200 to-rose-200 border-2 border-primary shadow-md scale-105' : 'from-orange-100 to-rose-100 border border-orange-200 shadow-sm hover:shadow-md'}`}>
                      {user?.profilePic ? <img src={user.profilePic} alt="profile" className="object-cover w-full h-full" /> : <FiUser size={18} />}
                    </div>
                    <span className="hidden md:block font-bold">{user?.name}</span>
                  </button>
                  <div className={`absolute right-0 w-48 mt-2 py-2 bg-white rounded-md shadow-xl transition-all duration-300 transform origin-top-right ${isProfileOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <Link onClick={() => setIsProfileOpen(false)} to={getDashboardLink()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Dashboard</Link>
                    {user?.role === 'student' && (
                      <Link onClick={() => setIsProfileOpen(false)} to="/student/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium border-b border-gray-100">My Orders</Link>
                    )}
                    <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-bold transition-colors">Logout</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
