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
exports.appendImageGeneration = appendImageGeneration;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongodb_1 = require("mongodb");
const pageExtractor_1 = require("./pageExtractor");
// MongoDB connection URI and client initialization
const mongoUri = process.env.MONGO_URI || "";
const client = new mongodb_1.MongoClient(mongoUri);
const dbName = "MagazineAIContextDB";
let db;
let chatCollection;
/**
 * Initializes a connection to the MongoDB database.
 * This function connects to MongoDB using the provided URI from the `.env` file,
 * initializes the `db` and `chatCollection` variables, and logs a success message.
 * If the connection fails, it logs the error.
 *
 * @async
 * @returns {Promise<void>} Resolves when the connection is established, or rejects if there's an error.
 */
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
/**
 * Appends a message to the conversation context in MongoDB.
 * This function stores layout details, layout text, and the user or AI content
 * based on the provided role. It updates the existing conversation or creates a new entry if it doesn't exist.
 *
 * @param {number} pageNumber - The page number associated with the content.
 * @param {"user" | "ai"} role - The role of the content sender ("user" or "ai").
 * @param {string} content - The content of the message to append to the context.
 * @returns {Promise<void>} A promise that resolves when the message is successfully appended.
 */
function appendMessage(pageNumber, role, content) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conversation = yield chatCollection.findOne({});
            const timestamp = new Date();
            // Fetching layout details and text for the specified page number
            const layoutDetails = (0, pageExtractor_1.getLayoutDetailsForPage)(pageNumber);
            const layoutText = (0, pageExtractor_1.getTextFromLayoutForPage)(pageNumber);
            /**
             * Updates an existing page's content or inserts a new page entry
             * into an array of pages. This function is designed to manage
             * the collection of pages within the conversation data.
             *
             * @param pages - An array of existing page objects, where each
             *                object contains a `pageNumber` and corresponding
             *                `content`.
             * @param newPage - An object representing the new page to be added,
             *                  which includes its `pageNumber` and `content`.
             *
             * @returns An updated array of pages after either modification
             *          or addition of the new page.
             */
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
                const updates = {}; // Object to hold updates for MongoDB
                if (role === "user") {
                    if (!conversation.firstUserPrompt) {
                        updates.firstUserPrompt = content; // Store first user prompt if not already present
                    }
                    updates.latestUserPrompt = content; // Update latest user prompt
                }
                if (role === "ai") {
                    const aiReplyEntry = { pageNumber, content };
                    // Handling first AI reply
                    if (!conversation.firstAIReply ||
                        !conversation.firstAIReply.pages.some((page) => page.pageNumber === pageNumber)) {
                        if (!conversation.firstAIReply) {
                            updates.firstAIReply = { pages: [aiReplyEntry] };
                        }
                        else {
                            updates["firstAIReply.pages"] = updateOrInsertPage([...conversation.firstAIReply.pages], aiReplyEntry);
                        }
                    }
                    // Handling latest AI reply
                    if (!conversation.latestAIReply) {
                        updates.latestAIReply = { pages: [aiReplyEntry] };
                    }
                    else {
                        updates["latestAIReply.pages"] = updateOrInsertPage([...conversation.latestAIReply.pages], aiReplyEntry);
                    }
                    // Handling layout details
                    if (!conversation.layoutDetails ||
                        !conversation.layoutDetails.pages.some((page) => page.pageNumber === pageNumber)) {
                        updates["layoutDetails.pages"] = conversation.layoutDetails
                            ? [...conversation.layoutDetails.pages, { pageNumber, content: layoutDetails }]
                            : [{ pageNumber, content: layoutDetails }];
                    }
                    // Handling layout text
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
/**
 * Appends image generation details (imageURL and imagePrompt) to the latestImageGeneration field in MongoDB.
 * This function updates the conversation context with the image generation data for a specific page.
 *
 * @param {number} pageNumber - The page number associated with the image generation.
 * @param {string} imageURL - The URL of the generated image.
 * @param {string} imagePrompt - The prompt used to generate the image.
 * @returns {Promise<void>} A promise that resolves when the image generation details are successfully appended.
 */
function appendImageGeneration(pageNumber, imageURL, imagePrompt) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const conversation = yield chatCollection.findOne({});
            const timestamp = new Date();
            const updateOrInsertImageGeneration = (pages, newPage) => {
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
                const imageGenerationEntry = { pageNumber, imageURL, imagePrompt };
                if (!conversation.latestImageGeneration) {
                    updates.latestImageGeneration = { pages: [imageGenerationEntry] };
                }
                else {
                    updates["latestImageGeneration.pages"] = updateOrInsertImageGeneration([...conversation.latestImageGeneration.pages], imageGenerationEntry);
                }
                yield chatCollection.updateOne({}, { $set: Object.assign(Object.assign({}, updates), { updatedAt: timestamp }) });
            }
            else {
                const newEntry = {
                    latestImageGeneration: { pages: [{ pageNumber, imageURL, imagePrompt }] },
                    createdAt: timestamp,
                    updatedAt: timestamp,
                };
                yield chatCollection.insertOne(newEntry);
            }
        }
        catch (error) {
            console.error("Error appending image generation:", error);
        }
    });
}
/**
 * Fetches the previous conversation context from MongoDB.
 * This function retrieves the stored conversation details, including prompts, replies, and layout information.
 *
 * @returns {Promise<any>} A promise that resolves with the conversation context or an empty object if none exists.
 */
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
