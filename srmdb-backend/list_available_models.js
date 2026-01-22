const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
require("dotenv").config();

async function testAllModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API Key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // 1. Get List via REST (since SDK list might be limited)
        console.log("Fetching model list...");
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const models = response.data.models;

        // Filter for generateContent support
        const candidates = models
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => m.name.replace('models/', ''));

        console.log(`Found ${candidates.length} candidates.`);

        const workingModels = [];

        for (const modelName of candidates) {
            process.stdout.write(`Testing ${modelName}... `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Test");
                const response = await result.response;
                console.log(`✅ SUCCESS!`);
                workingModels.push(modelName);
            } catch (error) {
                if (error.message.includes("429")) {
                    console.log(`⚠️ Rate Limited`);
                    // Even if rate limited, it exists! Usually we can retry.
                    // But strict quota might mean we can't use it.
                    // workingModels.push(modelName); // Decide if we want to include rate-limited ones.
                    // Let's include them but marked? No, strict "working" means 200 OK right now.
                } else if (error.message.includes("404")) {
                    console.log(`❌ Not Found`);
                } else {
                    console.log(`❌ Error: ${error.message.split(']')[0]}`);
                }
            }
        }

        console.log("\n------ SUMMARY ------");
        console.log("WORKING (200 OK) MODELS:", workingModels);

        const fs = require('fs');
        fs.writeFileSync('working_models_result.json', JSON.stringify(workingModels, null, 2));

    } catch (error) {
        console.error("Fatal error:", error.message);
    }
}

testAllModels();
