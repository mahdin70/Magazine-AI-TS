import fs from "fs";

const filePath: string = "D:/Artisan/Magazine-AI-TS/Texract-JSON/MedicalAnalyzeDocResponse.json";

interface Block {
  Id: string;
  BlockType: string;
  Text?: string;
  Page?: number;
  Relationships?: Array<{ Ids: string[] }>;
}

const loadData = (): { Blocks: Block[] } => {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const getTotalPages = (): number => {
  const data = loadData();
  const pageBlocks = data.Blocks.filter((block: Block) => block.BlockType === "PAGE");
  return pageBlocks.length;
};

const getBlockById = (data: { Blocks: Block[] }, blockId: string): Block | undefined => {
  return data.Blocks.find((block: Block) => block.Id === blockId);
};

const getWordCountFromLine = (data: { Blocks: Block[] }, lineBlock: Block): number => {
  const wordIds = (lineBlock.Relationships || [{}])[0].Ids || [];
  const words = wordIds
    .map((wordId) => getBlockById(data, wordId))
    .filter((wordBlock): wordBlock is Block => !!wordBlock && wordBlock.BlockType === "WORD");

  return words.reduce((count, wordBlock) => count + (wordBlock.Text || "").split(" ").length, 0);
};

const getWordCountFromParent = (data: { Blocks: Block[] }, parentBlock: Block): number => {
  const lineIds = (parentBlock.Relationships || [{}])[0].Ids || [];
  const lines = lineIds
    .map((lineId) => getBlockById(data, lineId))
    .filter((lineBlock): lineBlock is Block => !!lineBlock && lineBlock.BlockType === "LINE");

  return lines.reduce((count, line) => count + getWordCountFromLine(data, line), 0);
};

const renderBlockWithCounts = (data: { Blocks: Block[] }, block: Block, blockCounts: Record<string, number[]>): string => {
  let output = "";

  if (block.BlockType in blockCounts) {
    const wordCount = getWordCountFromParent(data, block);
    blockCounts[block.BlockType].push(1);
    const countIndex = blockCounts[block.BlockType].length;
    output += `${block.BlockType}: ${countIndex} -> Word Count: ${wordCount}\n`;
  }

  const childIds = (block.Relationships || [{}])[0].Ids || [];
  childIds.forEach((childId) => {
    const childBlock = getBlockById(data, childId);
    if (childBlock && childBlock.BlockType in blockCounts) {
      output += renderBlockWithCounts(data, childBlock, blockCounts);
    }
  });

  return output;
};

const getLayoutDetailsForPage = (pageNumber: number): string => {
  const data = loadData();
  const pageBlocks = data.Blocks.filter((block: Block) => block.BlockType === "PAGE");
  let layoutDetails = "";

  const blockCounts: Record<string, number[]> = {
    LAYOUT_TITLE: [],
    LAYOUT_SECTION_HEADER: [],
    LAYOUT_TEXT: [],
    LAYOUT_HEADER: [],
    LAYOUT_FOOTER: [],
  };

  const currentPageBlock = pageBlocks.find((block: Block) => block.Page === pageNumber);
  if (currentPageBlock) {
    layoutDetails += `Page ${currentPageBlock.Page}\n`;

    const blockContent = (currentPageBlock.Relationships?.[0].Ids || [])
      .map((id) => getBlockById(data, id))
      .filter((block): block is Block => !!block)
      .map((block) => renderBlockWithCounts(data, block, blockCounts))
      .join("");

    layoutDetails += blockContent + "\n";
  }

  return layoutDetails;
};

const extractTextFromBlock = (data: { Blocks: Block[] }, block: Block): string => {
  if (block.BlockType === "WORD") {
    return block.Text || "";
  }

  let textContent = "";
  if (block.Relationships) {
    const childIds = block.Relationships[0].Ids || [];
    childIds.forEach((childId) => {
      const childBlock = getBlockById(data, childId);
      if (childBlock) {
        textContent += extractTextFromBlock(data, childBlock) + " ";
      }
    });
  }

  return textContent.trim();
};

const getTextFromLayoutForPage = (pageNumber: number): string => {
  const data = loadData();
  const pageBlocks = data.Blocks.filter((block: Block) => block.BlockType === "PAGE");
  let layoutText = "";

  const currentPageBlock = pageBlocks.find((block: Block) => block.Page === pageNumber);
  if (currentPageBlock) {
    layoutText += `Page ${currentPageBlock.Page}\n`;

    currentPageBlock.Relationships?.[0].Ids.forEach((blockId) => {
      const block = getBlockById(data, blockId);

      if (["LAYOUT_TITLE", "LAYOUT_SECTION_HEADER", "LAYOUT_TEXT", "LAYOUT_HEADER", "LAYOUT_FOOTER"].includes(block?.BlockType || "")) {
        const blockType = block?.BlockType;
        const text = extractTextFromBlock(data, block!);
        layoutText += `${blockType}: ${text}\n`;
      }
    });
  }

  return layoutText;
};

export { getTotalPages, getLayoutDetailsForPage, getTextFromLayoutForPage };
