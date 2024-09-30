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
exports.generateImagesForAllPages = generateImagesForAllPages;
const openai_1 = require("openai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DBInteraction_1 = require("./DBInteraction");
const spinner_1 = require("./spinner");
const helpers_1 = require("./helpers");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path_1.default.join(__dirname, "..", "images");
if (!fs_1.default.existsSync(OUTPUT_DIR)) {
    fs_1.default.mkdirSync(OUTPUT_DIR);
}
const openai = new openai_1.OpenAI({
    apiKey: OPENAI_API_KEY,
});
/**
*Generates an image using OpenAI's DALL-E-3 model based on the refined prompt and saves it to the file system.
*
* @param refinedPrompt - The refined prompt to generate the image.
* @param pageNumber - The page number associated with the image being generated.
*
* @returns A promise that resolves when the image is generated and saved, or throws an error if the process fails.
*/
function generateImage(refinedPrompt, pageNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, spinner_1.startSpinner)(pageNumber, "Image");
            const response = yield openai.images.generate({
                model: "dall-e-3",
                prompt: refinedPrompt,
                n: 1,
                size: "1792x1024",
            });
            const imageUrl = response.data[0].url;
            if (!imageUrl) {
                throw new Error("Image URL is undefined");
            }
            const imageResponse = yield fetch(imageUrl);
            const imageBuffer = yield imageResponse.arrayBuffer();
            const imageFileName = path_1.default.join(OUTPUT_DIR, `Magazine-${(0, helpers_1.generateRandomNumber)()}-Page_${pageNumber}.png`);
            fs_1.default.writeFileSync(imageFileName, Buffer.from(imageBuffer));
            console.log(`Image for page ${pageNumber} saved to ${imageFileName}`);
            yield (0, DBInteraction_1.appendImageGeneration)(pageNumber, imageUrl, refinedPrompt);
            (0, spinner_1.stopSpinner)();
        }
        catch (error) {
            console.error(`Error generating image for prompt "${refinedPrompt}":`, error);
        }
    });
}
/**
 * Processes all the pages from the latest AI response, generates prompts for each page, and generates an image for each one.
 *
 * @returns A promise that resolves when all images are generated for all pages or logs an error if something goes wrong.
 */
function generateImagesForAllPages() {
    return __awaiter(this, void 0, void 0, function* () {
        const context = yield (0, DBInteraction_1.fetchPreviousContext)();
        if (context.latestAIReply && context.latestAIReply.pages.length > 0) {
            const pages = context.latestAIReply.pages;
            for (let i = 0; i < pages.length; i++) {
                const parsedContent = (0, helpers_1.parsePageContent)(pages[i].content);
                try {
                    const refinedPrompt = yield (0, helpers_1.generatePrompt)(parsedContent, i + 1);
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
