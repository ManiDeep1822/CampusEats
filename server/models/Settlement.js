const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  settlementId: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  actorType: { 
    type: String, 
    enum: ['vendor', 'rider'], 
    required: true 
  },
  actorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'actorModel', 
    required: true,
    index: true 
  },
  actorModel: {
    type: String,
    required: true,
    enum: ['Vendor', 'DeliveryBoy']
  },
  amount: { 
    type: Number, 
    required: true 
  },
  orderIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order' 
  }],
  settledBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  summary: { 
    type: String 
  }
}, { timestamps: true });

const Settlement = mongoose.model('Settlement', settlementSchema);
module.exports = Settlement;
