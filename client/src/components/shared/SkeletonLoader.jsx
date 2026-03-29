import React from 'react';
import { motion } from 'framer-motion';

const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-lg shadow-slate-200/40 border border-gray-100 p-0 animate-pulse">
      <div className="h-48 bg-slate-100 relative"></div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="h-7 bg-slate-100 rounded-lg w-2/3"></div>
          <div className="h-7 bg-slate-50 rounded-lg w-12"></div>
        </div>
        <div className="h-4 bg-slate-100 rounded-md w-1/2 mb-4"></div>
        <div className="h-4 bg-slate-50 rounded-md w-3/4"></div>
      </div>
    </div>
  );
};

const SkeletonLoader = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(count)].map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <SkeletonCard />
        </motion.div>
      ))}
    </div>
  );
};

export default SkeletonLoader;
