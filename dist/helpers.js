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
exports.parsePageContent = parsePageContent;
exports.generatePrompt = generatePrompt;
exports.generateRandomNumber = generateRandomNumber;
const openai_1 = require("@langchain/openai");
const messages_1 = require("@langchain/core/messages");
const chat_history_1 = require("@langchain/core/chat_history");
const spinner_1 = require("./spinner");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const openaiApiKey = process.env.OPENAI_API_KEY;
// Initialize the LangChain LLM instance
const llm = new openai_1.ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: openaiApiKey,
    temperature: 0.5,
    maxTokens: 1000,
});
/**
 * Parses the page content and removes unwanted layout markers.
 *
 * @param content - The content to be parsed.
 * @returns The parsed content string.
 */
function parsePageContent(content) {
    return content.replace(/\*\*LAYOUT_[A-Z_]*:\*\*/g, "").trim();
}
/**
 * Generates a detailed prompt for image generation using LangChain's OpenAI model.
 *
 * @param parsedContent - The content parsed from the page.
 * @param pageNumber - The current page number.
 * @returns A promise resolving to the generated prompt string.
 */
function generatePrompt(parsedContent, pageNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        const history = new chat_history_1.InMemoryChatMessageHistory();
        try {
            (0, spinner_1.startSpinner)(pageNumber, "Image Generating Prompt");
            const systemMessage = new messages_1.SystemMessage({
                content: "You are a helpful assistant that specializes in generating detailed, realistic prompts for photo-realistic image generation.",
            });
            history.addMessage(systemMessage);
            const userMessage = new messages_1.HumanMessage({
                content: `Generate a detailed and realistic image prompt based on the following content, focusing on lifelike elements, textures, and natural lighting: ${parsedContent}`,
            });
            history.addMessage(userMessage);
            const response = yield llm.invoke(yield history.getMessages());
            const refinedPrompt = typeof (response === null || response === void 0 ? void 0 : response.content) === "string" ? response.content.trim() : "";
            console.log(`Generated Better Prompt:\n ${refinedPrompt}`);
            (0, spinner_1.stopSpinner)();
            return refinedPrompt;
        }
        catch (error) {
            console.error("Error generating prompt:", error);
            (0, spinner_1.stopSpinner)();
            throw error;
        }
    });
}
function generateRandomNumber() {
    return Math.floor(Math.random() * 1000);
}
