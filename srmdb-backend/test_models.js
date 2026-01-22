const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Try to test specific models since listModels might not be exposed simply
    const modelsToTest = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-002",
        "gemini-1.5-pro-latest",
        "gemini-pro",
        "gemini-1.0-pro",
        "gemini-2.0-flash-exp"
    ];

    console.log("Testing models...");

    for (const modelName of modelsToTest) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Test");
            console.log(`✅ ${modelName}: SUCCESS`);
        } catch (error) {
            if (error.message.includes("404")) {
                console.log(`❌ ${modelName}: NOT FOUND`);
            } else if (error.message.includes("429")) {
                console.log(`⚠️ ${modelName}: FOUND BUT RATE LIMITED`);
            } else {
                console.log(`❓ ${modelName}: ERROR ${error.message.split(":")[0]}`);
            }
        }
    }
}

listModels();
