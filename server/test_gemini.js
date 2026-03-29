require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API KEY found in .env");
    return;
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("Testing Gemini with simple prompt...");
    const result = await model.generateContent("Hello, respond with 'SUCCESS: I AM ALIVE' if you hear me.");
    const response = await result.response;
    const text = response.text();
    console.log("Response:", text);
  } catch (err) {
    console.error("GEMINI TEST FAILED!");
    console.error("Name:", err.name);
    console.error("Message:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", JSON.stringify(err.response.data, null, 2));
    }
    console.error("Full stack for debugging:", err.stack);
  }
}

test();
