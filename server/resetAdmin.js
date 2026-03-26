require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campuseats')
  .then(async () => {
    console.log('Connected to MongoDB');
    const user = await User.findOne({ email: 'admin@campus.edu' });
    if (user) {
      user.password = 'admin123';
      await user.save();
      console.log('Admin password reset to: admin123');
    } else {
      console.log('Admin user not found');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
