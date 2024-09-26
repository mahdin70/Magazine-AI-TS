import readline from "readline";
import { getTotalPages } from "./pageExtractor";
import { generateMagazine } from "./aiInteraction";
import { initMongo } from "./paginationDBInteraction";
import { showPreviousContext } from "./showPreviousContext";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "User: ",
});

export async function startChat(): Promise<void> {
  try {
    await initMongo();
    const previousContext = await showPreviousContext();
    if (previousContext) {
      const { latestUserPrompt, latestAIReply } = previousContext;

      if (latestUserPrompt && latestAIReply) {
        console.log(`\nPrevious User Prompt:\n${latestUserPrompt}`);
        console.log(`\nPrevious Magazine-AI Reply:\n${latestAIReply}`);
      }
    }

    const totalPages = getTotalPages();
    console.log("======================================================================================");
    console.log(`Total Pages to be generated in the Magazine: ${totalPages}`);

    rl.prompt();

    rl.on("line", async (userInput: string) => {
      if (userInput.toLowerCase() === "exit") {
        console.log("Ending chat session.");
        rl.close();
        return;
      }

      await generateMagazine(userInput, (pageNumber, content, tokenUsage) => {
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
    });
  } catch (error) {
    console.error("Error starting chat:", error);
  }
}

startChat();
