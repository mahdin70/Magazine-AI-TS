import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { appendMessage } from "./paginationDBInteraction";
import { getPaginationSystemMessage } from "./paginationSystemMessage";
import { startSpinner, stopSpinner } from "./spinner";
import { getTotalPages } from "./pageExtractor";

import dotenv from "dotenv";
dotenv.config();

const openaiApiKey: string = process.env.OPENAI_API_KEY!;

/**
 * Generates magazine content by interacting with the OpenAI API
 * and handling pagination for multiple pages.
 *
 * @param userInput - The input provided by the user for content generation.
 * @param callback - A callback function that is invoked after each page is generated.
 *                    It receives the page number, generated content, and token usage metadata.
 *
 * @returns A promise that resolves when the content generation is complete.
 */
export async function generateMagazine(
  userInput: string,
  callback: (pageNumber: number, content: string, tokenUsage?: any) => void): Promise<void> {
  // Initialize the OpenAI model with specified configurations
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: openaiApiKey,
    temperature: 0.5,
    maxTokens: 16384,
    topP: 0.5,
    presencePenalty: 0.8,
  });

  // Initialize in-memory message history to track conversation context
  const history = new InMemoryChatMessageHistory();

  const totalPages = getTotalPages();

  // Loop through each page number for content generation
  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    startSpinner(pageNumber, "Contents of the Magazine"); // Start the spinner for content generation

    const systemMessage = getPaginationSystemMessage(pageNumber);
    history.addMessage(systemMessage); // Add system message to history
    const userMessage = new HumanMessage(userInput);
    history.addMessage(userMessage); // Add user message to history
    await appendMessage(pageNumber, "user", userInput); // Append user message to the database

    try {
      // Construct the message array from history and invoke the OpenAI model
      const messages = (await history.getMessages())
        .map((message) => message.content)
        .filter((content): content is string => typeof content === "string");

      const response = await llm.invoke(messages);
      const content = Array.isArray(response.content) ? response.content.map((item: any) => item.text).join(" ") : response.content;

      const aiMessage = new AIMessage(content);
      history.addMessage(aiMessage); // Add AI response to history
      await appendMessage(pageNumber, "ai", content); // Append AI response to the database
      const tokenUsage = response.usage_metadata; // Retrieve token usage metadata

      stopSpinner();
      callback(pageNumber, content, tokenUsage); // Call the callback function with generated data
    } catch (error) {
      console.error(`Error generating content for page ${pageNumber}:`, error);
      stopSpinner();
    }
  }
}
