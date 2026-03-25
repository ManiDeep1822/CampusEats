import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/shared/Navbar';
import ProtectedRoute from './components/shared/ProtectedRoute';
import GlobalNotificationListener from './components/shared/GlobalNotificationListener';
import CampusEatsAI from './components/shared/CampusEatsAI';
import PageLoader from './components/shared/PageLoader';

// Lazy load pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ContactUs = lazy(() => import('./pages/shared/ContactUs'));

// Student Pages
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const RestaurantPage = lazy(() => import('./pages/student/RestaurantPage'));
const CartPage = lazy(() => import('./pages/student/CartPage'));
const CheckoutPage = lazy(() => import('./pages/student/CheckoutPage'));
const OrderTracking = lazy(() => import('./pages/student/OrderTracking'));
const MyOrders = lazy(() => import('./pages/student/MyOrders'));

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

function App() {
  return (
    <div className="min-h-screen bg-background text-textPrimary font-sans">
        <Toaster position="top-center" />
        <GlobalNotificationListener />
        <Navbar />
        <CampusEatsAI />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/contact" element={<ContactUs />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student/home" element={<StudentHome />} />
              <Route path="/student/restaurant/:id" element={<RestaurantPage />} />
              <Route path="/student/cart" element={<CartPage />} />
              <Route path="/student/checkout" element={<CheckoutPage />} />
              <Route path="/student/tracking/:id" element={<OrderTracking />} />
              <Route path="/student/orders" element={<MyOrders />} />
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
            </Route>
          </Routes>
        </Suspense>
    </div>
  );
}

export default App;
