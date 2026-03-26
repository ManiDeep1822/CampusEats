require('dotenv').config();
const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');
        const vendors = await Vendor.find({});
        console.log('Vendors found:', vendors.length);
        vendors.forEach(v => {
            console.log(`Vendor: ${v.shopName}, shopImage: ${v.shopImage || 'EMPTY'}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
