const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// API Configuration
const DEEPINFRA_API_KEYS = [
    process.env.AUTO_0_KEY,
    process.env.AUTO_1_KEY,
    process.env.AUTO_2_KEY,
    process.env.AUTO_3_KEY,
    process.env.AUTO_4_KEY,
    process.env.AUTO_5_KEY,
    process.env.AUTO_6_KEY,
    process.env.AUTO_7_KEY,
    process.env.AUTO_8_KEY,
    process.env.AUTO_9_KEY,
    process.env.AUTO_10_KEY
].filter(key => key);

const DEEPINFRA_MODEL_URL = 'https://api.deepinfra.com/v1/inference/meta-llama/Meta-Llama-3-70B-Instruct';
const GEMINI_API_KEY = process.env.AUTO_11_KEY;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Function to generate response using Gemini
async function generateWithGemini(prompt, systemPrompt, language = 'vn') {
    try {
        const result = await geminiModel.generateContent({
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nUser: ${prompt}\nAyaka:`
                }]
            }]
        });
        
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini error:', error.message);
        throw error;
    }
}

// Function to generate response using DeepInfra
async function generateWithDeepInfra(prompt, systemPrompt, apiKey, language = 'vn') {
    try {
        const response = await axios.post(DEEPINFRA_MODEL_URL, {
            input: `<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n${systemPrompt}\n\nUser: ${prompt}\nAyaka:<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`,
            stop: ["<|eot_id|>"]
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data?.results?.[0]?.generated_text;
        if (!result) throw new Error("DeepInfra API returned no text.");
        return result;
    } catch (error) {
        console.error('DeepInfra error:', error.message);
        throw error;
    }
}

// Function to try all available APIs
async function generateResponse(prompt, systemPrompt, language = 'vn') {
    // Try Gemini first
    try {
        return await generateWithGemini(prompt, systemPrompt, language);
    } catch (error) {
        console.log('Gemini failed, trying DeepInfra...');
    }

    // Try each DeepInfra API key
    for (const apiKey of DEEPINFRA_API_KEYS) {
        try {
            return await generateWithDeepInfra(prompt, systemPrompt, apiKey, language);
        } catch (error) {
            console.log(`DeepInfra API key failed, trying next...`);
            continue;
        }
    }

    throw new Error('All APIs failed to generate a response');
}

module.exports = {
    generateResponse,
    generateWithGemini,
    generateWithDeepInfra
}; 