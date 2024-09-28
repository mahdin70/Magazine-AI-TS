"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
/**
 * Generates magazine content by interacting with the OpenAI API
 * and handling pagination for multiple pages.
 *
 * @param userInput - The input provided by the user for content generation.
 * @param callback - A callback function that is invoked after each page is generated.It receives the page number, generated content, and token usage metadata.
 * @returns A promise that resolves when the content generation is complete.
 */
function generateMagazine(userInput, callback) {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize the OpenAI model with specified configurations
        const llm = new openai_1.ChatOpenAI({
            model: "gpt-4o-mini",
            openAIApiKey: openaiApiKey,
            temperature: 0.5,
            maxTokens: 16384,
            topP: 0.5,
            presencePenalty: 0.8,
        });
        // Initialize in-memory message history to track conversation context
        const history = new chat_history_1.InMemoryChatMessageHistory();
        const totalPages = (0, pageExtractor_1.getTotalPages)();
        // Loop through each page number for content generation
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
            (0, spinner_1.startSpinner)(pageNumber, "Contents of the Magazine"); // Start the spinner for content generation
            const systemMessage = (0, paginationSystemMessage_1.getPaginationSystemMessage)(pageNumber);
            history.addMessage(systemMessage); // Add system message to history
            const userMessage = new messages_1.HumanMessage(userInput);
            history.addMessage(userMessage); // Add user message to history
            yield (0, paginationDBInteraction_1.appendMessage)(pageNumber, "user", userInput); // Append user message to the database
            try {
                // Construct the message array from history and invoke the OpenAI model
                const messages = (yield history.getMessages())
                    .map((message) => message.content)
                    .filter((content) => typeof content === "string");
                const response = yield llm.invoke(messages);
                const content = Array.isArray(response.content) ? response.content.map((item) => item.text).join(" ") : response.content;
                const aiMessage = new messages_1.AIMessage(content);
                history.addMessage(aiMessage); // Add AI response to history
                yield (0, paginationDBInteraction_1.appendMessage)(pageNumber, "ai", content); // Append AI response to the database
                const tokenUsage = response.usage_metadata; // Retrieve token usage metadata
                (0, spinner_1.stopSpinner)();
                callback(pageNumber, content, tokenUsage); // Call the callback function with generated data
            }
            catch (error) {
                console.error(`Error generating content for page ${pageNumber}:`, error);
                (0, spinner_1.stopSpinner)();
            }
        }
    });
}
