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

                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-sm text-gray-500">I&apos;m a student at CampusEats, and I love trying out new food from different vendors.</p>
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


        </div>
    );
};

export default Profile;
