import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import { fetchPreviousContext, initMongo } from "./paginationDBInteraction";
import { startSpinner, stopSpinner } from "./spinner";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OUTPUT_DIR = path.join(__dirname, "..", "images");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

function parsePageContent(content: string): string {
  return content.replace(/\*\*LAYOUT_[A-Z_]*:\*\*/g, "").trim();
}

async function generatePrompt(parsedContent: string, pageNumber: number): Promise<string> {
  try {
    startSpinner(pageNumber, "Image Generating Prompt");
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that specializes in generating detailed, realistic prompts for photo-realistic image generation."
        },
        {
          role: "user",
          content: `Generate a detailed and realistic image prompt based on the following content, focusing on lifelike elements, textures, and natural lighting: ${parsedContent}`
        }
      ]
    });
    stopSpinner();

    const refinedPrompt = response.choices[0]?.message?.content?.trim() ?? "";
    console.log(`Generated Better Prompt:\n ${refinedPrompt}`);
    return refinedPrompt;
  } catch (error) {
    console.error("Error generating better prompt:", error);
    throw error;
  }
}

async function generateImage(refinedPrompt: string, pageNumber: number): Promise<void> {
  try {
    startSpinner(pageNumber, "Image");
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: refinedPrompt,
      n: 1,
      size: "1024x1024",
    });
    const imageUrl = response.data[0].url;

    if (!imageUrl) {
      throw new Error("Image URL is undefined");
    }
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageFileName = path.join(OUTPUT_DIR, `Page_${pageNumber}.png`);
    fs.writeFileSync(imageFileName, Buffer.from(imageBuffer));
    stopSpinner();
    console.log(`Image for page ${pageNumber} saved to ${imageFileName}`);
  } catch (error) {
    console.error(`Error generating image for prompt "${refinedPrompt}":`, error);
  }
}

async function generateImagesForAllPages(): Promise<void> {
  await initMongo();
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

generateImagesForAllPages().catch((error) => console.error("Error in image generation process:", error));
