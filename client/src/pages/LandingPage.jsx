import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';

const defaultAnimations = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === 'admin') navigate('/admin/dashboard', { replace: true });
      else if (user?.role === 'student') navigate('/student/home', { replace: true });
      else if (user?.role === 'vendor') navigate('/vendor/dashboard', { replace: true });
      else if (user?.role === 'delivery') navigate('/delivery/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden relative selection:bg-primary/30">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-rose-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-[20%] w-96 h-96 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24 md:py-32 flex flex-col md:flex-row items-center justify-between relative z-10 gap-12 md:gap-0">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="w-full md:w-[55%] space-y-6 sm:space-y-8 text-center md:text-left"
        >
          <motion.div variants={defaultAnimations} className="inline-block px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-orange-200 text-orange-600 font-bold text-xs sm:text-sm shadow-sm font-sans">
            🚀 The #1 Campus Food App
          </motion.div>
          <motion.h1 variants={defaultAnimations} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-extrabold text-textPrimary leading-[1.15] tracking-tight">
            Craving something <br className="hidden sm:block"/> 
            <span className="text-gradient">delicious?</span>
          </motion.h1>
          <motion.p variants={defaultAnimations} className="text-lg sm:text-xl text-textSecondary leading-relaxed max-w-xl mx-auto md:mx-0">
            Skip the lines. Order ahead, track your delivery in real-time, and enjoy your favorite campus meals hot and fresh.
          </motion.p>
          <motion.div variants={defaultAnimations} className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Link to="/login" className="w-full sm:w-auto bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 flex items-center justify-center gap-2">
              Start Ordering <span>→</span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
          className="w-full md:w-[45%] mt-8 md:mt-0 flex justify-center lg:justify-end relative"
        >
          {/* Main Hero Visual Card */}
          <div className="w-full max-w-[300px] h-[360px] sm:w-[320px] sm:h-[400px] md:w-[380px] md:h-[480px] glass rounded-[2.5rem] p-6 flex flex-col items-center justify-center relative z-20 animate-float shadow-2xl overflow-hidden border border-white/50">
             <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/10 z-0"></div>
             
             {/* Decorative food images or 3D elements inside card */}
             <div className="z-10 bg-white/80 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 flex items-center justify-center rounded-full shadow-inner mb-6 backdrop-blur-md">
                <span className="text-6xl sm:text-7xl md:text-8xl drop-shadow-2xl leading-none block">🍔</span>
             </div>
             
             <div className="z-10 text-center w-full space-y-3">
               <div className="h-3 sm:h-4 w-3/4 bg-gray-200/80 rounded-full mx-auto"></div>
               <div className="h-2 sm:h-3 w-1/2 bg-gray-200/80 rounded-full mx-auto"></div>
             </div>
             
             {/* Floating badge */}
             <div className="absolute right-2 bottom-6 sm:right-4 sm:bottom-12 md:right-6 md:bottom-16 bg-white shadow-xl shadow-green-500/10 rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 z-30 animate-pulse border border-green-50">
                <div className="h-8 w-8 sm:h-10 sm:w-10 bg-green-100 rounded-full flex items-center justify-center text-lg sm:text-xl">✅</div>
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Status</p>
                  <p className="text-sm sm:text-base font-bold text-gray-800">Delivered</p>
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Feature Grid Section */}
      <div className="bg-white/80 relative z-20 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-heading font-bold text-textPrimary tracking-tight">How it <span className="text-gradient">works</span></h2>
            <p className="text-textSecondary mt-4 text-lg">Your campus food experience, streamlined.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center relative z-10">
            <motion.div whileHover={{ y: -10 }} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-slate-200/30 transition-all">
              <div className="h-16 w-16 bg-orange-100 text-primary rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">📱</div>
              <h3 className="text-xl font-bold mb-3 text-textPrimary">Choose your meal</h3>
              <p className="text-textSecondary leading-relaxed">Browse visually stunning menus from all open campus vendors seamlessly.</p>
            </motion.div>
            <motion.div whileHover={{ y: -10 }} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-slate-200/30 transition-all">
              <div className="h-16 w-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">💳</div>
              <h3 className="text-xl font-bold mb-3 text-textPrimary">Pay securely</h3>
              <p className="text-textSecondary leading-relaxed">Quick and safe checkout options optimized for student wallets and cards.</p>
            </motion.div>
            <motion.div whileHover={{ y: -10 }} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-slate-200/30 transition-all">
              <div className="h-16 w-16 bg-green-100 text-green-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">🚀</div>
              <h3 className="text-xl font-bold mb-3 text-textPrimary">Receive it fast</h3>
              <p className="text-textSecondary leading-relaxed">Track your order straight to your current campus block or library seat.</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
