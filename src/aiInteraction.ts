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

export async function generateMagazine(
  userInput: string,
  callback: (pageNumber: number, content: string, tokenUsage?: any) => void
): Promise<void> {
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    openAIApiKey: openaiApiKey,
    temperature: 0.5,
    maxTokens: 16384,
    topP: 0.5,
    presencePenalty: 0.8,
  });

  const history = new InMemoryChatMessageHistory();

  const totalPages = getTotalPages();

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    startSpinner(pageNumber);

    const systemMessage = getPaginationSystemMessage(pageNumber);
    history.addMessage(systemMessage);
    const userMessage = new HumanMessage(userInput);
    history.addMessage(userMessage);
    await appendMessage(pageNumber, "user", userInput);

    try {
      const messages = (await history.getMessages())
        .map((message) => message.content)
        .filter((content): content is string => typeof content === "string");

      const response = await llm.invoke(messages);
      const content = Array.isArray(response.content) ? response.content.map((item: any) => item.text).join(" ") : response.content;

      const aiMessage = new AIMessage(content);
      history.addMessage(aiMessage);
      await appendMessage(pageNumber, "ai", content);

      const tokenUsage = response.usage_metadata;

      stopSpinner();
      callback(pageNumber, content, tokenUsage);
    } catch (error) {
      console.error(`Error generating content for page ${pageNumber}:`, error);
      stopSpinner();
    }
  }
}
