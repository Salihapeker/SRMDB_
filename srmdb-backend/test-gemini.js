require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function findWorkingModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTry = [
        "gemini-2.0-flash",           // En yeni, hızlı ve ücretsiz
        "gemini-2.0-flash-lite",      // Daha hafif, ücretsiz
        "gemini-1.5-flash-002",       // Stabil flash model, ücretsiz
        "gemini-1.5-flash-8b",        // Küçük ve hızlı, ücretsiz
        "gemini-1.5-pro-002"          // Pro model, ücretsiz tier'da kullanılabilir
    ];

    let logs = "";
    const log = (msg) => { logs += msg + "\n"; console.log(msg); };

    log("🔍 Testing models...");

    for (const modelName of modelsToTry) {
        try {
            log(`Testing ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            log(`✅ SUCCESS: ${modelName} works!`);
            fs.writeFileSync("test-output.txt", logs);
            return;
        } catch (error) {
            log(`❌ FAILED: ${modelName} - ${error.message.split('\n')[0]}`);
        }
    }
    fs.writeFileSync("test-output.txt", logs);
}

findWorkingModel();
