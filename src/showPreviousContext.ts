import { fetchPreviousContext } from "./paginationDBInteraction";

export async function showPreviousContext(): Promise<{ latestUserPrompt: string; latestAIReply: string } | null> {
  const previousContext = await fetchPreviousContext();

  if (previousContext) {
    const latestUserPrompt = previousContext.latestUserPrompt || "";
    const latestAIReply = previousContext.latestAIReply
      ? previousContext.latestAIReply.pages
          .map((page: { content: string }) => page.content)
          .filter((content: string) => content)
          .join("\n\n\n")
      : "";

    return { latestUserPrompt, latestAIReply };
  }

  return null;
}
