import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiUser, FiMail, FiPhone, FiMapPin, FiTrash2, 
  FiPlus, FiLock, FiShield, FiBell, 
  FiArrowRight, FiEye, FiEyeOff, 
  FiSmartphone, FiCamera, FiFileText
} from 'react-icons/fi';
import InstallPWA from '../../components/shared/InstallPWA';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { subscribeToPushNotifications } from '../../utils/pushManager';
import { setCredentials } from '../../store/authSlice';

const Profile = () => {
    const dispatch = useDispatch();
    const { user: initialUser, token, role } = useSelector((state) => state.auth);
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const fileInputRef = useRef(null);
    const contentRef = useRef(null);

    useEffect(() => {
      // Auto-scroll to content on mobile when tab changes
      if (window.innerWidth < 1024) { // Only for mobile/tablet where content is below tabs
        contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, [activeTab]);

    // General Profile Form
    const [profileForm, setProfileForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        emailNotifications: user?.notificationSettings?.email ?? true,
        pushNotifications: user?.notificationSettings?.push ?? false
    });

    // Password Form
    const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });

    // Address Form
    const [showAddAddress, setShowAddAddress] = useState(false);
    const [addressForm, setAddressForm] = useState({ tag: 'Hostel', address: '', isDefault: false });

    useEffect(() => {
      fetchLatestProfile();
    }, []);

    const fetchLatestProfile = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        setProfileForm({
          name: data.name,
          phone: data.phone || '',
          emailNotifications: data.notificationSettings?.email ?? true,
          pushNotifications: data.notificationSettings?.push ?? false
        });
      } catch (err) { console.error('Failed to refresh profile', err); }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.put('/auth/profile', {
                name: profileForm.name,
                phone: profileForm.phone,
                notificationSettings: {
                  email: profileForm.emailNotifications,
                  push: profileForm.pushNotifications
                }
            });
            setUser(data);
            toast.success('Profile updated successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally { setLoading(false); }
    };

    const handleAddressAdd = async (e) => {
      e.preventDefault();
      try {
        const { data } = await api.post('/auth/profile/address', addressForm);
        setUser({ ...user, savedAddresses: data });
        setShowAddAddress(false);
        setAddressForm({ tag: 'Hostel', address: '', isDefault: false });
        toast.success('Address added!');
      } catch (err) { toast.error('Failed to add address'); }
    };

    const handleAddressDelete = async (id) => {
      try {
        const { data } = await api.delete(`/auth/profile/address/${id}`);
        setUser({ ...user, savedAddresses: data });
      } catch (err) { toast.error('Failed to remove'); }
    };

    const handleImageClick = () => {
      fileInputRef.current?.click();
    };

    const handleImageChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) return toast.error('Image must be less than 2MB');

      setUploading(true);
      const toastId = toast.loading('Uploading photo...');
      
      const formData = new FormData();
      formData.append('image', file);

      try {
        // 1. Upload to Cloudinary via our upload route
        const { data: uploadData } = await api.post('/upload', formData);

        const newPhotoUrl = uploadData.imageUrl;

        // 2. Update user profile with new URL
        const { data: userData } = await api.put('/auth/profile', { profilePic: newPhotoUrl });
        
        setUser(userData);
        dispatch(setCredentials({ user: userData, token, role }));
        toast.success('Profile photo updated!', { id: toastId });
      } catch (error) {
        toast.error(error.response?.data?.message || 'Upload failed', { id: toastId });
      } finally {
        setUploading(false);
        e.target.value = null; // Reset input
      }
    };

    const handleImageRemove = async () => {
      if (!window.confirm('Remove profile photo?')) return;
      
      setLoading(true);
      try {
        const { data } = await api.put('/auth/profile', { profilePic: '' });
        setUser(data);
        dispatch(setCredentials({ user: data, token, role }));
        toast.success('Photo removed');
      } catch (err) {
        toast.error('Failed to remove photo');
      } finally {
        setLoading(false);
      }
    };

    const handlePushToggle = async () => {
      if (!profileForm.pushNotifications) {
        // Turning ON
        try {
          const subscription = await subscribeToPushNotifications();
          await api.put('/auth/profile', { 
            notificationSettings: { push: true },
            pushSubscription: subscription
          });
          setProfileForm({ ...profileForm, pushNotifications: true });
          toast.success('Mobile notifications linked!');
        } catch (err) {
          toast.error(err.message || 'Failed to enable notifications');
        }
      } else {
        // Turning OFF
        setProfileForm({ ...profileForm, pushNotifications: false });
        await api.put('/auth/profile', { notificationSettings: { push: false } });
        toast.success('Notifications disabled');
      }
    };

    const handlePassSubmit = async (e) => {
      e.preventDefault();
      if (passForm.new !== passForm.confirm) return toast.error('Passwords mismatch');
      if (passForm.current === passForm.new) return toast.error('New password cannot be the same as your current password');
      
      try {
        await api.put('/auth/change-password', { currentPassword: passForm.current, newPassword: passForm.new });
        toast.success('Password changed!');
        setPassForm({ current: '', new: '', confirm: '' });
      } catch (err) { toast.error(err.response?.data?.message || 'Error updating password'); }
    };

    const tabs = [
      { id: 'general', label: 'General', icon: <FiUser /> },
      { id: 'addresses', label: 'My Addresses', icon: <FiMapPin /> },
      { id: 'security', label: 'Security', icon: <FiLock /> },
      { id: 'legal', label: 'Legal', icon: <FiShield /> }
    ];

    return (
        <div className="min-h-screen bg-background py-12 px-4 mt-16 pb-32">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col lg:flex-row gap-8 items-stretch">
                    
                    {/* Sidebar / Profile Summary */}
                    <div className="lg:w-1/3 space-y-6">
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass p-8 rounded-[2.5rem] shadow-xl text-center h-full">
                             <div className="relative inline-block mb-4">
                                <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-1 shadow-lg mx-auto relative overflow-hidden group">
                                    {user?.profilePic ? (
                                        <img src={user.profilePic} className="w-full h-full object-cover rounded-full" alt="profile" />
                                    ) : (
                                        <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-primary">
                                            <FiUser size={48} />
                                        </div>
                                    )}
                                    {uploading && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full backdrop-blur-[2px]">
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                      </div>
                                    )}
                                </div>
                                    {user?.provider !== 'google' && (
                                      <>
                                        {user?.profilePic && (
                                          <button 
                                            onClick={handleImageRemove}
                                            className="absolute top-1 left-1 bg-white p-2 rounded-full shadow-md text-rose-500 hover:bg-rose-500 hover:text-white transition-all scale-110 active:scale-95 z-20"
                                            title="Remove profile photo"
                                          >
                                            <FiTrash2 size={16} />
                                          </button>
                                        )}
                                        <button 
                                          onClick={handleImageClick}
                                          disabled={uploading}
                                          className="absolute bottom-1 right-1 bg-white p-2 rounded-full shadow-md text-primary hover:bg-primary hover:text-white transition-all scale-110 active:scale-95 z-20"
                                          title="Change profile photo"
                                        >
                                          <FiCamera size={16} />
                                        </button>
                                      </>
                                    )}
                                <input 
                                  type="file" 
                                  ref={fileInputRef} 
                                  onChange={handleImageChange} 
                                  className="hidden" 
                                  accept="image/*"
                                />
                            </div>
                            <h2 className="text-2xl font-black text-textPrimary leading-tight">{user?.name}</h2>
                            <p className="text-primary font-bold text-xs uppercase tracking-widest mt-1 mb-4">{user?.role} Account</p>
                            
                            <div className="flex flex-col gap-2 text-sm text-textSecondary mb-6">
                              <span className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl"><FiMail className="text-primary"/> {user?.email}</span>
                              <span className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl"><FiPhone className="text-primary"/> {user?.phone || 'No phone set'}</span>
                            </div>

                            <div className="flex flex-col gap-3">
                              {tabs.map(tab => (
                                <button
                                  key={tab.id}
                                  onClick={() => setActiveTab(tab.id)}
                                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all duration-300 ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-orange-500/30' : 'bg-white text-textSecondary hover:bg-orange-50 hover:text-primary border border-gray-100'}`}
                                >
                                  <span className="text-lg">{tab.icon}</span> {tab.label}
                                </button>
                              ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Main Content Pane */}
                    <div ref={contentRef} className="lg:w-2/3">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          className="glass p-8 rounded-[3rem] shadow-2xl h-full"
                        >
                          {/* 1. GENERAL TAB */}
                          {activeTab === 'general' && (
                            <div className="space-y-8">
                              <div className="flex items-center gap-3">
                                <FiUser className="text-primary text-2xl" />
                                <h2 className="text-2xl font-black font-heading">General Profile</h2>
                              </div>
                              
                              <form onSubmit={handleProfileUpdate} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                  <input 
                                    value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                                  <input 
                                    value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                                  />
                                </div>
                                <div className="sm:col-span-2 pt-4">
                                  <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:shadow-2xl hover:shadow-slate-500/20 active:scale-95 transition-all">
                                    {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                                  </button>
                                </div>
                              </form>

                              {/* Notifications Sub-section in General */}
                              <div className="pt-8 border-t border-gray-100">
                                <h3 className="text-sm font-black text-textPrimary uppercase tracking-widest mb-6 flex items-center gap-2"><FiBell className="text-primary" /> Notification Settings</h3>
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-gray-50">
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-xl shadow-sm text-primary"><FiMail /></div>
                                      <div><p className="font-bold text-slate-800">Email Updates</p><p className="text-xs text-slate-500">Receipts and order updates via email</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={profileForm.emailNotifications} onChange={e => setProfileForm({...profileForm, emailNotifications: e.target.checked})} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                  </div>

                                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-gray-50">
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-xl shadow-sm text-primary"><FiSmartphone /></div>
                                      <div><p className="font-bold text-slate-800">Mobile Push Notifications</p><p className="text-xs text-slate-500">Instant alerts in your phone notification bar</p></div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={profileForm.pushNotifications} onChange={handlePushToggle} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                    </label>
                                  </div>

                                  {/* PWA Install Promo in Profile */}
                                  <div className="pt-4">
                                    <InstallPWA buttonStyle="profile" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. ADDRESSES TAB */}
                          {activeTab === 'addresses' && (
                            <div className="space-y-8">
                               <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <FiMapPin className="text-primary text-2xl" />
                                  <h2 className="text-2xl font-black font-heading">Saved Addresses</h2>
                                </div>
                                <button onClick={() => setShowAddAddress(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                                  <FiPlus /> Add New
                                </button>
                              </div>

                              <AnimatePresence>
                                {showAddAddress && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                                    <form onSubmit={handleAddressAdd} className="p-6 bg-orange-50 rounded-3xl border border-orange-100 flex flex-col gap-4">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black uppercase text-orange-400 ml-1">Address Label</label>
                                          <select 
                                            value={addressForm.tag} onChange={e => setAddressForm({...addressForm, tag: e.target.value})}
                                            className="w-full px-4 py-3 bg-white border-none rounded-xl outline-none font-bold text-sm"
                                          >
                                            <option>Hostel</option><option>Office</option><option>Other</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-black uppercase text-orange-400 ml-1">Detail (e.g. Block B, Room 101)</label>
                                          <input 
                                            placeholder="Enter address details..."
                                            value={addressForm.address} onChange={e => setAddressForm({...addressForm, address: e.target.value})}
                                            className="w-full px-4 py-3 bg-white border-none rounded-xl outline-none font-bold text-sm"
                                            required
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-orange-800">
                                          <input type="checkbox" checked={addressForm.isDefault} onChange={e => setAddressForm({...addressForm, isDefault: e.target.checked})} className="w-4 h-4 rounded-md border-orange-300 text-orange-500 focus:ring-orange-500" />
                                          Set as Default
                                        </label>
                                        <div className="flex gap-2">
                                          <button type="button" onClick={() => setShowAddAddress(false)} className="px-5 py-2 text-sm font-bold text-orange-400">Cancel</button>
                                          <button type="submit" className="px-5 py-2 bg-orange-500 text-white font-bold rounded-xl text-sm shadow-md">Add Address</button>
                                        </div>
                                      </div>
                                    </form>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <div className="space-y-4">
                                {user?.savedAddresses?.length === 0 ? (
                                  <div className="text-center py-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                    <FiMapPin className="text-4xl text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 font-bold">No saved addresses yet</p>
                                  </div>
                                ) : (
                                  user?.savedAddresses?.map((addr) => (
                                    <div key={addr._id} className="p-5 flex items-center justify-between bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                                      <div className="flex items-center gap-4">
                                        <div className="p-4 bg-orange-50 rounded-2xl text-primary">
                                          <FiMapPin size={24} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <p className="font-black text-slate-800 uppercase tracking-tighter">{addr.tag}</p>
                                            {addr.isDefault && <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">DEFAULT</span>}
                                          </div>
                                          <p className="text-sm text-slate-500 font-medium line-clamp-1">{addr.address}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleAddressDelete(addr._id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Delete"><FiTrash2 size={20}/></button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}

                          {/* tabs ends */}

                          {/* 4. SECURITY TAB */}
                          {activeTab === 'security' && (
                            <div className="space-y-10">
                              <div className="flex items-center gap-3">
                                <FiLock className="text-primary text-2xl" />
                                <h2 className="text-2xl font-black font-heading">Security & Password</h2>
                              </div>

                              <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-2xl -mr-16 -mt-16"></div>
                                <div className="relative z-10 flex items-center justify-between">
                                  <div className="space-y-1">
                                    <h4 className="text-primary font-black uppercase text-[10px] tracking-[0.2em]">Current Security Level</h4>
                                    <p className="text-2xl font-black">Robust Protection</p>
                                  </div>
                                  <FiShield className="text-primary text-5xl opacity-40" />
                                </div>
                              </div>

                              {user?.provider === 'google' ? (
                                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center space-y-6">
                                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                  </div>
                                  <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-800">Managed by Google</h3>
                                    <p className="text-slate-500 font-medium max-w-sm">
                                      Your security settings, including your password, are managed by Google. 
                                      Changes made to your Google account will reflect here.
                                    </p>
                                  </div>
                                  <a 
                                    href="https://myaccount.google.com/security" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
                                  >
                                    Manage Google Account <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                  </a>
                                </div>
                              ) : (
                                <form onSubmit={handlePassSubmit} className="space-y-6">
                                  <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <div className="relative">
                                      <input 
                                        type={showPass.current ? "text" : "password"} 
                                        value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold pr-14" placeholder="••••••••" required 
                                      />
                                      <button type="button" onClick={() => setShowPass({...showPass, current: !showPass.current})} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showPass.current ? <FiEyeOff size={20}/> : <FiEye size={20}/>}</button>
                                    </div>
                                    <div className="flex justify-end pr-2">
                                      <Link to="/forgot-password" state={{ email: user?.email }} className="text-primary hover:underline text-xs font-bold">
                                        Forgot current password?
                                      </Link>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                                      <div className="relative">
                                        <input 
                                          type={showPass.new ? "text" : "password"} 
                                          value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})}
                                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold pr-14" placeholder="••••••••" required 
                                        />
                                        <button type="button" onClick={() => setShowPass({...showPass, new: !showPass.new})} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showPass.new ? <FiEyeOff size={20}/> : <FiEye size={20}/>}</button>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                      <div className="relative">
                                        <input 
                                          type={showPass.confirm ? "text" : "password"} 
                                          value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                                          className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl outline-none font-bold pr-14" placeholder="••••••••" required 
                                        />
                                        <button type="button" onClick={() => setShowPass({...showPass, confirm: !showPass.confirm})} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">{showPass.confirm ? <FiEyeOff size={20}/> : <FiEye size={20}/>}</button>
                                      </div>
                                    </div>
                                  </div>

                                  <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-slate-500/20 active:scale-95 transition-all outline-none">
                                    Update Secure Password
                                  </button>
                                </form>
                              )}
                            </div>
                          )}
                            {/* 5. LEGAL TAB */}
                            {activeTab === 'legal' && (
                              <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                  <FiShield className="text-primary text-2xl" />
                                  <h2 className="text-2xl font-black font-heading">Legal & Policies</h2>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                  <Link to="/terms" className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-gray-50 hover:bg-orange-50 hover:border-orange-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-2xl shadow-sm text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <FiFileText size={20} />
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800">Terms & Conditions</p>
                                        <p className="text-xs text-slate-500">Service rules and user agreement</p>
                                      </div>
                                    </div>
                                    <FiArrowRight className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                  </Link>

                                  <Link to="/privacy" className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-gray-50 hover:bg-orange-50 hover:border-orange-100 transition-all group">
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-white rounded-2xl shadow-sm text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <FiShield size={20} />
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800">Privacy Policy</p>
                                        <p className="text-xs text-slate-500">How we handle your data</p>
                                      </div>
                                    </div>
                                    <FiArrowRight className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                  </Link>

                                  <div className="p-8 mt-4 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                                    <div className="text-primary font-black tracking-[0.2em] text-[10px] uppercase">CampusEats v1.2.0</div>
                                    <p className="text-slate-500 text-xs font-bold leading-relaxed max-w-xs mx-auto">
                                      Designed and built for the modern campus experience. 
                                      All transactions are secured with end-to-end encryption.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
