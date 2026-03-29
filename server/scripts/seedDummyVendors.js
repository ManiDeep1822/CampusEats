const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const MenuItem = require('../models/MenuItem');

dotenv.config({ path: path.join(__dirname, '../.env') });

const DUMMY_SUFFIX = '@campuseats.dummy';

const dummyVendors = [
  {
    name: "Aryan Sharma",
    email: `aryan.juice${DUMMY_SUFFIX}`,
    shopName: "Juice Junction",
    location: "Block 5 Cafeteria",
    cuisine: ["Beverages", "Healthy"],
    menu: [
      { name: "Fresh Watermelon Juice", price: 45, category: "Juice", isVeg: true },
      { name: "Mixed Fruit Bowl", price: 60, category: "Snacks", isVeg: true },
      { name: "Cold Coffee", price: 55, category: "Beverages", isVeg: true }
    ]
  },
  {
    name: "Vikram Singh",
    email: `vikram.maggi${DUMMY_SUFFIX}`,
    shopName: "The Maggi Point",
    location: "Hostel A Entrance",
    cuisine: ["Fast Food", "Noodles"],
    menu: [
      { name: "Cheese Masala Maggi", price: 50, category: "Noodles", isVeg: true },
      { name: "Egg Maggi", price: 60, category: "Noodles", isVeg: false },
      { name: "Veg Grilled Sandwich", price: 45, category: "Sandwich", isVeg: true }
    ]
  },
  {
    name: "Priya Das",
    email: `priya.desserts${DUMMY_SUFFIX}`,
    shopName: "Sunrise Sweets",
    location: "Central Library Block",
    cuisine: ["Desserts", "Bakery"],
    menu: [
      { name: "Chocolate Brownie", price: 75, category: "Dessert", isVeg: true },
      { name: "Gulab Jamun (2pcs)", price: 40, category: "Dessert", isVeg: true },
      { name: "Cream Bun", price: 25, category: "Bakery", isVeg: true }
    ]
  },
  {
    name: "Rahul Mehta",
    email: `rahul.south${DUMMY_SUFFIX}`,
    shopName: "South Special",
    location: "Block 2 Food Court",
    cuisine: ["South Indian"],
    menu: [
      { name: "Masala Dosa", price: 70, category: "Breakfast", isVeg: true },
      { name: "Idli Sambhar", price: 50, category: "Breakfast", isVeg: true },
      { name: "Medu Vada", price: 55, category: "Breakfast", isVeg: true }
    ]
  },
  {
    name: "Sonia Verma",
    email: `sonia.momos${DUMMY_SUFFIX}`,
    shopName: "Momo House",
    location: "Main Gate Plaza",
    cuisine: ["Tibetan", "Snacks"],
    menu: [
      { name: "Veg Steam Momos", price: 60, category: "Momos", isVeg: true },
      { name: "Chicken Fried Momos", price: 90, category: "Momos", isVeg: false },
      { name: "Paneer Momos", price: 80, category: "Momos", isVeg: true }
    ]
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    for (const data of dummyVendors) {
      // 1. Create or Update User
      let user = await User.findOne({ email: data.email });
      if (!user) {
        user = await User.create({
          name: data.name,
          email: data.email,
          password: 'password123', // Default password for all dummy vendors
          role: 'vendor',
          isVerified: true
        });
        console.log(`Created user: ${data.email}`);
      }

      // 2. Create or Update Vendor Profile
      let vendor = await Vendor.findOne({ userId: user._id });
      if (!vendor) {
        vendor = await Vendor.create({
          userId: user._id,
          shopName: data.shopName,
          location: data.location,
          cuisineType: data.cuisine,
          isOpen: true,
          isApproved: true,
          rating: 4 + Math.random(), // Randomized rating between 4.0 - 5.0
          numReviews: Math.floor(Math.random() * 50) + 10
        });
        console.log(`Created vendor: ${data.shopName}`);
      }

      // 3. Add Menu Items
      for (const item of data.menu) {
        const itemExists = await MenuItem.findOne({ vendorId: vendor._id, name: item.name });
        if (!itemExists) {
          await MenuItem.create({
            vendorId: vendor._id,
            ...item,
            preparationTime: 10 + Math.floor(Math.random() * 20)
          });
        }
      }
      console.log(`Added menu for: ${data.shopName}`);
    }

    console.log('\n✅ Seeding complete! 5 new stalls are now live.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
