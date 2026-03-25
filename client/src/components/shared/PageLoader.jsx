import React from 'react';

const PageLoader = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-md">
      <div className="flex flex-col items-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">
            🍔
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center space-y-2">
          <h2 className="text-xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
            CampusEats
          </h2>
          <div className="flex space-x-1">
             {[0, 1, 2].map((i) => (
               <div 
                 key={i} 
                 className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
                 style={{ animationDelay: `${i * 0.15}s` }}
               />
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
