import { FiHome, FiMapPin, FiBriefcase, FiBookmark, FiTrash2 } from 'react-icons/fi';
import { motion } from 'framer-motion';

const AddressCard = ({ address, isSelected, onClick, onDelete, isManageMode }) => {
  const getIcon = (tag) => {
    switch (tag) {
      case 'Home': return <FiHome size={14} />;
      case 'Hostel': return <FiMapPin size={14} />;
      case 'Office': return <FiBriefcase size={14} />;
      default: return <FiBookmark size={14} />;
    }
  };

  const getTagColor = (tag) => {
    switch (tag) {
      case 'Home': return 'text-blue-600 bg-blue-50 border-blue-100';
      case 'Hostel': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Office': return 'text-purple-600 bg-purple-50 border-purple-100';
      default: return 'text-orange-600 bg-orange-50 border-orange-100';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative flex-shrink-0"
    >
      <button
        onClick={() => onClick && onClick(address.address)}
        className={`w-44 p-3 rounded-xl border-2 text-left transition-all duration-300 h-full ${
          isSelected 
          ? 'border-primary bg-orange-50/20 shadow-sm' 
          : 'border-gray-50 bg-white hover:border-gray-200'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-1.5 rounded-lg border ${getTagColor(address.tag)}`}>
            {getIcon(address.tag)}
          </div>
          <h4 className="font-bold text-gray-800 text-[11px] uppercase tracking-wider truncate">{address.tag}</h4>
        </div>
        
        <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight font-medium">
          {address.address}
        </p>
      </button>

      {(isManageMode || onDelete) && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1, backgroundColor: '#fee2e2' }}
          onClick={(e) => {
             e.stopPropagation();
             onDelete && onDelete(address._id);
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-md border border-red-50 rounded-full flex items-center justify-center text-red-500 z-10"
        >
          <FiTrash2 size={12} />
        </motion.button>
      )}

      {isSelected && !isManageMode && (
        <div className="absolute -top-1 -right-1">
            <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-sm">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
        </div>
      )}
    </motion.div>
  );
};

export default AddressCard;
