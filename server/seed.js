require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Vendor = require('./models/Vendor');
const DeliveryBoy = require('./models/DeliveryBoy');
const MenuItem = require('./models/MenuItem');

const seedData = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuseats');
    console.log(`Connected for Seeding: ${conn.connection.host}`);

    await User.deleteMany();
    await Vendor.deleteMany();
    await DeliveryBoy.deleteMany();
    await MenuItem.deleteMany();

    const password = 'admin@123';

    const adminUser = await User.create({ name: 'System Admin', email: 'admin@campus.edu', password, role: 'admin', phone: '0000000000' });

    const student1 = await User.create({ name: 'Rahul Student', email: 'rahul@campus.edu', password, role: 'student', phone: '9999999991' });
    const student2 = await User.create({ name: 'Sneha Student', email: 'sneha@campus.edu', password, role: 'student', phone: '9999999992' });
    const student3 = await User.create({ name: 'Aryan Student', email: 'aryan@campus.edu', password, role: 'student', phone: '9999999993' });

    const vendorUser1 = await User.create({ name: 'Chai Vendor', email: 'chai@campus.edu', password, role: 'vendor' });
    const vendor1 = await Vendor.create({ userId: vendorUser1._id, shopName: 'Chai Corner', location: 'Block A, Ground Floor', cuisineType: ['Beverages', 'Snacks'], isOpen: true, rating: 4.5 });

    const vendorUser2 = await User.create({ name: 'Biryani Vendor', email: 'biryani@campus.edu', password, role: 'vendor' });
    const vendor2 = await Vendor.create({ userId: vendorUser2._id, shopName: 'Biryani Hub', location: 'Gate 2 Food Court', cuisineType: ['Indian', 'Mughlai'], isOpen: true, rating: 4.8 });

    const vendorUser3 = await User.create({ name: 'Snack Vendor', email: 'snack@campus.edu', password, role: 'vendor' });
    const vendor3 = await Vendor.create({ userId: vendorUser3._id, shopName: 'Snack Zone', location: 'Library Canteen', cuisineType: ['Fast Food'], isOpen: false, rating: 4.1 });

    const del1 = await User.create({ name: 'Rider 1', email: 'rider1@campus.edu', password, role: 'delivery' });
    await DeliveryBoy.create({ userId: del1._id, vehicleType: 'Bicycle', isAvailable: true });

    const del2 = await User.create({ name: 'Rider 2', email: 'rider2@campus.edu', password, role: 'delivery' });
    await DeliveryBoy.create({ userId: del2._id, vehicleType: 'Scooter', isAvailable: false });

    await MenuItem.create([
      { vendorId: vendor1._id, name: 'Masala Chai', description: 'Hot and spicy tea', price: 20, isVeg: true, category: 'Beverage' },
      { vendorId: vendor1._id, name: 'Samosa', description: 'Crispy potato stuffed pastry', price: 25, isVeg: true, category: 'Snacks' },
      { vendorId: vendor1._id, name: 'Maggi', description: 'Classic 2-minute noodles', price: 40, isVeg: true, category: 'Snacks' },
      
      { vendorId: vendor2._id, name: 'Chicken Biryani', description: 'Hyderabadi style dum biryani', price: 150, isVeg: false, category: 'Main Course' },
      { vendorId: vendor2._id, name: 'Veg Pulao', description: 'Aromatic rice with fresh veggies', price: 100, isVeg: true, category: 'Main Course' },
      { vendorId: vendor2._id, name: 'Coke', description: 'Chilled soft drink', price: 40, isVeg: true, category: 'Beverage' },

      { vendorId: vendor3._id, name: 'Cheese Burger', description: 'Juicy veg patty with cheese', price: 80, isVeg: true, category: 'Fast Food' },
      { vendorId: vendor3._id, name: 'French Fries', description: 'Crispy salted fries', price: 60, isVeg: true, category: 'Fast Food' },
    ]);

    console.log('Database seeded successfully!');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};
seedData();
