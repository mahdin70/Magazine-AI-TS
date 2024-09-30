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
Object.defineProperty(exports, "__esModule", { value: true });
exports.showPreviousContext = showPreviousContext;
const DBInteraction_1 = require("./DBInteraction");
function showPreviousContext() {
    return __awaiter(this, void 0, void 0, function* () {
        const previousContext = yield (0, DBInteraction_1.fetchPreviousContext)();
        if (previousContext) {
            const latestUserPrompt = previousContext.latestUserPrompt || "";
            const latestAIReply = previousContext.latestAIReply
                ? previousContext.latestAIReply.pages
                    .map((page) => page.content)
                    .filter((content) => content)
                    .join("\n\n\n")
                : "";
            return { latestUserPrompt, latestAIReply };
        }
        return null;
    });
}
