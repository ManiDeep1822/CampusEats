import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowLeft } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const StudentOffers = () => {
   const offers = [
     { id: 1, title: 'FLAT ₹100 OFF', code: 'CAMPUS100', desc: 'Above ₹499', icon: '₹', color: 'bg-indigo-50 text-indigo-600' },
     { id: 2, title: '50% OFF', code: 'WELCOME50', desc: 'Up to ₹80', icon: '%', color: 'bg-blue-50 text-blue-600' },
     { id: 3, title: 'FREE DELIVERY', code: 'FREESHIP', desc: 'On all orders', icon: '🚚', color: 'bg-emerald-50 text-emerald-600' },
     { id: 4, title: 'BOGO MONDAY', code: 'BOGO', desc: 'Select items', icon: '🍔', color: 'bg-orange-50 text-orange-600' },
   ];

   return (
       <div className="min-h-screen bg-slate-50 pb-20 pt-8 px-4">
          <div className="max-w-2xl mx-auto">
             <Link to="/student/home" className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-800 transition-colors w-max font-bold text-sm">
                <FiArrowLeft /> Back to Home
             </Link>
             <h1 className="text-3xl font-black text-slate-900 mb-2">Available Offers</h1>
             <p className="text-slate-500 mb-8 font-medium">Apply these coupons during checkout to save on your next meal.</p>
             
             <div className="flex flex-col gap-4">
                {offers.map(offer => (
                   <motion.div
                     key={offer.id}
                     whileHover={{ y: -2, scale: 1.01 }}
                     className="w-full p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 cursor-pointer group"
                   >
                      <div className={`w-12 h-12 shrink-0 ${offer.color} rounded-full flex items-center justify-center text-xl shadow-inner`}>
                         {offer.icon}
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                         <h3 className="text-base font-black text-slate-800 tracking-tight truncate">{offer.title}</h3>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mt-1 truncate">
                            USE <span className="text-slate-700">{offer.code}</span> <span className="text-slate-300 mx-1">|</span> {offer.desc}
                         </p>
                      </div>
                   </motion.div>
                ))}
             </div>
          </div>
       </div>
   );
};

export default StudentOffers;
