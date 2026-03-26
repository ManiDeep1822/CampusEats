import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { FiLock, FiShield, FiUser, FiMail, FiPhone, FiMapPin, FiCheckCircle, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Profile = () => {
    const { user } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);
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
        </div>
    );
};

export default Profile;
