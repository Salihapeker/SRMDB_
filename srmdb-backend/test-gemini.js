require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

async function findWorkingModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const modelsToTry = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro",
        "gemini-1.0-pro"
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
