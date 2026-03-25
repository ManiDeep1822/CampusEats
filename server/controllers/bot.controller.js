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
    ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  // Gather Real-Time Database Context depending on who is asking
  let dbContext = {};
  
  try {
    if (req.user.role === 'student') {
      // Find active and recent orders for this student
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

      // FETCH LIVE MENU & VENDOR DATA
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

      dbContext.globalCampusVendors = activeVendors.map(v => ({
        shopName: v.shopName,
        rating: v.rating,
        reviews: v.numReviews,
        location: v.location,
        cuisine: v.cuisineType?.join(', ') || 'Various'
      }));
      dbContext.globalCampusMenu = menuCatalog;

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

    // Construct the System Instructions
    const systemPrompt = `
      You are CampusEats AI, the official, highly intelligent support assistant for the CampusEats college food delivery platform.
      You are currently talking to a ${req.user.role} named ${req.user.name}.
      
      HERE IS THE LIVE DATABASE CONTEXT FOR THIS USER:
      ${JSON.stringify(dbContext, null, 2)}
      
      INSTRUCTIONS:
      1. Use the database context provided above to accurately answer their questions (e.g., if they ask "where is my order?", tell them the exact status of their most recent order from the context).
      2. RECOMMENDATIONS: If the user asks for food recommendations or specific items (like "samosa" or "pizza"), SEARCH the \`globalCampusMenu\` context. Tell them exactly which vendor sells it and what the price is.
      3. RATINGS & VENDORS: If asked about the best/top-rated vendors or ratings in general, use the \`globalCampusVendors\` array. Sort by highest \`rating\`. If a rating is 0, it simply means they are a new vendor with no reviews yet!
      4. Keep responses concise, friendly, and formatted in clean markdown (bolding important things, using emojis).
      5. DO NOT make up fake orders or fake menu items. ONLY use the context provided.
      6. If they ask about platform features, CampusEats supports: ordering food from campus vendors, real-time rider tracking, vendor ratings, glassmorphic UI, and this AI chatbot!
    `;

    // Call Gemini to generate the response
    const generativeModel = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
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
      reply: "I'm currently experiencing a high volume of requests or a connectivity issue. Please try asking again in a moment! 🍔" 
    });
  }
});

module.exports = { handleBotQuery };
