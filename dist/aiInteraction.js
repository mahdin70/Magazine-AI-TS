"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMagazine = generateMagazine;
const openai_1 = require("@langchain/openai");
const messages_1 = require("@langchain/core/messages");
const chat_history_1 = require("@langchain/core/chat_history");
const paginationDBInteraction_1 = require("./paginationDBInteraction");
const paginationSystemMessage_1 = require("./paginationSystemMessage");
const spinner_1 = require("./spinner");
const pageExtractor_1 = require("./pageExtractor");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
async function generateMagazine(userInput, callback) {
    const llm = new openai_1.ChatOpenAI({
        model: "gpt-4o-mini",
        openAIApiKey: openaiApiKey,
        temperature: 0.5,
        maxTokens: 16384,
        topP: 0.5,
        presencePenalty: 0.8,
    });
    const history = new chat_history_1.InMemoryChatMessageHistory();
    const totalPages = (0, pageExtractor_1.getTotalPages)();
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        (0, spinner_1.startSpinner)(pageNumber);
        const systemMessage = (0, paginationSystemMessage_1.getPaginationSystemMessage)(pageNumber);
        history.addMessage(systemMessage);
        const userMessage = new messages_1.HumanMessage(userInput);
        history.addMessage(userMessage);
        await (0, paginationDBInteraction_1.appendMessage)(pageNumber, "user", userInput);
        try {
            const messages = (await history.getMessages())
                .map((message) => message.content)
                .filter((content) => typeof content === "string");
            const response = await llm.invoke(messages);
            const content = Array.isArray(response.content) ? response.content.map((item) => item.text).join(" ") : response.content;
            const aiMessage = new messages_1.AIMessage(content);
            history.addMessage(aiMessage);
            await (0, paginationDBInteraction_1.appendMessage)(pageNumber, "ai", content);
            const tokenUsage = response.usage_metadata;
            (0, spinner_1.stopSpinner)();
            callback(pageNumber, content, tokenUsage);
        }
        catch (error) {
            console.error(`Error generating content for page ${pageNumber}:`, error);
            (0, spinner_1.stopSpinner)();
        }
    }
}
