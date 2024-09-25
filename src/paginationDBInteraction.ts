import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";
import { getLayoutDetailsForPage, getTextFromLayoutForPage } from "./pageExtractor";

const mongoUri: string = process.env.MONGO_URI || "";
const client: MongoClient = new MongoClient(mongoUri);

const dbName: string = "MagazineAIChatDatabase";
let db: any;
let chatCollection: any;

async function initMongo(): Promise<void> {
  try {
    await client.connect();
    db = client.db(dbName);
    chatCollection = db.collection("NewChatHistory");
    console.log("MongoDB connected and collection initialized.");
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

async function appendMessage(pageNumber: number, role: "user" | "ai", content: string): Promise<void> {
  try {
    const conversation = await chatCollection.findOne({});
    const timestamp = new Date();

    const layoutDetails: string = getLayoutDetailsForPage(pageNumber);
    const layoutText: string = getTextFromLayoutForPage(pageNumber);

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
      const updates: any = {};

      if (role === "user") {
        if (!conversation.firstUserPrompt) {
          updates.firstUserPrompt = content;
        }
        updates.latestUserPrompt = content;
      }

      if (role === "ai") {
        const aiReplyEntry = { pageNumber, content };

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

        if (!conversation.latestAIReply) {
          updates.latestAIReply = { pages: [aiReplyEntry] };
        } else {
          updates["latestAIReply.pages"] = updateOrInsertPage([...conversation.latestAIReply.pages], aiReplyEntry);
        }

        if (
          !conversation.layoutDetails ||
          !conversation.layoutDetails.pages.some((page: { pageNumber: number }) => page.pageNumber === pageNumber)
        ) {
          updates["layoutDetails.pages"] = conversation.layoutDetails
            ? [...conversation.layoutDetails.pages, { pageNumber, content: layoutDetails }]
            : [{ pageNumber, content: layoutDetails }];
        }

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
