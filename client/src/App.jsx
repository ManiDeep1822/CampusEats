import React, { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle } from 'react-icons/fi';
import { logout } from './store/authSlice';
import SwipeableToaster from './components/shared/SwipeableToaster';
import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import GlobalNotificationListener from './components/shared/GlobalNotificationListener';
import CampusEatsAI from './components/shared/CampusEatsAI';
import PageLoader from './components/shared/PageLoader';
import MandatoryPhoneModal from './components/shared/MandatoryPhoneModal';

const SessionTerminatedModal = () => {
  const { isSessionTerminated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleClose = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AnimatePresence>
      {isSessionTerminated && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center border border-orange-100"
          >
            <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertCircle size={40} />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Logged in Elsewhere</h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Your session has ended because you logged in from another device. 
              <br/><br/>
              To continue using CampusEats here, please log in again.
            </p>

            <button 
              onClick={handleClose}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/30 active:scale-95"
            >
              Okay, I understand
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ContactUs = lazy(() => import('./pages/shared/ContactUs'));
const Profile = lazy(() => import('./pages/shared/Profile'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const MandatoryPasswordChange = lazy(() => import('./pages/shared/MandatoryPasswordChange'));
const TermsConditions = lazy(() => import('./pages/shared/TermsConditions'));
const PrivacyPolicy = lazy(() => import('./pages/shared/PrivacyPolicy'));
const CancelRefundPolicy = lazy(() => import('./pages/shared/CancelRefundPolicy'));

// Student Pages
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const RestaurantPage = lazy(() => import('./pages/student/RestaurantPage'));
const CartPage = lazy(() => import('./pages/student/CartPage'));
const OrderTracking = lazy(() => import('./pages/student/OrderTracking'));
const MyOrders = lazy(() => import('./pages/student/MyOrders'));
const StudentOffers = lazy(() => import('./pages/student/StudentOffers'));
const CategoryResults = lazy(() => import('./pages/student/CategoryResults'));


// Vendor Pages
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const OrderManagement = lazy(() => import('./pages/vendor/OrderManagement'));
const MenuManagement = lazy(() => import('./pages/vendor/MenuManagement'));
const VendorKDS = lazy(() => import('./pages/vendor/VendorKDS'));

// Delivery Pages
const DeliveryDashboard = lazy(() => import('./pages/delivery/DeliveryDashboard'));
const ActiveDelivery = lazy(() => import('./pages/delivery/ActiveDelivery'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManageVendors = lazy(() => import('./pages/admin/ManageVendors'));
const ManageRiders = lazy(() => import('./pages/admin/ManageRiders'));
const ManageFeedback = lazy(() => import('./pages/admin/ManageFeedback'));
const ManageCoupons = lazy(() => import('./pages/admin/ManageCoupons'));

function App() {
  const location = useLocation();
  const hideActionBarRoutes = ['/vendor/kds'];
  const shouldHideNavbar = hideActionBarRoutes.includes(location.pathname) || location.pathname === '/complete-setup';
  
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated && user?.mustChangePassword && location.pathname !== '/complete-setup') {
      navigate('/complete-setup', { replace: true });
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans">
        <SwipeableToaster />
        <GlobalNotificationListener />
        <SessionTerminatedModal />
        <MandatoryPhoneModal />
        {!shouldHideNavbar && <Navbar />}
        <CampusEatsAI />


        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<ContactUs />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/complete-setup" element={<MandatoryPasswordChange />} />
            <Route path="/terms" element={<TermsConditions />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/refund-policy" element={<CancelRefundPolicy />} />
            
            {/* Shared Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student', 'vendor', 'delivery', 'admin']} />}>
              <Route path="/profile" element={<Profile />} />
            </Route>
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student/home" element={<StudentHome />} />
              <Route path="/student/restaurant/:id" element={<RestaurantPage />} />
              <Route path="/student/cart" element={<CartPage />} />
              <Route path="/student/tracking/:id" element={<OrderTracking />} />
              <Route path="/student/orders" element={<MyOrders />} />
              <Route path="/student/offers" element={<StudentOffers />} />
              <Route path="/student/category/:categoryId" element={<CategoryResults />} />

            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['vendor']} />}>
              <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              <Route path="/vendor/orders" element={<OrderManagement />} />
              <Route path="/vendor/menu" element={<MenuManagement />} />
              <Route path="/vendor/kds" element={<VendorKDS />} />
            </Route>
            
            <Route element={<ProtectedRoute allowedRoles={['delivery']} />}>
              <Route path="/delivery/dashboard" element={<DeliveryDashboard />} />
              <Route path="/delivery/active" element={<ActiveDelivery />} />
            </Route>
    
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<ManageUsers />} />
              <Route path="/admin/vendors" element={<ManageVendors />} />
              <Route path="/admin/riders" element={<ManageRiders />} />
              <Route path="/admin/feedback" element={<ManageFeedback />} />
              <Route path="/admin/coupons" element={<ManageCoupons />} />
            </Route>
          </Routes>
        </Suspense>
    </div>
  );
}

export default App;
