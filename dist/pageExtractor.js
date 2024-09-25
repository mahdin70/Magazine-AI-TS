"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTextFromLayoutForPage = exports.getLayoutDetailsForPage = exports.getTotalPages = void 0;
const fs_1 = __importDefault(require("fs"));
const filePath = "../../Magazine-AI-TS/Texract-JSON/MedicalAnalyzeDocResponse.json";
const loadData = () => {
    return JSON.parse(fs_1.default.readFileSync(filePath, "utf8"));
};
const getTotalPages = () => {
    const data = loadData();
    const pageBlocks = data.Blocks.filter((block) => block.BlockType === "PAGE");
    return pageBlocks.length;
};
exports.getTotalPages = getTotalPages;
const getBlockById = (data, blockId) => {
    return data.Blocks.find((block) => block.Id === blockId);
};
const getWordCountFromLine = (data, lineBlock) => {
    const wordIds = (lineBlock.Relationships || [{}])[0].Ids || [];
    const words = wordIds
        .map((wordId) => getBlockById(data, wordId))
        .filter((wordBlock) => !!wordBlock && wordBlock.BlockType === "WORD");
    return words.reduce((count, wordBlock) => count + (wordBlock.Text || "").split(" ").length, 0);
};
const getWordCountFromParent = (data, parentBlock) => {
    const lineIds = (parentBlock.Relationships || [{}])[0].Ids || [];
    const lines = lineIds
        .map((lineId) => getBlockById(data, lineId))
        .filter((lineBlock) => !!lineBlock && lineBlock.BlockType === "LINE");
    return lines.reduce((count, line) => count + getWordCountFromLine(data, line), 0);
};
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
