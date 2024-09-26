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
exports.startChat = startChat;
const readline_1 = __importDefault(require("readline"));
const pageExtractor_1 = require("./pageExtractor");
const aiInteraction_1 = require("./aiInteraction");
const paginationDBInteraction_1 = require("./paginationDBInteraction");
const rl = readline_1.default.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "User: ",
});
function startChat() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, paginationDBInteraction_1.initMongo)();
            const previousContext = yield (0, paginationDBInteraction_1.fetchPreviousContext)();
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
                console.log(`\nPrevious User Prompt:\n${latestUserPrompt}`);
                console.log(`Previous Magazine-AI Reply:\n${latestAIReply}`);
            }
            const totalPages = (0, pageExtractor_1.getTotalPages)();
            console.log("======================================================================================");
            console.log(`Total Pages to be generated in the Magazine: ${totalPages}`);
            rl.prompt();
            rl.on("line", (userInput) => __awaiter(this, void 0, void 0, function* () {
                if (userInput.toLowerCase() === "exit") {
                    console.log("Ending chat session.");
                    rl.close();
                    return;
                }
                yield (0, aiInteraction_1.generateMagazine)(userInput, (pageNumber, content, tokenUsage) => {
                    console.log(`\rPage ${pageNumber} - Magazine-AI: ${content}`);
                    if (tokenUsage) {
                        console.log("===================================================================================");
                        console.log(`Input Token for Page ${pageNumber}:`, tokenUsage.input_tokens);
                        console.log(`Output Token for Page ${pageNumber}:`, tokenUsage.output_tokens);
                        console.log(`Total Token for Page ${pageNumber}:`, tokenUsage.total_tokens);
                    }
                    console.log("===================================================================================");
                });
                console.log("Completed all pages.");
                rl.prompt();
            }));
        }
        catch (error) {
            console.error("Error starting chat:", error);
        }
    });
}
startChat();
