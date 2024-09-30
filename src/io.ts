import readline from "readline";
import { getTotalPages } from "./pageExtractor";
import { generateMagazine } from "./generateContent";
import { initMongo } from "./DBInteraction";
import { showPreviousContext } from "./showPreviousContext";
import { generateImagesForAllPages } from "./generateImage";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "User: ",
});

async function askForImageGeneration() {
  rl.question("Do you want to generate Images for the magazine also? (Yes/No): ", async (answer: string) => {
    if (answer.toLowerCase() === "yes") {
      console.log("Starting image generation for the magazine...");
      await generateImagesForAllPages();
      console.log("Image generation completed.");
      rl.close();
    } else if (answer.toLowerCase() === "no") {
      console.log("Exiting the program.");
      rl.close();
    } else {
      console.log("Invalid input. Please type 'Yes' or 'No'.");
      askForImageGeneration();
    }
  });
}

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
      await askForImageGeneration();
    });
  } catch (error) {
    console.error("Error starting chat:", error);
  }
}

startChat();
