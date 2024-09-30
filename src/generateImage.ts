import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import { fetchPreviousContext, initMongo, appendImageGeneration } from "./DBInteraction";
import { startSpinner, stopSpinner } from "./spinner";
import { parsePageContent, generatePrompt, generateRandomNumber } from "./helpers";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, "..", "images");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});


/**
*Generates an image using OpenAI's DALL-E-3 model based on the refined prompt and saves it to the file system.
* 
* @param refinedPrompt - The refined prompt to generate the image.
* @param pageNumber - The page number associated with the image being generated.
* 
* @returns A promise that resolves when the image is generated and saved, or throws an error if the process fails.
*/
async function generateImage(refinedPrompt: string, pageNumber: number): Promise<void> {
  try {
    startSpinner(pageNumber, "Image");
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: refinedPrompt,
      n: 1,
      size: "1792x1024",
    });

    const imageUrl = response.data[0].url;

    if (!imageUrl) {
      throw new Error("Image URL is undefined");
    }

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageFileName = path.join(OUTPUT_DIR, `Magazine-${generateRandomNumber()}-Page_${pageNumber}.png`);
    fs.writeFileSync(imageFileName, Buffer.from(imageBuffer));

    console.log(`Image for page ${pageNumber} saved to ${imageFileName}`);
    await appendImageGeneration(pageNumber, imageUrl, refinedPrompt);
    stopSpinner();
  } catch (error) {
    console.error(`Error generating image for prompt "${refinedPrompt}":`, error);
  }
}


/**
 * Processes all the pages from the latest AI response, generates prompts for each page, and generates an image for each one.
 * 
 * @returns A promise that resolves when all images are generated for all pages or logs an error if something goes wrong.
 */
async function generateImagesForAllPages(): Promise<void> {
  const context = await fetchPreviousContext();

  if (context.latestAIReply && context.latestAIReply.pages.length > 0) {
    const pages = context.latestAIReply.pages;

    for (let i = 0; i < pages.length; i++) {
      const parsedContent = parsePageContent(pages[i].content);

      try {
        const refinedPrompt = await generatePrompt(parsedContent, i + 1);
        await generateImage(refinedPrompt, i + 1);
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
      }
    }
    console.log("Image generation process completed.");
  } else {
    console.log("No pages available for image generation.");
  }
}

export { generateImagesForAllPages };
