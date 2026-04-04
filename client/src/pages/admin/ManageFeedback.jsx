import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiMessageSquare, 
  FiTrash2, 
  FiSend, 
  FiCheckCircle, 
  FiClock, 
  FiFilter,
  FiX,
  FiArrowLeft,
  FiMail,
  FiUser,
  FiTag
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ManageFeedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, replied

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get('/feedback');
      setFeedbacks(data);
    } catch (error) {
      toast.error('Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback entry?')) return;
    
    // ⚡ Optimistic Update
    const oldFeedbacks = [...feedbacks];
    setFeedbacks(prev => prev.filter(f => f._id !== id));

    try {
      await api.delete(`/feedback/${id}`);
      toast.success('Feedback deleted');
    } catch (error) {
      setFeedbacks(oldFeedbacks); // Rollback
      toast.error('Failed to delete feedback');
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmitting(true);
    const oldFeedbacks = [...feedbacks];
    const targetFeedback = feedbacks.find(f => f._id === selectedFeedback._id);
    
    // ⚡ Optimistic Update: Mark as replied instantly in the list
    setFeedbacks(prev => prev.map(f => f._id === selectedFeedback._id ? { 
      ...f, 
      isReplied: true, 
      adminReply: replyText, 
      repliedAt: new Date().toISOString() 
    } : f));

    try {
      const { data } = await api.put(`/feedback/${selectedFeedback._id}/reply`, {
        adminReply: replyText
      });
      toast.success('Reply submitted successfully');
      // Sync exactly with server data
      setFeedbacks(prev => prev.map(f => f._id === data._id ? data : f));
      setSelectedFeedback(null);
      setReplyText('');
    } catch (error) {
      setFeedbacks(oldFeedbacks); // Rollback
      toast.error('Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filter === 'pending') return !f.isReplied;
    if (filter === 'replied') return f.isReplied;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    pending: feedbacks.filter(f => !f.isReplied).length,
    replied: feedbacks.filter(f => f.isReplied).length
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 min-h-screen bg-gray-50 uppercase-none">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                <FiMessageSquare className="text-purple-500" />
                Manage Feedbacks
              </h1>
              <p className="text-gray-500 mt-2">Listen to your users and respond to their inquiries.</p>
            </div>
            <Link to="/admin/dashboard" className="text-gray-500 hover:text-primary font-bold flex items-center gap-2 transition-colors bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md w-fit active:scale-95">
              <FiArrowLeft /> Back to Dashboard
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatMiniCard title="Total Inquiries" value={stats.total} icon={<FiMessageSquare />} color="bg-blue-500" />
          <StatMiniCard title="Pending Review" value={stats.pending} icon={<FiClock />} color="bg-orange-500" />
          <StatMiniCard title="Responses Sent" value={stats.replied} icon={<FiCheckCircle />} color="bg-emerald-500" />
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
          <FiFilter className="text-gray-400 ml-2" />
          <div className="flex bg-gray-100 p-1 rounded-xl">
            {['all', 'pending', 'replied'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  filter === f ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence mode='popLayout'>
            {filteredFeedbacks.length > 0 ? (
              filteredFeedbacks.map((f, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={f._id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          f.isReplied ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {f.isReplied ? 'Replied' : 'Pending'}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                          {f.category}
                        </span>
                        <span className="text-[10px] text-gray-300 ml-auto">
                          {new Date(f.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
                         {f.name} <span className="text-sm font-normal text-gray-400">({f.email})</span>
                      </h3>
                      
                      <p className="text-gray-600 leading-relaxed italic border-l-4 border-gray-100 pl-4 py-1 my-3">
                        &quot;{f.message}&quot;
                      </p>

                      {f.isReplied && (
                        <div className="mt-4 bg-purple-50 p-4 rounded-xl border border-purple-100">
                           <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                             <FiSend size={12} /> Admin Reply • {new Date(f.repliedAt).toLocaleDateString()}
                           </p>
                           <p className="text-gray-700 text-sm">{f.adminReply}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2 justify-end">
                      {!f.isReplied && (
                        <button
                          onClick={() => setSelectedFeedback(f)}
                          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg shadow-primary/20 hover:shadow-primary/40"
                        >
                          <FiSend /> Reply
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(f._id)}
                        className="flex items-center justify-center gap-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 px-4 py-2.5 rounded-xl transition-all"
                      >
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200"
              >
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiMessageSquare className="text-gray-300" size={32} />
                </div>
                <p className="text-gray-500 font-medium">No feedbacks found for this filter.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reply Modal */}
        <AnimatePresence>
          {selectedFeedback && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFeedback(null)}
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Reply to Inquirer</h3>
                  <button onClick={() => setSelectedFeedback(null)} className="text-gray-400 hover:text-gray-600">
                    <FiX size={24} />
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                      <FiUser /> Original Message from {selectedFeedback.name}
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-600 text-sm italic">
                      &quot;{selectedFeedback.message}&quot;
                    </div>
                  </div>

                  <form onSubmit={handleReply}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Your Professional Reply</label>
                    <textarea
                      required
                      placeholder="Type your response here..."
                      className="w-full bg-gray-50 border-gray-200 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary h-32 resize-none"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedFeedback(null)}
                        className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSubmitting}
                        className="flex items-center gap-2 bg-primary text-white px-8 py-2.5 rounded-xl font-extrabold hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-primary/20"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><FiSend /> Send Reply</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatMiniCard = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color} shadow-lg shadow-${color.split('-')[1]}-500/20`}>
      {icon}
    </div>
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{title}</p>
      <h3 className="text-2xl font-extrabold text-gray-800">{value}</h3>
    </div>
  </div>
);

export default ManageFeedback;
