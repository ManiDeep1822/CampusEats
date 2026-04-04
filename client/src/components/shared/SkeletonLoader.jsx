import React from 'react';
import { motion } from 'framer-motion';

const Shimmer = () => (
  <motion.div
    initial={{ x: '-100%' }}
    animate={{ x: '100%' }}
    transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-10"
  />
);

const SkeletonCard = () => (
  <div className="bg-white rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/40 border border-gray-100 p-0 relative">
    <div className="h-48 bg-slate-100 relative overflow-hidden">
      <Shimmer />
    </div>
    <div className="p-6 relative">
      <div className="flex justify-between items-start mb-4">
        <div className="h-7 bg-slate-100 rounded-lg w-2/3 relative overflow-hidden"><Shimmer /></div>
        <div className="h-7 bg-slate-50 rounded-lg w-12 relative overflow-hidden"><Shimmer /></div>
      </div>
      <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-4 relative overflow-hidden"><Shimmer /></div>
      <div className="h-4 bg-slate-50 rounded-md w-3/4 relative overflow-hidden"><Shimmer /></div>
    </div>
  </div>
);

const SkeletonDetailed = () => (
  <div className="max-w-4xl mx-auto space-y-8 animate-pulse">
    {/* Hero Section Skeleton */}
    <div className="bg-slate-900 h-64 rounded-b-[3rem] p-12 flex flex-col justify-end gap-4">
      <div className="h-10 bg-white/10 rounded-xl w-1/2 relative overflow-hidden"><Shimmer /></div>
      <div className="h-4 bg-white/5 rounded-lg w-1/3 relative overflow-hidden"><Shimmer /></div>
    </div>
    
    {/* Menu List Skeleton */}
    <div className="px-4 space-y-6">
      <div className="h-8 bg-slate-100 rounded-xl w-32 relative overflow-hidden"><Shimmer /></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex gap-6">
          <div className="flex-1 space-y-3">
             <div className="h-6 bg-slate-100 rounded-lg w-1/3 relative overflow-hidden"><Shimmer /></div>
             <div className="h-4 bg-slate-50 rounded-md w-full relative overflow-hidden"><Shimmer /></div>
             <div className="h-5 bg-slate-100 rounded-lg w-16 relative overflow-hidden"><Shimmer /></div>
          </div>
          <div className="w-24 h-24 bg-slate-100 rounded-xl relative overflow-hidden shrink-0"><Shimmer /></div>
        </div>
      ))}
    </div>
  </div>
);

const SkeletonLoader = ({ variant = 'grid', count = 8 }) => {
  if (variant === 'detailed') return <SkeletonDetailed />;
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {[...Array(count)].map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
