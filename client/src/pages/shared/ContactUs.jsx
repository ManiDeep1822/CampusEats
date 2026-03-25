import { useState } from 'react';
import { FiSend, FiMail, FiUser, FiMessageSquare } from 'react-icons/fi';
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
      <div className="max-w-4xl w-full grid md:grid-cols-5 bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
        
        {/* Left Side: Contact Info */}
        <div className="md:col-span-2 bg-gradient-to-br from-primary to-orange-600 p-10 text-white flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-extrabold font-heading mb-4">Get in Touch</h2>
            <p className="text-orange-100 mb-8 opacity-90">
              Have a question about an order? Want to list your restaurant? Or simply found a bug? We'd love to hear from you.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <FiMail className="text-xl" />
                </div>
                <span>support@campuseats.com</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <FiMessageSquare className="text-xl" />
                </div>
                <span>Live Chat inside Orders</span>
              </div>
            </div>
          </div>
          
          <div className="mt-16">
            <p className="text-sm text-orange-200">CampusEats Head Office</p>
            <p className="font-bold">Student Center, Floor 2</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="md:col-span-3 p-10 lg:p-12">
          <h3 className="text-2xl font-bold font-heading mb-6 text-gray-800">Send us a Message</h3>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiUser />
                  </div>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition outline-none" placeholder="John Doe" required />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FiMail />
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition outline-none" placeholder="john@university.edu" required />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">I am a...</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition uppercase text-sm font-bold text-gray-600">
                  <option value="student">Student</option>
                  <option value="vendor">Vendor</option>
                  <option value="delivery">Delivery Rider</option>
                  <option value="guest">Guest / Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none transition text-sm font-bold text-gray-600">
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Support Request">Order Support</option>
                  <option value="Bug Report">Report a Bug</option>
                  <option value="Partnership">Partnership</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Message *</label>
              <textarea name="message" value={formData.message} onChange={handleChange} rows="4" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition outline-none resize-none" placeholder="How can we help you?" required></textarea>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-4 rounded-xl transition shadow-md flex items-center justify-center space-x-2 disabled:opacity-50">
              {loading ? <span className="animate-pulse">Sending...</span> : <><FiSend /> <span>Send Message</span></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
