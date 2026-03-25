import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';
import api from '../../services/api';

const CampusEatsAI = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const SUGGESTIONS = [
    "Where is my active order?",
    "Recommend a good Samosa 🥟",
    "Are there any vegetarian pizzas?",
    "Who is the top-rated vendor?",
  ];

  // Initial Greeting when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { 
          id: '1', 
          role: 'ai', 
          text: `Hi ${user?.name?.split(' ')[0] || 'there'}! 👋 I'm CampusEats AI. I have live access to your profile, orders, and the campus menu. How can I help you today?` 
        }
      ]);
    }
  }, [isOpen, messages.length, user]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e, forcedMessage = null) => {
    if (e) e.preventDefault();
    const userMsg = forcedMessage || input.trim();
    if (!userMsg) return;

    setInput('');
    
    // Add User Message
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const { data } = await api.post('/bot/query', { message: userMsg });
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: data.reply }]);
    } catch (error) {
      const errMsg = error.response?.data?.reply || "I'm having trouble connecting to my brain right now. Please try again!";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple Markdown to HTML formatter (bold and newlines)
  const formatText = (text) => {
    // Replace **bold** with <strong>bold</strong>
    const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace newlines with <br/>
    return bolded.split('\n').map((str, i) => (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: str }} />
        {i !== text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-24 right-6 w-80 md:w-96 h-[500px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col z-[100]"
          >
            {/* Header */}
            <div className="bg-primary/10 border-b border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-400 to-primary flex items-center justify-center text-white shadow-lg">
                  <FiCpu size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 leading-tight">CampusEats AI</h3>
                  <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Context Synced
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-1">
                      <FiCpu size={14} />
                    </div>
                  )}
                  <div 
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-white border border-gray-100 text-gray-700 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'user' ? msg.text : formatText(msg.text)}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-primary mr-2 flex-shrink-0 mt-1">
                    <FiCpu size={14} />
                  </div>
                  <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions (Only Show Initially) */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-3 pb-2 bg-gray-50/50 flex gap-2 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(null, suggestion)}
                    className="whitespace-nowrap px-3 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs rounded-full hover:border-primary hover:text-primary transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 relative">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your order, menus..."
                disabled={isLoading}
                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="absolute right-5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-primary text-white rounded-lg disabled:opacity-50 disabled:bg-gray-400 transition-all hover:bg-orange-600 active:scale-95"
              >
                <FiSend size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-orange-500 to-primary rounded-full shadow-xl shadow-orange-500/30 flex items-center justify-center text-white z-[100] border-2 border-white"
      >
        {isOpen ? <FiX size={24} /> : <FiMessageSquare size={24} />}
      </motion.button>
    </>
  );
};

export default CampusEatsAI;
