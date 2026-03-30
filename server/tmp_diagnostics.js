require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('Testing API Key Format:', apiKey ? apiKey.substring(0, 4) + '...' : 'MISSING');
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 1. Try to list models
    try {
        console.log('--- Listing Models ---');
        // Note: listModels() is usually not on genAI directly in some versions, 
        // it requires fetching from v1beta.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // The SDK v0.24 is a bit older.
    } catch (e) {
        console.log('List models (sdk-based) failed');
    }

    // 2. Bruteforce test models
    const testModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-1.0-pro'
    ];

    for (const m of testModels) {
        try {
            console.log(`Testing ${m}...`);
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("hi");
            const response = await result.response;
            console.log(`✅ ${m} WORKS! Reply: ${response.text()}`);
            break; // Stop if we find a working one
        } catch (err) {
            console.log(`❌ ${m} FAILED: ${err.message}`);
            if (err.response) {
                console.log(`   Status: ${err.response.status}`);
            }
        }
    }
}

run();
