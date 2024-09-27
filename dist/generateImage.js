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
const openai_1 = require("openai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paginationDBInteraction_1 = require("./paginationDBInteraction");
const spinner_1 = require("./spinner");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path_1.default.join(__dirname, "..", "images");
if (!fs_1.default.existsSync(OUTPUT_DIR)) {
    fs_1.default.mkdirSync(OUTPUT_DIR);
}
const openai = new openai_1.OpenAI({
    apiKey: OPENAI_API_KEY,
});
function parsePageContent(content) {
    return content.replace(/\*\*LAYOUT_[A-Z_]*:\*\*/g, "").trim();
}
function generatePrompt(parsedContent, pageNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d;
        try {
            (0, spinner_1.startSpinner)(pageNumber, "Image Generating Prompt");
            const response = yield openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that specializes in generating detailed, realistic prompts for photo-realistic image generation."
                    },
                    {
                        role: "user",
                        content: `Generate a detailed and realistic image prompt based on the following content, focusing on lifelike elements, textures, and natural lighting: ${parsedContent}`
                    }
                ]
            });
            (0, spinner_1.stopSpinner)();
            const refinedPrompt = (_d = (_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "";
            console.log(`Generated Better Prompt:\n ${refinedPrompt}`);
            return refinedPrompt;
        }
        catch (error) {
            console.error("Error generating better prompt:", error);
            throw error;
        }
    });
}
function generateImage(refinedPrompt, pageNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, spinner_1.startSpinner)(pageNumber, "Image");
            const response = yield openai.images.generate({
                model: "dall-e-3",
                prompt: refinedPrompt,
                n: 1,
                size: "1024x1024",
            });
            const imageUrl = response.data[0].url;
            if (!imageUrl) {
                throw new Error("Image URL is undefined");
            }
            const imageResponse = yield fetch(imageUrl);
            const imageBuffer = yield imageResponse.arrayBuffer();
            const imageFileName = path_1.default.join(OUTPUT_DIR, `Page_${pageNumber}.png`);
            fs_1.default.writeFileSync(imageFileName, Buffer.from(imageBuffer));
            (0, spinner_1.stopSpinner)();
            console.log(`Image for page ${pageNumber} saved to ${imageFileName}`);
        }
        catch (error) {
            console.error(`Error generating image for prompt "${refinedPrompt}":`, error);
        }
    });
}
function generateImagesForAllPages() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, paginationDBInteraction_1.initMongo)();
        const context = yield (0, paginationDBInteraction_1.fetchPreviousContext)();
        if (context.latestAIReply && context.latestAIReply.pages.length > 0) {
            const pages = context.latestAIReply.pages;
            for (let i = 0; i < pages.length; i++) {
                const parsedContent = parsePageContent(pages[i].content);
                try {
                    const refinedPrompt = yield generatePrompt(parsedContent, i + 1);
                    yield generateImage(refinedPrompt, i + 1);
                }
                catch (error) {
                    console.error(`Error processing page ${i + 1}:`, error);
                }
            }
            console.log("Image generation process completed.");
        }
        else {
            console.log("No pages available for image generation.");
        }
    });
}
generateImagesForAllPages().catch((error) => console.error("Error in image generation process:", error));
// will be moved to a separate file
