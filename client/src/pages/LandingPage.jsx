import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import InstallPWA from '../components/shared/InstallPWA';
import Footer from '../components/shared/Footer';

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

      <div className="max-w-7xl mx-auto px-8 py-32 flex flex-row items-center justify-between relative z-10 gap-0 max-md:flex-col max-md:py-24 max-sm:py-12 max-sm:px-4 max-sm:gap-12">
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="w-[55%] space-y-8 text-left max-md:w-full max-md:text-center max-sm:space-y-6"
        >
          <motion.div variants={defaultAnimations} className="inline-block px-4 py-1.5 rounded-full bg-white/60 backdrop-blur-sm border border-orange-200 text-orange-600 font-bold text-sm shadow-sm font-sans max-sm:text-xs">
            🚀 The #1 Campus Food App
          </motion.div>
          <motion.h1 variants={defaultAnimations} className="text-6xl lg:text-7xl font-heading font-extrabold text-textPrimary leading-[1.15] tracking-tight max-md:text-5xl max-sm:text-4xl">
            Craving something <br className="max-sm:hidden"/> 
            <span className="text-gradient">delicious?</span>
          </motion.h1>
          <motion.p variants={defaultAnimations} className="text-xl text-textSecondary leading-relaxed max-w-xl mx-auto md:mx-0 max-sm:text-lg">
            Skip the lines. Order ahead, track your delivery in real-time, and enjoy your favorite campus meals hot and fresh.
          </motion.p>
          <motion.div variants={defaultAnimations} className="flex flex-wrap justify-center md:justify-start gap-4 pt-4">
            <Link to="/login" className="w-full sm:w-auto bg-primary hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-1 flex items-center justify-center gap-2">
              Start Ordering <span>→</span>
            </Link>
            <InstallPWA buttonStyle="hero" className="w-full sm:w-auto" />
          </motion.div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.3, type: "spring", stiffness: 100 }}
          className="w-[45%] mt-0 flex justify-end relative max-md:w-full max-md:mt-8 max-md:justify-center"
        >
          {/* Main Hero Visual Card */}
          <div className="w-[380px] h-[480px] glass rounded-[2.5rem] p-6 flex flex-col items-center justify-center relative z-20 animate-float shadow-2xl overflow-hidden border border-white/50 max-md:w-[320px] max-md:h-[400px] max-sm:w-[300px] max-sm:h-[360px]">
             <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/10 z-0"></div>
             
             {/* Decorative food images or 3D elements inside card */}
             <div className="z-10 bg-white/80 w-40 h-40 flex items-center justify-center rounded-full shadow-inner mb-6 backdrop-blur-md max-md:w-32 max-md:h-32 max-sm:w-24 max-sm:h-24">
                <span className="text-8xl drop-shadow-2xl leading-none block max-md:text-7xl max-sm:text-6xl">🍔</span>
             </div>
             
             <div className="z-10 text-center w-full space-y-3">
               <div className="h-3 sm:h-4 w-3/4 bg-gray-200/80 rounded-full mx-auto"></div>
               <div className="h-2 sm:h-3 w-1/2 bg-gray-200/80 rounded-full mx-auto"></div>
             </div>
             
             {/* Floating badge */}
             <div className="absolute right-6 bottom-16 bg-white shadow-xl shadow-green-500/10 rounded-2xl p-4 flex items-center gap-3 z-30 animate-pulse border border-green-50 max-md:right-4 max-md:bottom-12 max-sm:right-2 max-sm:bottom-6 max-sm:p-3 max-sm:gap-2">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-xl max-sm:h-8 max-sm:w-8 max-sm:text-lg">✅</div>
                <div className="text-left shrink-0">
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Status</p>
                  <p className="text-base font-bold text-gray-800 max-sm:text-sm">Delivered</p>
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
              <p className="text-textSecondary leading-relaxed">Quick and safe checkout options optimized for student payment methods.</p>

            </motion.div>
            <motion.div whileHover={{ y: -10 }} className="p-8 rounded-3xl bg-white border border-gray-100 shadow-xl shadow-slate-200/30 transition-all">
              <div className="h-16 w-16 bg-green-100 text-green-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">🚀</div>
              <h3 className="text-xl font-bold mb-3 text-textPrimary">Receive it fast</h3>
              <p className="text-textSecondary leading-relaxed">Track your order straight to your current campus block or library seat.</p>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default LandingPage;
