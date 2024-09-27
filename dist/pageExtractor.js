"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextFromLayoutForPage = exports.getLayoutDetailsForPage = exports.getTotalPages = exports.getWordCountFromParent = exports.getWordCountFromLine = exports.getBlockById = void 0;
const fs_1 = __importDefault(require("fs"));
const filePath = "F:/Artisan/Magazine-AI-TS/Texract-JSON/MedicalAnalyzeDocResponse.json";
/**
 * Loads the data from a JSON file containing Textract-analyzed blocks.
 * @returns An object with an array of Block objects parsed from the JSON file.
 */
const loadData = () => {
    return JSON.parse(fs_1.default.readFileSync(filePath, "utf8"));
};
/**
 * Retrieves the total number of pages in the document by counting the blocks of type 'PAGE'.
 * @returns The number of 'PAGE' blocks in the document.
 */
const getTotalPages = () => {
    const data = loadData();
    const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
    return pageBlocks.length;
};
exports.getTotalPages = getTotalPages;
/**
 * Finds and returns a block by its ID.
 * @param data - The loaded document data containing block information.
 * @param blockId - The ID of the block to find.
 * @returns The block with the specified ID, or undefined if not found.
 */
const getBlockById = (data, blockId) => {
    return data.Blocks.find((block) => block.Id === blockId);
};
exports.getBlockById = getBlockById;
/**
 * Counts the number of words in a LINE block by counting its related WORD blocks.
 * @param data - The loaded document data.
 * @param lineBlock - The LINE block whose word count is to be calculated.
 * @returns The total number of words in the LINE block.
 */
const getWordCountFromLine = (data, lineBlock) => {
    const wordIds = (lineBlock.Relationships || [{}])[0].Ids || [];
    const words = wordIds
        .map((wordId) => getBlockById(data, wordId))
        .filter((wordBlock) => !!wordBlock && wordBlock.BlockType === "WORD");
    return words.reduce((count, wordBlock) => count + (wordBlock.Text || "").split(" ").length, 0);
};
exports.getWordCountFromLine = getWordCountFromLine;
/**
 * Counts the total number of words in a parent block (LAYOUT_TEXT, LAYOUT_SECTION_HEADER, etc.)
 * by counting the words in all of its child LINE blocks.
 * @param data - The loaded document data.
 * @param parentBlock - The parent block whose word count is to be calculated.
 * @returns The total number of words in the parent block.
 */
const getWordCountFromParent = (data, parentBlock) => {
    const lineIds = (parentBlock.Relationships || [{}])[0].Ids || [];
    const lines = lineIds
        .map((lineId) => getBlockById(data, lineId))
        .filter((lineBlock) => !!lineBlock && lineBlock.BlockType === "LINE");
    return lines.reduce((count, line) => count + getWordCountFromLine(data, line), 0);
};
exports.getWordCountFromParent = getWordCountFromParent;
/**
 * Renders a block's type and word count and processes its child blocks recursively.
 * @param data - The loaded document data.
 * @param block - The current block to process.
 * @param blockCounts - A record of block type counts to track how many blocks of each type have been processed.
 * @returns A formatted string representation of the block and its word count, including any child blocks.
 */
const renderBlockWithCounts = (data, block, blockCounts) => {
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
/**
 * Extracts and returns the layout details (block type and word count) for a specified page.
 * @param pageNumber - The page number to extract layout details from.
 * @returns A formatted string containing the layout details for the specified page.
 */
const getLayoutDetailsForPage = (pageNumber) => {
    var _a;
    const data = loadData();
    const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
    let layoutDetails = "";
    const blockCounts = {
        LAYOUT_TITLE: [],
        LAYOUT_SECTION_HEADER: [],
        LAYOUT_TEXT: [],
        LAYOUT_HEADER: [],
        LAYOUT_FOOTER: [],
    };
    const currentPageBlock = pageBlocks.find((block) => block.Page === pageNumber);
    if (currentPageBlock) {
        layoutDetails += `Page ${currentPageBlock.Page}\n`;
        const blockContent = (((_a = currentPageBlock.Relationships) === null || _a === void 0 ? void 0 : _a[0].Ids) || [])
            .map((id) => getBlockById(data, id))
            .filter((block) => !!block)
            .map((block) => renderBlockWithCounts(data, block, blockCounts))
            .join("");
        layoutDetails += blockContent + "\n";
    }
    return layoutDetails;
};
exports.getLayoutDetailsForPage = getLayoutDetailsForPage;
/**
 * Recursively extracts text from a block and its child blocks.
 * @param data - The loaded document data.
 * @param block - The block from which to extract text.
 * @returns The extracted text content from the block.
 */
const extractTextFromBlock = (data, block) => {
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
/**
 * Extracts and returns the text content for layout blocks (title, section header, text, header, footer)
 * on a specified page.
 * @param pageNumber - The page number to extract text from.
 * @returns A formatted string containing the layout text for the specified page.
 */
const getTextFromLayoutForPage = (pageNumber) => {
    var _a;
    const data = loadData();
    const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
    let layoutText = "";
    const currentPageBlock = pageBlocks.find((block) => block.Page === pageNumber);
    if (currentPageBlock) {
        layoutText += `Page ${currentPageBlock.Page}\n`;
        (_a = currentPageBlock.Relationships) === null || _a === void 0 ? void 0 : _a[0].Ids.forEach((blockId) => {
            const block = getBlockById(data, blockId);
            if (["LAYOUT_TITLE", "LAYOUT_SECTION_HEADER", "LAYOUT_TEXT", "LAYOUT_HEADER", "LAYOUT_FOOTER"].includes((block === null || block === void 0 ? void 0 : block.BlockType) || "")) {
                const blockType = block === null || block === void 0 ? void 0 : block.BlockType;
                const text = extractTextFromBlock(data, block);
                layoutText += `${blockType}: ${text}\n`;
            }
        });
    }
    return layoutText;
};
exports.getTextFromLayoutForPage = getTextFromLayoutForPage;
