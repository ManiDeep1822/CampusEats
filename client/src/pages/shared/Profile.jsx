import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { motion } from 'framer-motion';
import { FiLock, FiShield, FiUser, FiMail, FiPhone, FiMapPin, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff, FiCreditCard, FiPlusCircle, FiX, FiArrowRight } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { setCredentials } from '../../store/authSlice';

const Profile = () => {
    const { user, token, role } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [loading, setLoading] = useState(false);
    const [walletAmount, setWalletAmount] = useState('');
    const [walletLoading, setWalletLoading] = useState(false);
    const [walletBalance, setWalletBalance] = useState(user?.walletBalance || 0);

    // Forgot password modal state
    const [forgotModal, setForgotModal] = useState(false);
    const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=otp, 3=newpass
    const [forgotEmail, setForgotEmail] = useState(user?.email || '');
    const [forgotOtp, setForgotOtp] = useState('');
    const [forgotNewPass, setForgotNewPass] = useState('');
    const [forgotConfirmPass, setForgotConfirmPass] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);

    // Helper: load Razorpay script and wait for it to be ready
    const loadRazorpay = () => new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const existing = document.getElementById('razorpay-script');
        if (existing) {
            existing.onload = () => resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.id = 'razorpay-script';
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });

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

    const strengthLabels = [
        { key: 'length', label: '8+ Characters' },
        { key: 'upper', label: 'Uppercase Letter' },
        { key: 'lower', label: 'Lowercase Letter' },
        { key: 'number', label: 'Includes Number' },
        { key: 'special', label: 'Special Character (@$!%*?&)' }
    ];

    const openForgotModal = () => {
        setForgotStep(1);
        setForgotEmail(user?.email || '');
        setForgotOtp('');
        setForgotNewPass('');
        setForgotConfirmPass('');
        setForgotModal(true);
    };

    const handleSendResetOTP = async () => {
        if (!forgotEmail) return toast.error('Please enter your email address');
        setForgotLoading(true);
        try {
            await api.post('/auth/forgot-password', { email: forgotEmail });
            toast.success('Reset code sent! Check your email.');
            setForgotStep(2);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send reset code');
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
            await api.post('/auth/reset-password', { email: forgotEmail, otp: forgotOtp, newPassword: forgotNewPass });
            toast.success('Password reset successfully! Please use your new password.');
            setForgotModal(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reset failed. Please try again.');
        } finally {
            setForgotLoading(false);
        }
    };

    const handleTopUp = async (presetAmount) => {
        const topupAmount = Number(presetAmount || walletAmount);
        if (!topupAmount || topupAmount < 10) return toast.error('Minimum top-up is ₹10');
        setWalletLoading(true);
        try {
            // Ensure Razorpay SDK is loaded before proceeding
            const isLoaded = await loadRazorpay();
            if (!isLoaded) {
                toast.error('Payment gateway failed to load. Please check your internet connection.');
                setWalletLoading(false);
                return;
            }

            // Step 1: Create Razorpay order on backend
            const { data: initData } = await api.post('/payment/wallet/initiate', { amount: topupAmount });

            // Step 2: Open Razorpay payment gateway
            const options = {
                key: initData.keyId,
                amount: initData.amount,
                currency: initData.currency,
                name: 'CampusEats',
                description: `Campus Wallet Top-Up — ₹${topupAmount}`,
                order_id: initData.razorpayOrderId,
                handler: async (response) => {
                    try {
                        const { data: verifyData } = await api.post('/payment/wallet/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            requestedAmount: topupAmount,
                        });
                        setWalletBalance(verifyData.walletBalance);
                        setWalletAmount('');
                        dispatch(setCredentials({ user: { ...user, walletBalance: verifyData.walletBalance }, token, role }));
                        toast.success(verifyData.message);
                    } catch (err) {
                        toast.error(err.response?.data?.message || 'Payment verification failed');
                    }
                },
                prefill: { name: user?.name, email: user?.email, contact: user?.phone || '' },
                theme: { color: '#F97316' },
                modal: { ondismiss: () => toast('Top-up cancelled', { icon: 'ℹ️' }) }
            };
            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', (resp) => toast.error(resp.error.description || 'Payment failed'));
            rzp.open();
            setWalletLoading(false);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to initiate top-up. Please try again.');
            setWalletLoading(false);
        }
    };

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
                    <div className="text-center md:text-left">
                        <h1 className="text-3xl font-heading font-extrabold text-textPrimary mb-1">{user?.name}</h1>
                        <p className="text-primary font-bold uppercase tracking-widest text-xs mb-4">{user?.role} Account</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <span className="flex items-center gap-2 text-textSecondary text-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/50">
                                <FiMail className="text-primary" /> {user?.email}
                            </span>
                            {user?.phone && (
                                <span className="flex items-center gap-2 text-textSecondary text-sm bg-white/50 px-3 py-1.5 rounded-full border border-white/50">
                                    <FiPhone className="text-primary" /> {user?.phone}
                                </span>
                            )}
                            {user?.campusId && (
                                <span className="flex items-center gap-2 text-textSecondary text-sm bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                                    <FiCheckCircle className="text-accent" /> Campus ID: {user?.campusId}
                                </span>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Campus Wallet Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="glass p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none"
                >
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <FiCreditCard size={20} />
                                </div>
                                <span className="font-bold uppercase tracking-widest text-xs text-orange-100">Campus Wallet</span>
                            </div>
                            <div className="text-4xl font-extrabold mt-2">₹{walletBalance.toFixed(2)}</div>
                            <p className="text-orange-100 text-sm mt-1">Available balance</p>
                        </div>
                        <div className="w-full md:w-auto">
                            <p className="text-orange-100 text-xs font-bold uppercase tracking-wider mb-3">Quick Add</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {[50, 100, 200, 500].map(amt => (
                                    <button
                                        key={amt}
                                        onClick={() => handleTopUp(amt)}
                                        disabled={walletLoading}
                                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-sm transition disabled:opacity-50"
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    max="10000"
                                    placeholder="Custom amount"
                                    value={walletAmount}
                                    onChange={(e) => setWalletAmount(e.target.value)}
                                    className="flex-1 px-4 py-2.5 bg-white/20 placeholder-orange-200 text-white rounded-xl outline-none focus:bg-white/30 text-sm font-medium min-w-0"
                                />
                                <button
                                    onClick={() => handleTopUp()}
                                    disabled={walletLoading || !walletAmount}
                                    className="px-4 py-2.5 bg-white text-orange-600 font-bold rounded-xl text-sm hover:bg-orange-50 transition disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                                >
                                    <FiPlusCircle size={16} />
                                    {walletLoading ? 'Adding...' : 'Add'}
                                </button>
                            </div>
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
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                <FiShield size={24} />
                            </div>
                            <h2 className="text-xl font-bold text-textPrimary">Security Settings</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Current Password</label>
                                <div className="relative">
                                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type={showCurrent ? "text" : "password"}
                                        name="currentPassword"
                                        value={formData.currentPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowCurrent(!showCurrent)} 
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
                                    >
                                        {showCurrent ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type={showNew ? "text" : "password"}
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowNew(!showNew)} 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
                                        >
                                            {showNew ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Confirm New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input 
                                            type={showConfirm ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            className="w-full pl-12 pr-12 py-3.5 rounded-2xl border border-gray-100 bg-white/50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => setShowConfirm(!showConfirm)} 
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition"
                                        >
                                            {showConfirm ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-orange-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                            <div className="text-center mt-2">
                                <button
                                    type="button"
                                    onClick={openForgotModal}
                                    className="text-sm text-primary font-bold hover:underline"
                                >
                                    Forgot current password? Reset via email
                                </button>
                            </div>
                        </form>
                    </motion.div>

                    {/* Password Strength Card */}
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="glass p-6 rounded-[2rem] shadow-xl shadow-slate-200/50 bg-slate-900 text-white border-none"
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
                        <div className="mt-8 p-4 bg-white/10 rounded-2xl border border-white/10">
                            <div className="flex items-start gap-3">
                                <FiAlertCircle className="text-primary shrink-0 mt-0.5" />
                                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                                    For your security, your session will remain active after changing your password.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ─────── Forgot Password Modal ─────── */}
            {forgotModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setForgotModal(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={e => e.stopPropagation()}
                        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg relative overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-8 pt-7 pb-4 border-b border-gray-100">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-0.5">CampusEats</p>
                                <h2 className="text-lg font-black text-gray-900 leading-tight">Forgot Password</h2>
                            </div>
                            <button
                                onClick={() => setForgotModal(false)}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition shrink-0"
                            >
                                <FiX size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="px-8 py-6">
                        {/* Step indicator */}
                        <div className="flex items-center gap-2 mb-6">
                            {[1,2,3].map(s => (
                                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${forgotStep >= s ? 'bg-primary' : 'bg-gray-200'}`} />
                            ))}
                        </div>

                        {/* Step 1: Email */}
                        {forgotStep === 1 && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xl font-extrabold text-textPrimary">Reset Password</h3>
                                    <p className="text-sm text-textSecondary mt-1">We'll send a 6-digit code to your email address.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                                    <div className="relative">
                                        <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={e => setForgotEmail(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                            placeholder="your@email.com"
                                        />
                                    </div>
                                </div>
                                <button onClick={handleSendResetOTP} disabled={forgotLoading} className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    {forgotLoading ? 'Sending...' : <><span>Send Reset Code</span><FiArrowRight /></>}
                                </button>
                            </div>
                        )}

                        {/* Step 2: OTP */}
                        {forgotStep === 2 && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xl font-extrabold text-textPrimary">Enter Verification Code</h3>
                                    <p className="text-sm text-textSecondary mt-1">Check your email at <strong>{forgotEmail}</strong> for the 6-digit code.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">6-Digit Code</label>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={forgotOtp}
                                        onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                                        className="w-full text-center text-3xl font-black tracking-[1rem] py-4 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all bg-gray-50"
                                        placeholder="──────"
                                    />
                                </div>
                                <button onClick={() => setForgotStep(3)} disabled={forgotOtp.length !== 6} className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                    <span>Verify Code</span><FiArrowRight />
                                </button>
                                <button onClick={handleSendResetOTP} disabled={forgotLoading} className="w-full text-center text-sm text-primary font-bold hover:underline mt-1">
                                    {forgotLoading ? 'Resending...' : 'Resend Code'}
                                </button>
                            </div>
                        )}

                        {/* Step 3: New Password */}
                        {forgotStep === 3 && (
                            <div className="space-y-5">
                                <div>
                                    <h3 className="text-xl font-extrabold text-textPrimary">Set New Password</h3>
                                    <p className="text-sm text-textSecondary mt-1">Choose a strong new password for your account.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            value={forgotNewPass}
                                            onChange={e => setForgotNewPass(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                            placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                                    <div className="relative">
                                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="password"
                                            value={forgotConfirmPass}
                                            onChange={e => setForgotConfirmPass(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <button onClick={handleResetPassword} disabled={forgotLoading || !forgotNewPass || !forgotConfirmPass} className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition disabled:opacity-50">
                                    {forgotLoading ? 'Resetting...' : '✓ Reset Password'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Profile;
