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
exports.appendMessage = appendMessage;
exports.fetchPreviousContext = fetchPreviousContext;
exports.initMongo = initMongo;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongodb_1 = require("mongodb");
const pageExtractor_1 = require("./pageExtractor");
const mongoUri = process.env.MONGO_URI || "";
const client = new mongodb_1.MongoClient(mongoUri);
const dbName = "MagazineAIContextDB";
let db;
let chatCollection;
function initMongo() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield client.connect();
            db = client.db(dbName);
            chatCollection = db.collection("ContextThread");
            console.log("MongoDB connected and collection initialized.");
        }
        catch (error) {
            console.error("Error connecting to MongoDB", error);
        }
    });
}
function appendMessage(pageNumber, role, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conversation = yield chatCollection.findOne({});
            const timestamp = new Date();
            const layoutDetails = (0, pageExtractor_1.getLayoutDetailsForPage)(pageNumber);
            const layoutText = (0, pageExtractor_1.getTextFromLayoutForPage)(pageNumber);
            const updateOrInsertPage = (pages, newPage) => {
                const pageIndex = pages.findIndex((page) => page.pageNumber === newPage.pageNumber);
                if (pageIndex > -1) {
                    pages[pageIndex] = newPage;
                }
                else {
                    pages.push(newPage);
                }
                return pages;
            };
            if (conversation) {
                const updates = {};
                if (role === "user") {
                    if (!conversation.firstUserPrompt) {
                        updates.firstUserPrompt = content;
                    }
                    updates.latestUserPrompt = content;
                }
                if (role === "ai") {
                    const aiReplyEntry = { pageNumber, content };
                    if (!conversation.firstAIReply ||
                        !conversation.firstAIReply.pages.some((page) => page.pageNumber === pageNumber)) {
                        if (!conversation.firstAIReply) {
                            updates.firstAIReply = { pages: [aiReplyEntry] };
                        }
                        else {
                            updates["firstAIReply.pages"] = updateOrInsertPage([...conversation.firstAIReply.pages], aiReplyEntry);
                        }
                    }
                    if (!conversation.latestAIReply) {
                        updates.latestAIReply = { pages: [aiReplyEntry] };
                    }
                    else {
                        updates["latestAIReply.pages"] = updateOrInsertPage([...conversation.latestAIReply.pages], aiReplyEntry);
                    }
                    if (!conversation.layoutDetails ||
                        !conversation.layoutDetails.pages.some((page) => page.pageNumber === pageNumber)) {
                        updates["layoutDetails.pages"] = conversation.layoutDetails
                            ? [...conversation.layoutDetails.pages, { pageNumber, content: layoutDetails }]
                            : [{ pageNumber, content: layoutDetails }];
                    }
                    if (!conversation.layoutText ||
                        !conversation.layoutText.pages.some((page) => page.pageNumber === pageNumber)) {
                        updates["layoutText.pages"] = conversation.layoutText
                            ? [...conversation.layoutText.pages, { pageNumber, content: layoutText }]
                            : [{ pageNumber, content: layoutText }];
                    }
                }
                yield chatCollection.updateOne({}, { $set: Object.assign(Object.assign({}, updates), { updatedAt: timestamp }) });
            }
            else {
                const newEntry = {
                    firstUserPrompt: role === "user" ? content : null,
                    latestUserPrompt: role === "user" ? content : null,
                    firstAIReply: role === "ai" ? { pages: [{ pageNumber, content }] } : null,
                    latestAIReply: role === "ai" ? { pages: [{ pageNumber, content }] } : null,
                    layoutDetails: { pages: [{ pageNumber, content: layoutDetails }] },
                    layoutText: { pages: [{ pageNumber, content: layoutText }] },
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };
                yield chatCollection.insertOne(newEntry);
            }
        }
        catch (error) {
            console.error("Error appending message:", error);
        }
    });
}
function fetchPreviousContext() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conversation = yield chatCollection.findOne({});
            if (conversation) {
                return {
                    firstUserPrompt: conversation.firstUserPrompt || {},
                    firstAIReply: conversation.firstAIReply || { pages: [] },
                    latestUserPrompt: conversation.latestUserPrompt || {},
                    latestAIReply: conversation.latestAIReply || { pages: [] },
                    layoutDetails: conversation.layoutDetails || { pages: [] },
                    layoutText: conversation.layoutText || { pages: [] },
                };
            }
            return {};
        }
        catch (error) {
            console.error("Error fetching previous context:", error);
            return {};
        }
    });
}
