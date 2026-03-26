require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const vendor = await Vendor.findOne({ shopName: 'Chai Corner' });
        console.log('Vendor Object:', JSON.stringify(vendor, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
