import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import { getLayoutDetailsForPage, getTextFromLayoutForPage } from "./pageExtractor";

// MongoDB connection URI and client initialization
const mongoUri: string = process.env.MONGO_URI || "";
const client: MongoClient = new MongoClient(mongoUri);

const dbName: string = "MagazineAIContextDB";
let db: any;
let chatCollection: any;

/**
 * Initializes a connection to the MongoDB database.
 * This function connects to MongoDB using the provided URI from the `.env` file,
 * initializes the `db` and `chatCollection` variables, and logs a success message.
 * If the connection fails, it logs the error.
 *
 * @async
 * @returns {Promise<void>} Resolves when the connection is established, or rejects if there's an error.
 */
async function initMongo(): Promise<void> {
  try {
    await client.connect();
    db = client.db(dbName);
    chatCollection = db.collection("ContextThread");
    console.log("MongoDB connected and collection initialized.");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
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
async function appendMessage(pageNumber: number, role: "user" | "ai", content: string): Promise<void> {
  try {
    const conversation = await chatCollection.findOne({});
    const timestamp = new Date();

    // Fetching layout details and text for the specified page number
    const layoutDetails: string = getLayoutDetailsForPage(pageNumber);
    const layoutText: string = getTextFromLayoutForPage(pageNumber);

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
    const updateOrInsertPage = (
      pages: Array<{ pageNumber: number; content: string }>,
      newPage: { pageNumber: number; content: string }
    ) => {
      const pageIndex = pages.findIndex((page) => page.pageNumber === newPage.pageNumber);
      if (pageIndex > -1) {
        pages[pageIndex] = newPage;
      } else {
        pages.push(newPage);
      }
      return pages;
    };

    if (conversation) {
      const updates: any = {}; // Object to hold updates for MongoDB

      if (role === "user") {
        if (!conversation.firstUserPrompt) {
          updates.firstUserPrompt = content; // Store first user prompt if not already present
        }
        updates.latestUserPrompt = content; // Update latest user prompt
      }

      if (role === "ai") {
        const aiReplyEntry = { pageNumber, content };

        // Handling first AI reply
        if (
          !conversation.firstAIReply ||
          !conversation.firstAIReply.pages.some((page: { pageNumber: number }) => page.pageNumber === pageNumber)
        ) {
          if (!conversation.firstAIReply) {
            updates.firstAIReply = { pages: [aiReplyEntry] };
          } else {
            updates["firstAIReply.pages"] = updateOrInsertPage([...conversation.firstAIReply.pages], aiReplyEntry);
          }
        }

        // Handling latest AI reply
        if (!conversation.latestAIReply) {
          updates.latestAIReply = { pages: [aiReplyEntry] };
        } else {
          updates["latestAIReply.pages"] = updateOrInsertPage([...conversation.latestAIReply.pages], aiReplyEntry);
        }

        // Handling layout details
        if (
          !conversation.layoutDetails ||
          !conversation.layoutDetails.pages.some((page: { pageNumber: number }) => page.pageNumber === pageNumber)
        ) {
          updates["layoutDetails.pages"] = conversation.layoutDetails
            ? [...conversation.layoutDetails.pages, { pageNumber, content: layoutDetails }]
            : [{ pageNumber, content: layoutDetails }];
        }

        // Handling layout text
        if (
          !conversation.layoutText ||
          !conversation.layoutText.pages.some((page: { pageNumber: number }) => page.pageNumber === pageNumber)
        ) {
          updates["layoutText.pages"] = conversation.layoutText
            ? [...conversation.layoutText.pages, { pageNumber, content: layoutText }]
            : [{ pageNumber, content: layoutText }];
        }
      }

      await chatCollection.updateOne({}, { $set: { ...updates, updatedAt: timestamp } });
    } else {
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

      await chatCollection.insertOne(newEntry);
    }
  } catch (error) {
    console.error("Error appending message:", error);
  }
}

/**
 * Fetches the previous conversation context from MongoDB.
 * This function retrieves the stored conversation details, including prompts, replies, and layout information.
 *
 * @returns {Promise<any>} A promise that resolves with the conversation context or an empty object if none exists.
 */
async function fetchPreviousContext(): Promise<any> {
  try {
    const conversation = await chatCollection.findOne({});

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
  } catch (error) {
    console.error("Error fetching previous context:", error);
    return {};
  }
}

export { appendMessage, fetchPreviousContext, initMongo };
