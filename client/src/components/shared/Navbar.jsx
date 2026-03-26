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

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const menuRef = useRef(null);
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
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
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
    <nav className="bg-white/90 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-100 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <Link to={isAuthenticated ? getDashboardLink() : '/'} className="flex items-center space-x-2 group shrink-0">
            <span className="text-xl sm:text-2xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400 group-hover:from-orange-500 group-hover:to-rose-400 transition-all">CampusEats</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/contact" className="text-textPrimary hover:text-primary font-bold transition-colors text-sm">Contact</Link>
            {user?.role === 'admin' && (
              <Link to="/admin/dashboard" className="text-primary hover:text-orange-600 font-bold transition-colors text-sm bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">🛡️ Admin Panel</Link>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!isAuthenticated ? (
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link to="/login" className="text-textPrimary hover:text-primary font-bold transition-colors text-sm px-2">Login</Link>
                <Link to="/register" className="bg-primary text-white px-4 sm:px-6 py-2 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-md hover:shadow-orange-500/20 text-sm">Sign Up</Link>
              </div>
            ) : (
              <div className="flex items-center space-x-1 sm:space-x-3">
                {user.role === 'student' && (
                  <Link to="/student/cart" className="relative p-2 text-textPrimary hover:text-primary transition-all">
                    <FiShoppingCart size={22} className="sm:w-6 sm:h-6" />
                    {totalItems > 0 && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-accent rounded-full border-2 border-white">
                        {totalItems}
                      </span>
                    )}
                  </Link>
                )}
                
                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={() => {
                       setIsNotifOpen(!isNotifOpen);
                       setIsProfileOpen(false);
                       setIsMenuOpen(false);
                    }}
                    className={`p-2 transition-all text-xl focus:outline-none rounded-full ${isNotifOpen ? 'bg-orange-100 text-primary scale-105' : 'text-textPrimary hover:text-primary active:scale-95'}`}
                  >
                    <FiBell size={22} className="sm:w-6 sm:h-6" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {/* ... Notification Dropdown Content ... */}
                  <div className={`absolute right-0 w-[280px] sm:w-80 mt-2 bg-white rounded-2xl shadow-2xl transition-all duration-300 transform origin-top-right border border-gray-100 overflow-hidden z-[100] ${isNotifOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <div className="flex justify-between items-center px-4 py-2.5 border-b bg-gray-50/50">
                      <span className="font-bold text-gray-700 text-sm">Notifications</span>
                      <div className="flex gap-2.5 items-center">
                        {unreadCount > 0 && (
                          <button onClick={(e) => { e.preventDefault(); dispatch(markAllNotificationsRead()); }} className="text-[10px] text-primary font-bold hover:underline py-1">Mark all read</button>
                        )}
                        {notifications.length > 0 && (
                          <button onClick={(e) => { e.preventDefault(); dispatch(deleteNotifications()); }} className="text-gray-400 hover:text-red-500 transition-colors p-1" title="Clear All"><FiTrash2 size={13} /></button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 opacity-40">
                          <FiBell size={24} className="mb-2" />
                          <p className="text-center text-xs font-medium">No notifications yet.</p>
                        </div>
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
                             className={`cursor-pointer px-4 py-2.5 border-b border-gray-50 flex justify-between items-start gap-3 transition ${!notif.isRead ? 'bg-orange-50/20 hover:bg-orange-100/40' : 'bg-white hover:bg-gray-50'}`}
                           >
                             <div className="flex-1">
                               <p className={`text-[13px] leading-snug ${!notif.isRead ? 'font-bold text-gray-800' : 'text-gray-500'}`}>{notif.message}</p>
                               <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                             </div>
                             {!notif.isRead && (
                               <button onClick={(e) => { e.stopPropagation(); dispatch(markNotificationRead(notif._id)); }} className="text-primary mt-0.5 bg-orange-100/50 p-1.5 rounded-full hover:bg-orange-200 transition-colors"><FiCheck size={11} /></button>
                             )}
                           </div>
                         ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Toggle (Desktop) */}
                <div className="hidden sm:block relative" ref={profileRef}>
                  <button 
                    onClick={() => {
                      setIsProfileOpen(!isProfileOpen);
                      setIsNotifOpen(false);
                    }}
                    className="flex items-center space-x-2 text-textPrimary hover:text-primary transition-colors focus:outline-none"
                  >
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-tr flex items-center justify-center overflow-hidden transition-all text-primary ${isProfileOpen ? 'from-orange-200 to-rose-200 border-2 border-primary shadow-md scale-105' : 'from-orange-100 to-rose-100 border border-orange-200 shadow-sm'}`}>
                      {user?.profilePic ? <img src={user.profilePic} alt="profile" className="object-cover w-full h-full" /> : <FiUser size={18} />}
                    </div>
                    <span className="hidden lg:block font-bold truncate max-w-[100px]">{user?.name}</span>
                  </button>
                  <div className={`absolute right-0 w-48 mt-2 py-2 bg-white rounded-xl shadow-xl transition-all duration-300 transform origin-top-right border border-gray-100 ${isProfileOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <Link onClick={() => setIsProfileOpen(false)} to={getDashboardLink()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Dashboard</Link>
                    <Link onClick={() => setIsProfileOpen(false)} to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Profile Settings</Link>
                    {user?.role === 'student' && (
                      <Link onClick={() => setIsProfileOpen(false)} to="/student/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium border-b border-gray-100">My Orders</Link>
                    )}
                    <button onClick={() => { setIsProfileOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-bold transition-colors">Logout</button>
                  </div>
                </div>

                {/* Mobile Menu Toggle */}
                <div className="sm:hidden relative" ref={menuRef}>
                  <button 
                    onClick={() => {
                      setIsMenuOpen(!isMenuOpen);
                      setIsNotifOpen(false);
                    }}
                    className={`w-9 h-9 rounded-xl flex flex-col items-center justify-center space-y-1 transition-all ${isMenuOpen ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    <span className={`block w-5 h-0.5 bg-current transition-all ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
                    <span className={`block w-5 h-0.5 bg-current transition-all ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                    <span className={`block w-5 h-0.5 bg-current transition-all ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
                  </button>

                  <div className={`absolute right-0 w-56 mt-2 py-2 bg-white rounded-2xl shadow-2xl transition-all duration-300 transform origin-top-right border border-gray-100 ${isMenuOpen ? 'opacity-100 visible scale-100' : 'opacity-0 invisible scale-95'}`}>
                    <div className="px-4 py-3 border-b border-gray-100 mb-2">
                       <p className="text-xs font-bold text-gray-400 uppercase">User Account</p>
                       <p className="text-sm font-bold text-gray-800 truncate">{user?.name}</p>
                    </div>
                    <Link onClick={() => setIsMenuOpen(false)} to={getDashboardLink()} className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Dashboard</Link>
                    <Link onClick={() => setIsMenuOpen(false)} to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Profile Settings</Link>
                    <Link onClick={() => setIsMenuOpen(false)} to="/contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">Contact Us</Link>
                    {user?.role === 'student' && (
                      <Link onClick={() => setIsMenuOpen(false)} to="/student/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-primary font-medium">My Orders</Link>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <button onClick={() => { setIsMenuOpen(false); handleLogout(); }} className="block w-full text-left px-4 py-2 text-sm text-red-600 font-bold">Logout</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
