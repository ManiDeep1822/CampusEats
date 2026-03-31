const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
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

  if (!ai) {
    ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  try {
    // 0. GATHER GLOBAL CONTEXT
    const activeVendors = await Vendor.find({ isOpen: true, isApproved: true }, 'shopName cuisineType rating location');
    const allMenuItems = await MenuItem.find({ isAvailable: true })
      .populate('vendorId', 'shopName')
      .select('name price vendorId')
      .limit(20); // Reduced from 50 to 20 for faster, more stable context

    const menuSummary = allMenuItems.map(item => `${item.name}(₹${item.price}) @ ${item.vendorId?.shopName}`).join(', ');
    const vendorSummary = activeVendors.map(v => `${v.shopName}(${v.rating}⭐)`).join(', ');

    // 1. GATHER ROLE-SPECIFIC CONTEXT
    let dbContext = {};
    if (req.user.role === 'student') {
      const recentOrders = await Order.find({ studentId: req.user._id })
        .populate('vendorId', 'shopName')
        .sort({ createdAt: -1 })
        .limit(2);
        
      dbContext = {
        role: "Student",
        name: req.user.name,
        recent: recentOrders.map(o => `${o.vendorId?.shopName}: ${o.status}`).join(' | ')
      };
    } else {
      dbContext = { role: req.user.role, name: req.user.name };
    }

    // --- MODEL SELECTION ---
    // Using gemini-1.5-flash which is much more stable and has higher free-tier limits (15 RPM)
    // compared to the experimental 2.0 version.
    const model = ai.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    }, { apiVersion: 'v1beta' });

    const fullPrompt = `
      System: You are CampusEats Bot. Friendly, helpful.
      Context: ${vendorSummary} | Menu: ${menuSummary}
      User: ${JSON.stringify(dbContext)}
      Question: "${message}"
      Instructions: Be brief. Only use the context provided.
    `;

    console.log("🤖 Chatbot Prompt Generated (Length:", fullPrompt.length, ")");

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Gemini returned an empty response. Check if content was filtered.");
    }

    return res.json({ reply: text });

  } catch (error) {
    console.error("❌ CHATBOT FATAL ERROR:", {
      message: error.message,
      stack: error.stack,
      details: error.response?.data || error.response || 'No extra data'
    });

    let displayMsg = "I'm having a little brain freeze! Try a simpler question. 🍦";
    
    if (error.message?.includes('API_KEY_INVALID')) {
        displayMsg = "⚠️ Admin Notice: The GEMINI_API_KEY is currently invalid. Please update it in the server.";
    } else if (error.message?.includes('429')) {
        displayMsg = "I'm reached my free limit for the minute! Please wait 60 seconds. 🚦";
    } else if (error.message?.includes('Safety')) {
        displayMsg = "I can't talk about that—let's stick to food on campus! 🍔";
    }

    return res.status(500).json({ reply: displayMsg });
  }
});

module.exports = { handleBotQuery };
