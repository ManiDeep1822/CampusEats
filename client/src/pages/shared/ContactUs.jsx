import { useState } from 'react';
import { FiSend, FiMail, FiUser, FiMessageSquare, FiPhone } from 'react-icons/fi';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'student',
    category: 'General Inquiry',
    message: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return toast.error('Please fill all required fields');
    
    setLoading(true);
    try {
      const { data } = await api.post('/feedback', formData);
      toast.success(data.message || 'Message sent! Our team will reach out soon.');
      setFormData({ name: '', email: '', role: 'student', category: 'General Inquiry', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-4xl w-full grid md:grid-cols-5 bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100">
        
        {/* Left Side: Contact Info */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-12 text-white flex flex-col justify-between">
          <div>
            <div className="inline-block px-3 py-1 bg-primary/20 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-widest mb-6 px-4">
              Contact Hub
            </div>
            <h2 className="text-4xl font-black font-heading mb-4 leading-tight">We're here to help.</h2>
            <p className="text-slate-400 mb-10 font-medium leading-relaxed">
              Have a question about an order, partnership, or just want to say hi? Send us a message and our team will get back to you within 24 hours.
            </p>
            
            <div className="space-y-8">
              <div className="flex items-center space-x-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary">
                  <FiMail className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Email Support</p>
                  <p className="font-bold text-slate-100">campus124@gmail.com</p>
                </div>
              </div>

              <div className="flex items-center space-x-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary">
                  <FiPhone className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Phone Line</p>
                  <p className="font-bold text-slate-100">+91 7661822103</p>
                </div>
              </div>

              <div className="flex items-center space-x-5 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:border-primary">
                  <FiMessageSquare className="text-xl" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Live Assistance</p>
                  <p className="font-bold text-slate-100">In-App Chat Support</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Official Platform</p>
            <h3 className="text-2xl font-black text-white">CampusEats</h3>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-3 p-12 lg:p-14 bg-white flex flex-col">
          <h3 className="text-3xl font-black font-heading mb-8 text-slate-900 tracking-tight">Direct Message</h3>
          
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-6">
            <div className="flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <FiUser />
                    </div>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition outline-none font-medium" placeholder="Ex: Rahul Sharma" required />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                      <FiMail />
                    </div>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition outline-none font-medium" placeholder="name@email.com" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">I am a...</label>
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary outline-none transition uppercase text-xs font-black text-slate-600 appearance-none">
                    <option value="student">Student</option>
                    <option value="vendor">Vendor</option>
                    <option value="delivery">Delivery Rider</option>
                    <option value="guest">Guest / Other</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Inquiry Type</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary outline-none transition text-xs font-black text-slate-600 appearance-none">
                    <option value="General Inquiry">General Inquiry</option>
                    <option value="Support Request">Order Support</option>
                    <option value="Bug Report">Technical Issue</option>
                    <option value="Partnership">Business/Stall Inquiry</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Your Message</label>
                <textarea name="message" value={formData.message} onChange={handleChange} rows="4" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary transition outline-none resize-none font-medium" placeholder="Tell us more about your inquiry..." required></textarea>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] transition-all shadow-xl hover:shadow-slate-200 flex items-center justify-center space-x-3 disabled:opacity-50 active:scale-[0.98] mt-8">
              {loading ? <span className="animate-pulse">Dispatching...</span> : <><FiSend /> <span className="uppercase tracking-[0.2em] text-xs">Send Message</span></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
