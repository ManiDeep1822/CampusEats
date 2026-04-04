import React from 'react';
import { FiMapPin, FiDownload } from 'react-icons/fi';

const OrderTypeSelector = React.memo(({ orderType, setOrderType }) => {
  return (
    <div className="bg-gray-50/50 p-2 rounded-2xl border border-gray-100 flex gap-2">
      <button 
        type="button"
        onClick={() => setOrderType('delivery')}
        className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${orderType === 'delivery' ? 'bg-white text-primary shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <FiMapPin size={18} />
        <span>Delivery</span>
      </button>
      <button 
        type="button"
        onClick={() => setOrderType('take_away')}
        className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${orderType === 'take_away' ? 'bg-white text-primary shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
      >
        <FiDownload className="rotate-180" size={18} />
        <span>Take Away</span>
      </button>
    </div>
  );
});

OrderTypeSelector.displayName = 'OrderTypeSelector';

export default OrderTypeSelector;
