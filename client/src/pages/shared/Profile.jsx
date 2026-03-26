import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiShield, FiUser, FiMail, FiPhone, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiX, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Profile = () => {
    const { user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [formData, setFormData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [strength, setStrength] = useState({
        length: false,
        upper: false,
        lower: false,
        number: false,
        special: false
    });

    // Forgot password modal state
    const [forgotModal, setForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); 
    const [forgotEmail, setForgotEmail] = useState(user?.email || '');
    const [forgotNewPass, setForgotNewPass] = useState('');
    const [forgotConfirmPass, setForgotConfirmPass] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    const validatePassword = (pass) => {
        setStrength({
            length: pass.length >= 8,
            upper: /[A-Z]/.test(pass),
            lower: /[a-z]/.test(pass),
            number: /\d/.test(pass),
            special: /[@$!%*?&]/.test(pass)
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        if (name === 'newPassword') validatePassword(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            return toast.error('Passwords do not match');
        }
        const isStrong = Object.values(strength).every(Boolean);
        if (!isStrong) {
            return toast.error('Please meet all password strength requirements');
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });
            toast.success('Password updated successfully!');
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setStrength({ length: false, upper: false, lower: false, number: false, special: false });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const openForgotModal = () => {
        setForgotStep(1);
        setForgotEmail(user?.email || '');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotModal(true);
    };

    const handleVerifyEmail = async () => {
        if (!forgotEmail) return toast.error('Please enter your email address');
        setForgotLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail }); 
            setForgotStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Email not found or error occurred');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (forgotNewPass !== forgotConfirmPass) return toast.error('Passwords do not match');
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(forgotNewPass)) return toast.error('Password must be 8+ chars with uppercase, lowercase, number, and special character');
        
        setForgotLoading(true);
        try {
            await api.post('/auth/reset-password-direct', { email: forgotEmail, newPassword: forgotNewPass });
            toast.success('Password updated successfully!');
            setForgotModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset failed');
        } finally {
            setForgotLoading(false);
        }
    };

    const strengthLabels = [
        { key: 'length', label: '8+ Characters' },
        { key: 'upper', label: 'Uppercase Letter' },
        { key: 'lower', label: 'Lowercase Letter' },
        { key: 'number', label: 'Includes Number' },
        { key: 'special', label: 'Special Character (@$!%*?&)' }
    ];

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-xl shadow-slate-200/50"
                >
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-1 flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        {user?.profilePic ? (
                            <img src={user.profilePic} alt="profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <FiUser size={48} />
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-3xl font-heading font-extrabold text-textPrimary mb-1">{user?.name}</h1>
                        <p className="text-primary font-bold uppercase tracking-widest text-xs mb-4">{user?.role} Account</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="flex items-center gap-2 text-textSecondary text-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/50">
                                <FiMail className="text-primary" /> {user?.email}
                            </span>
                            {user?.phone && (
                                <span className="flex items-center gap-2 text-textSecondary text-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/50">
                                    <FiPhone className="text-primary" /> {user.phone}
                                </span>
                            )}
                            {user?.campusId && (
                                <span className="flex items-center gap-2 text-textSecondary text-sm bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20 font-bold">
                                    <FiCheckCircle className="text-accent" /> Campus ID: {user.campusId}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Security Settings */}
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="md:col-span-2 glass p-8 rounded-[2rem] shadow-xl shadow-slate-200/50"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                    <FiShield size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-textPrimary">Security Settings</h2>
                            </div>
                            <button 
                                onClick={openForgotModal}
                                className="text-primary text-sm font-bold hover:underline underline-offset-4"
                            >
                                Forgot Password?
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                                <div className="relative group/input">
                                    <input 
                                        type={showCurrent ? "text" : "password"}
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-slate-900 shadow-sm"
                                        placeholder="••••••••"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowCurrent(!showCurrent)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                    >
                                        {showCurrent ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                    <div className="relative group/input">
                                        <input 
                                            type={showNew ? "text" : "password"}
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-slate-900 shadow-sm"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowNew(!showNew)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                        >
                                            {showNew ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm Password</label>
                                    <div className="relative group/input">
                                        <input 
                                            type={showConfirm ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary outline-none transition-all duration-300 text-slate-900 shadow-sm"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowConfirm(!showConfirm)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
                                        >
                                            {showConfirm ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary text-white font-bold py-3.5 mt-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95 h-fit"
                                >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>Update Password <FiArrowRight className="text-white/70" /></>
                                )}
                            </button>
                        </form>
                    </motion.div>

                    {/* Password Strength Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 bg-slate-900 text-white border-none h-fit"
                    >
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <FiShield className="text-primary" /> Strength Guide
                        </h3>
                        <div className="space-y-4">
                            {strengthLabels.map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-3">
                                    {strength[key] ? (
                                        <FiCheckCircle className="text-accent shrink-0" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-white/20 shrink-0" />
                                    )}
                                    <span className={`text-sm ${strength[key] ? 'text-white font-medium' : 'text-gray-400'}`}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ─────── Forgot Password Modal (REGISTRATION FORM STYLE) ─────── */}
            <AnimatePresence>
                {forgotModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setForgotModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="max-w-lg w-full bg-white rounded-xl shadow-2xl p-8 relative overflow-hidden"
                        >
                            <button
                                onClick={() => setForgotModal(false)}
                                className="absolute right-6 top-6 text-gray-400 hover:text-primary transition"
                            >
                                <FiX size={24} />
                            </button>

                            <h2 className="text-3xl font-heading font-bold text-center text-textPrimary mb-2">Reset Password</h2>
                            <p className="text-center text-textSecondary mb-8 text-sm">
                                Follow the steps below to secure your account.
                            </p>

                            <div className="flex justify-center items-center gap-2 mb-8">
                                <div className={`h-1.5 w-16 rounded-full transition-all ${forgotStep >= 1 ? 'bg-primary' : 'bg-gray-200'}`} />
                                <div className={`h-1.5 w-16 rounded-full transition-all ${forgotStep >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
                            </div>

                            {/* Step 1: Email */}
                            {forgotStep === 1 && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">AUTHORIZED EMAIL</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={e => setForgotEmail(e.target.value)}
                                            required
                                            className="w-full px-4 py-3.5 text-lg rounded-lg border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary/20 outline-none transition-all duration-500 text-slate-900 font-black tracking-tight shadow-inner"
                                            placeholder="name@university.edu"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleVerifyEmail} 
                                        disabled={forgotLoading} 
                                        className="w-full bg-primary text-white font-bold py-3.5 mt-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                                    >
                                        {forgotLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>Continue <FiArrowRight /></>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Step 2: New Password */}
                            {forgotStep === 2 && (
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">NEW PRIMARY SECRET</label>
                                        <input
                                            type="password"
                                            value={forgotNewPass}
                                            onChange={e => setForgotNewPass(e.target.value)}
                                            required
                                            className="w-full px-4 py-3.5 text-lg rounded-lg border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary/20 outline-none transition-all duration-500 text-slate-900 font-black shadow-inner"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">CONFIRM SECRET</label>
                                        <input
                                            type="password"
                                            value={forgotConfirmPass}
                                            onChange={e => setForgotConfirmPass(e.target.value)}
                                            required
                                            className="w-full px-4 py-3.5 text-lg rounded-lg border-2 border-slate-50 bg-slate-50/50 focus:bg-white focus:border-primary/20 outline-none transition-all duration-500 text-slate-900 font-black shadow-inner"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    <button 
                                        onClick={handleResetPassword} 
                                        disabled={forgotLoading || !forgotNewPass} 
                                        className="w-full bg-primary text-white font-bold py-3.5 mt-2 rounded-lg hover:bg-orange-600 transition disabled:opacity-70 flex justify-center items-center gap-2 shadow-lg shadow-orange-500/20 active:scale-95"
                                    >
                                        {forgotLoading ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>Reset Password <FiCheckCircle /></>
                                        )}
                                    </button>
                                    
                                    <button 
                                        onClick={() => setForgotStep(1)} 
                                        className="w-full text-center text-sm text-gray-500 hover:text-primary transition font-medium"
                                    >
                                        Back to Email
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
