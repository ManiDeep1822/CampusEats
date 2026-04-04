import React from 'react';
import { motion } from 'framer-motion';
import { FiTag } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const CartBillSummary = React.memo(({ 
  bill, 
  calculating, 
  localSubtotal,
  orderType, 
  loading, 
  onPayment,
  className = ''
}) => {
  const displaySubtotal = localSubtotal || bill?.subtotal || 0;
  return (
    <div className={`bg-white p-7 rounded-3xl shadow-xl border border-gray-50 flex flex-col ${className}`}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">Bill Summary</h2>
          <div className="text-[10px] font-extrabold bg-green-50 text-green-600 px-2 py-1 rounded-md tracking-wider uppercase">
             {orderType === 'take_away' ? 'SELF PICKUP' : bill?.deliveryFee === 0 ? 'FREE DELIVERY' : ''}
          </div>
        </div>
        
        {calculating || !bill ? (
           <div className="py-12 text-center text-sm text-gray-400">Computing Bill...</div>
        ) : (
           <>
             <div className="space-y-4 mb-8">
               <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                  <span>Subtotal</span>
                  <span className={`text-gray-800 font-bold rounded px-2`}>
                    ₹{(bill?.subtotal || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                  <span>Delivery</span>
                  <span className={`text-gray-800 font-bold rounded px-2`}>
                    ₹{(bill?.deliveryFee || 0).toFixed(2)}
                  </span>
               </div>
               <div className="flex justify-between items-center text-sm text-gray-500 font-medium">
                  <span>Platform Fee</span>
                  <span className={`text-gray-800 font-bold rounded px-2`}>
                    ₹{(bill?.platformFee || 0).toFixed(2)}
                  </span>
               </div>
                {(bill?.discountAmount || 0) > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex justify-between items-center text-sm text-green-600 font-bold bg-green-50/50 p-2 rounded-lg"
                  >
                     <span className="flex items-center gap-1"><FiTag size={12} /> Discount</span>
                     <span>- ₹{(bill?.discountAmount || 0).toFixed(2)}</span>
                  </motion.div>
                )}
             </div>
             <div className="border-t-2 border-dashed border-gray-100 pt-6 mb-8 group cursor-default">
                <div className="flex justify-between items-end mb-1">
                   <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Grand Total</span>
                   <span className={`text-primary font-black text-3xl max-sm:text-2xl tracking-tight rounded px-2`}>
                     ₹{(bill?.finalTotal || 0).toFixed(2)}
                   </span>
                </div>
             </div>
           </>
        )}
      </div>
      
      {bill && !calculating && (
         <div className="space-y-4">
          <p className="text-[10px] text-center text-textSecondary px-2 leading-tight">
            By placing this order, you agree to CampusEats&apos;s 
            <Link to="/terms" className="text-primary hover:underline font-bold mx-1">Terms of Service</Link> 
            & 
            <Link to="/privacy" className="text-primary hover:underline font-bold mx-1">Cancellation Policy</Link>
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            onClick={onPayment} 
            className="w-full bg-primary text-white py-5 max-sm:py-4 rounded-2xl font-black text-lg max-sm:text-base shadow-lg shadow-orange-500/30 transition-all uppercase tracking-wider flex items-center justify-center gap-2 group active:scale-95"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Pay Securely'}
          </motion.button>
         </div>
      )}
    </div>
  );
});

CartBillSummary.displayName = 'CartBillSummary';

export default CartBillSummary;
