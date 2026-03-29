const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');

let ai = null;

// @desc    Handle chat bot queries using Gemini Context-Aware AI
// @route   POST /api/bot/query
// @access  Private
const handleBotQuery = asyncHandler(async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({ 
      reply: "Oops! My AI brain isn't connected yet. Please ask the admin to configure the GEMINI_API_KEY in the server environment!" 
    });
  }

  // Initialize client safely now that we know the key exists
  if (!ai) {
    ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiVersion: 'v1' });
  }

  // 0. GATHER GLOBAL CONTEXT (Available to all roles for better platform knowledge)
  try {
    const activeVendors = await Vendor.find({ isOpen: true, isApproved: true }, 'shopName cuisineType rating location numReviews');
    const allMenuItems = await MenuItem.find({ isAvailable: true })
      .populate('vendorId', 'shopName')
      .select('name price category isVeg preparationTime vendorId');

    const menuCatalog = allMenuItems.reduce((acc, item) => {
      const vName = item.vendorId?.shopName || 'Unknown';
      if (!acc[vName]) acc[vName] = [];
      acc[vName].push(`${item.name} (₹${item.price}, ${item.isVeg ? 'Veg' : 'Non-Veg'})`);
      return acc;
    }, {});

    const globalCampusVendors = activeVendors.map(v => ({
      shopName: v.shopName,
      rating: v.rating,
      reviews: v.numReviews,
      location: v.location,
      cuisine: v.cuisineType?.join(', ') || 'Various'
    }));

    // 1. GATHER ROLE-SPECIFIC CONTEXT
    if (req.user.role === 'student') {
      const recentOrders = await Order.find({ studentId: req.user._id })
        .populate('vendorId', 'shopName location rating')
        .populate('deliveryBoyId', 'userId vehicleType rating')
        .sort({ createdAt: -1 })
        .limit(3);
        
      dbContext = {
        role: "Student",
        name: req.user.name,
        recentOrders: recentOrders.map(o => ({
          orderId: o.orderId,
          status: o.status,
          vendor: o.vendorId ? o.vendorId.shopName : 'Unknown',
          total: o.totalAmount,
          placedAt: o.createdAt
        }))
      };
    } else if (req.user.role === 'vendor') {
      const vendor = await Vendor.findOne({ userId: req.user._id });
      if (vendor) {
        const pendingOrders = await Order.countDocuments({ vendorId: vendor._id, status: { $in: ['placed', 'confirmed', 'preparing'] } });
        dbContext = {
          role: "Vendor",
          shopName: vendor.shopName,
          status: vendor.isOpen ? "Open" : "Closed",
          rating: vendor.rating,
          pendingOrdersToPrepare: pendingOrders
        };
      }
    } else if (req.user.role === 'delivery') {
      dbContext = { role: "Delivery Rider", name: req.user.name };
    } else if (req.user.role === 'admin') {
      const totalUsers = await User.countDocuments();
      const totalOrders = await Order.countDocuments();
      dbContext = {
        role: "System Admin",
        name: req.user.name,
        totalUsers,
        totalOrders
      };
    }

    // Attach global context to all users for platform awareness
    dbContext.globalCampusVendors = globalCampusVendors;
    dbContext.globalCampusMenu = menuCatalog;

    // Construct the System Instructions
    const systemPrompt = `
      You are CampusEats AI, the official, highly intelligent support assistant for the CampusEats college food delivery platform.
      You are currently talking to a ${req.user.role} named ${req.user.name}.
      
      HERE IS THE LIVE DATABASE CONTEXT FOR THIS USER:
      ${JSON.stringify(dbContext, null, 2)}
      
      INSTRUCTIONS:
      1. Use the database context provided above to accurately answer their questions.
      2. RECOMMENDATIONS: If any user asks for food recommendations or specific items (like "samosa"), SEARCH the \`globalCampusMenu\` context. Tell them who sells it and at what price.
      3. RATINGS & VENDORS: If asked about the best/top-rated vendors, use the \`globalCampusVendors\` array. Sort by highest \`rating\`.
      4. Keep responses concise, friendly, and formatted in clean markdown with emojis.
      5. DO NOT make up fake orders or fake data.
    `;

    // Call Gemini to generate the response
    const generativeModel = ai.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: systemPrompt 
    });

    const result = await generativeModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: message }] }],
      generationConfig: { temperature: 0.7 }
    });

    return res.json({ 
      reply: result.response.text() 
    });

  } catch (error) {
    console.error("AI Bot Error:", error);
    return res.status(500).json({ 
      reply: "I'm currently experiencing a connectivity issue with my core logic. Please try again in a moment! 🍔" 
    });
  }
});

module.exports = { handleBotQuery };
