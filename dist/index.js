"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const readline_1 = __importDefault(require("readline"));
const pageExtractor_1 = require("./pageExtractor");
const paginationSystemMessage_1 = require("./paginationSystemMessage");
const openai_1 = require("@langchain/openai");
const messages_1 = require("@langchain/core/messages");
const chat_history_1 = require("@langchain/core/chat_history");
const paginationDBInteraction_1 = require("./paginationDBInteraction");
dotenv_1.default.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
const llm = new openai_1.ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: openaiApiKey,
    temperature: 0.5,
    maxTokens: 16384,
    topP: 0.5,
    presencePenalty: 0.8,
});
const history = new chat_history_1.InMemoryChatMessageHistory();
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "User: ",
});
const spinnerChars = ["|", "/", "-", "\\"];
let spinnerIndex = 0;
let spinnerInterval;
function startSpinner(pageNumber) {
    spinnerInterval = setInterval(() => {
        process.stdout.write(`\rGenerating the Page ${pageNumber} Contents of the Magazine... ${spinnerChars[spinnerIndex++]}`);
        spinnerIndex %= spinnerChars.length;
    }, 100);
}
function stopSpinner() {
    if (spinnerInterval) {
        clearInterval(spinnerInterval);
    }
}
async function startChat() {
    try {
        await (0, paginationDBInteraction_1.initMongo)();
        const previousContext = await (0, paginationDBInteraction_1.fetchPreviousContext)();
        let latestUserPrompt = "";
        let latestAIReply = "";
        if (previousContext) {
            latestUserPrompt = previousContext.latestUserPrompt || "";
            if (previousContext.latestAIReply && Array.isArray(previousContext.latestAIReply.pages)) {
                latestAIReply = previousContext.latestAIReply.pages
                    .map((page) => page.content)
                    .filter((content) => content)
                    .join("\n\n\n");
            }
        }
        if (latestUserPrompt && latestAIReply) {
            const previousUserPrompt = "Previous User Prompt:\n" + latestUserPrompt;
            const previousAIReply = "Previous Magazine-AI Reply:\n" + latestAIReply;
            console.log(`\n${previousUserPrompt}\n${previousAIReply}`);
        }
        const totalPages = (0, pageExtractor_1.getTotalPages)();
        console.log("======================================================================================");
        console.log(`Total Pages to be generated in the Magazine: ${totalPages}`);
        rl.prompt();
        rl.on("line", async (userInput) => {
            if (userInput.toLowerCase() === "exit") {
                console.log("Ending chat session.");
                rl.close();
                return;
            }
            for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
                console.log(`\nProcessing Page ${pageNumber} :\n`);
                const systemMessage = (0, paginationSystemMessage_1.getPaginationSystemMessage)(pageNumber);
                history.addMessage(systemMessage);
                const startTime = Date.now();
                const userMessage = new messages_1.HumanMessage(userInput);
                await (0, paginationDBInteraction_1.appendMessage)(pageNumber, "user", userInput);
                history.addMessage(userMessage);
                startSpinner(pageNumber);
                const messages = (await history.getMessages())
                    .map((message) => message.content)
                    .filter((content) => typeof content === "string");
                try {
                    const response = await llm.invoke(messages);
                    stopSpinner();
                    const endTime = Date.now();
                    const elapsedTime = (endTime - startTime) / 1000;
                    const content = Array.isArray(response.content)
                        ? response.content.map((item) => item.text).join(" ")
                        : response.content;
                    const tokenUsage = response.usage_metadata;
                    console.log(`\rPage ${pageNumber} - Magazine-AI: ${content}`);
                    history.addMessage(new messages_1.AIMessage(content));
                    await (0, paginationDBInteraction_1.appendMessage)(pageNumber, "ai", content);
                    console.log("===================================================================================");
                    console.log(`Time taken: ${elapsedTime.toFixed(2)}s`);
                    if (tokenUsage) {
                        console.log(`Input Tokens: ${tokenUsage.input_tokens}`);
                        console.log(`Output Tokens: ${tokenUsage.output_tokens}`);
                        console.log(`Total Tokens: ${tokenUsage.total_tokens}`);
                    }
                    else {
                        console.log("Token usage data is not available.");
                    }
                }
                catch (error) {
                    stopSpinner();
                    console.error("Error generating content:", error);
                }
            }
            console.log("Completed all pages.");
            rl.prompt();
        });
    }
    catch (error) {
        console.error("Error starting chat:", error);
    }
}
startChat();
