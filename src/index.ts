import dotenv from "dotenv";
dotenv.config();
import readline from "readline";
import { getTotalPages } from "./pageExtractor";
import { getPaginationSystemMessage } from "./paginationSystemMessage";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { InMemoryChatMessageHistory } from "@langchain/core/chat_history";
import { initMongo, appendMessage, fetchPreviousContext } from "./paginationDBInteraction";

dotenv.config();

const openaiApiKey: string = process.env.OPENAI_API_KEY!;
const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
  openAIApiKey: openaiApiKey,
  temperature: 0.5,
  maxTokens: 16384,
  topP: 0.5,
  presencePenalty: 0.8,
});

const history = new InMemoryChatMessageHistory();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "User: ",
});

const spinnerChars: string[] = ["|", "/", "-", "\\"];
let spinnerIndex: number = 0;
let spinnerInterval: NodeJS.Timeout | undefined;

function startSpinner(pageNumber: number): void {
  spinnerInterval = setInterval(() => {
    process.stdout.write(`\rGenerating the Page ${pageNumber} Contents of the Magazine... ${spinnerChars[spinnerIndex++]}`);
    spinnerIndex %= spinnerChars.length;
  }, 100);
}

function stopSpinner(): void {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
  }
}

async function startChat(): Promise<void> {
  try {
    await initMongo();

    const previousContext = await fetchPreviousContext();
    let latestUserPrompt: string = "";
    let latestAIReply: string = "";

    if (previousContext) {
      latestUserPrompt = previousContext.latestUserPrompt || "";
      if (previousContext.latestAIReply && Array.isArray(previousContext.latestAIReply.pages)) {
        latestAIReply = previousContext.latestAIReply.pages
          .map((page: { content: string }) => page.content)
          .filter((content: string) => content)
          .join("\n\n\n");
      }
    }

    if (latestUserPrompt && latestAIReply) {
      const previousUserPrompt = "Previous User Prompt:\n" + latestUserPrompt;
      const previousAIReply = "Previous Magazine-AI Reply:\n" + latestAIReply;

      console.log(`\n${previousUserPrompt}\n${previousAIReply}`);
    }

    const totalPages: number = getTotalPages();
    console.log("======================================================================================");
    console.log(`Total Pages to be generated in the Magazine: ${totalPages}`);

    rl.prompt();

    rl.on("line", async (userInput: string) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Ending chat session.");
        rl.close();
        return;
      }

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        console.log(`\nProcessing Page ${pageNumber} :\n`);

        const systemMessage = getPaginationSystemMessage(pageNumber);
        history.addMessage(systemMessage);
        const startTime: number = Date.now();

        const userMessage = new HumanMessage(userInput);
        await appendMessage(pageNumber, "user", userInput);
        history.addMessage(userMessage);

        startSpinner(pageNumber);
        const messages: string[] = (await history.getMessages())
          .map((message) => message.content)
          .filter((content): content is string => typeof content === "string");

        try {
          const response = await llm.invoke(messages); 
          stopSpinner();

          const endTime: number = Date.now();
          const elapsedTime: number = (endTime - startTime) / 1000;

          const content: string = Array.isArray(response.content)
            ? response.content.map((item: any) => item.text).join(" ")
            : response.content;
          const tokenUsage = response.usage_metadata;

          console.log(`\rPage ${pageNumber} - Magazine-AI: ${content}`);

          history.addMessage(new AIMessage(content));
          await appendMessage(pageNumber, "ai", content);

          console.log("===================================================================================");
          console.log(`Time taken: ${elapsedTime.toFixed(2)}s`);
          if (tokenUsage) {
            console.log(`Input Tokens: ${tokenUsage.input_tokens}`);
            console.log(`Output Tokens: ${tokenUsage.output_tokens}`);
            console.log(`Total Tokens: ${tokenUsage.total_tokens}`);
          } else {
            console.log("Token usage data is not available.");
          }
        } catch (error) {
          stopSpinner();
          console.error("Error generating content:", error);
        }
      }

      console.log("Completed all pages.");
      rl.prompt();
    });
  } catch (error) {
    console.error("Error starting chat:", error);
  }
}

startChat();
