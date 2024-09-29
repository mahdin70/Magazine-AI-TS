import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { startSpinner, stopSpinner } from "./spinner";
import dotenv from "dotenv";

dotenv.config();

const openaiApiKey: string = process.env.OPENAI_API_KEY!;

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  openAIApiKey: openaiApiKey,
  temperature: 0.5,
  maxTokens: 1000,
});

/**
 * Parses the page content and removes unwanted layout markers.
 *
 * @param content - The content to be parsed.
 * @returns The parsed content string.
 */
function parsePageContent(content: string): string {
  return content.replace(/\*\*LAYOUT_[A-Z_]*:\*\*/g, "").trim();
}

/**
 * Generates a detailed prompt for image generation using LangChain's OpenAI model.
 *
 * @param parsedContent - The content parsed from the page.
 * @param pageNumber - The current page number.
 * @returns A promise resolving to the generated prompt string.
 */
async function generatePrompt(parsedContent: string, pageNumber: number): Promise<string> {
  const history = new InMemoryChatMessageHistory();
  try {
    startSpinner(pageNumber, "Image Generating Prompt");

    const systemMessage = new SystemMessage({
      content:
        "You are a helpful assistant that specializes in generating detailed, realistic prompts for photo-realistic image generation.",
    });
    history.addMessage(systemMessage);

    const userMessage = new HumanMessage({
      content: `Generate a detailed and realistic image prompt based on the following content, focusing on lifelike elements, textures, and lighting: ${parsedContent}`
    });
    history.addMessage(userMessage);

    const response = await llm.invoke(await history.getMessages());

    const refinedPrompt = typeof response?.content === "string" ? response.content.trim() : "";
    console.log(`Generated Better Prompt:\n ${refinedPrompt}`);

    stopSpinner();
    return refinedPrompt;
  } catch (error) {
    console.error("Error generating prompt:", error);
    stopSpinner();
    throw error;
  }
}

function generateRandomNumber(): number {
  return Math.floor(Math.random() * 1000);
}

export { parsePageContent, generatePrompt, generateRandomNumber };
