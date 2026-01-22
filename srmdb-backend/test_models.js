const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Try to test specific models since listModels might not be exposed simply
    const modelsToTest = [
        "gemini-2.0-flash",           // En yeni, hızlı ve ücretsiz
        "gemini-2.0-flash-lite",      // Daha hafif, ücretsiz
        "gemini-1.5-flash-002",       // Stabil flash model, ücretsiz
        "gemini-1.5-flash-8b",        // Küçük ve hızlı, ücretsiz
        "gemini-1.5-pro-002"          // Pro model, ücretsiz tier'da kullanılabilir
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
