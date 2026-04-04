import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/shared/Loader';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiClock, FiMapPin, FiCheckCircle, FiPackage, FiSearch } from 'react-icons/fi';
import { motion } from 'framer-motion';

const DeliveryHistory = () => {
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const fetchHistory = async () => {
        try {
            const { data } = await api.get('/delivery/dashboard');
            // We'll use the recentDeliveries from the dashboard data for now, 
            // or fetch a dedicated history if the backend supports it.
            setDeliveries(data.recentDeliveries || []);
        } catch (err) {
            toast.error("Failed to load mission history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const filteredDeliveries = deliveries.filter(d => 
        (d._id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.vendorId?.shopName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <Loader />;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-['Inter',sans-serif]">
            {/* Header (Fixed Overlap) */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-5 py-6 flex items-center gap-4">
                    <button onClick={() => navigate('/delivery/dashboard')} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <FiChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-black text-gray-800 tracking-tight">MISSION LOGS</h1>
                        <p className="text-[10px] font-bold text-gray-400 font-mono uppercase tracking-[0.2em]">Deployment History</p>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-5 space-y-6">
                {/* Search Bar */}
                <div className="relative">
                    <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search mission ID or restaurant..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[1.5rem] shadow-sm text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                    />
                </div>

                {/* History List */}
                <div className="space-y-4">
                    {filteredDeliveries.length > 0 ? (
                        filteredDeliveries.map((delivery, i) => (
                            <motion.div 
                                key={delivery._id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 group hover:border-orange-200 transition-all"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                                            <FiCheckCircle size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed Mission</span>
                                    </div>
                                    <span className="text-sm font-black text-gray-800">₹{delivery.deliveryFee || 15}</span>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex flex-col items-center py-1">
                                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div>
                                        <div className="w-0.5 grow bg-gray-100 my-1"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                                    </div>
                                    <div className="grow space-y-3">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">From</p>
                                            <p className="text-sm font-black text-gray-700">{delivery.vendorId?.shopName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">To</p>
                                            <p className="text-xs font-bold text-gray-500">{delivery.deliveryAddress}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        <FiClock /> {new Date(delivery.createdAt).toLocaleDateString()}
                                    </div>
                                    <p className="text-[10px] font-black text-gray-300 font-mono">ID: #{delivery._id.slice(-8).toUpperCase()}</p>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-20">
                            <div className="text-4xl mb-4">📜</div>
                            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching logs found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeliveryHistory;
