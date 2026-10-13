export const EMPTY_DOCUMENT = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function textToDocument(text: string) {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  return {
    type: "doc",
    content: paragraphs.map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

export function supportedTextFile(fileName: string): boolean {
  return /\.(txt|md)$/i.test(fileName);
}

type ContentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string }>;
  content?: ContentNode[];
};

export function documentToPlainText(docContent: Record<string, unknown>): string {
  if (!docContent || !Array.isArray(docContent.content)) return "";
  function extractNode(node: ContentNode): string {
    if (node.type === "text") return node.text || "";
    if (Array.isArray(node.content)) {
      const childrenText = node.content.map(extractNode).join("");
      if (node.type === "paragraph" || node.type === "heading") return childrenText + "\n";
      if (node.type === "listItem") return "• " + childrenText + "\n";
      return childrenText;
    }
    return "";
  }
  return (docContent.content as ContentNode[]).map(extractNode).join("").trim();
}

export function documentToMarkdown(docContent: Record<string, unknown>): string {
  if (!docContent || !Array.isArray(docContent.content)) return "";
  function extractNode(node: ContentNode): string {
    if (node.type === "text") {
      let t = node.text || "";
      if (node.marks) {
        for (const mark of node.marks) {
          if (mark.type === "bold") t = `**${t}**`;
          if (mark.type === "italic") t = `*${t}*`;
          if (mark.type === "underline") t = `<u>${t}</u>`;
          if (mark.type === "strike") t = `~~${t}~~`;
        }
      }
      return t;
    }
    if (node.type === "heading") {
      const level = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const text = (node.content || []).map(extractNode).join("");
      return `${"#".repeat(level)} ${text}\n\n`;
    }
    if (node.type === "paragraph") {
      const text = (node.content || []).map(extractNode).join("");
      return `${text}\n\n`;
    }
    if (node.type === "codeBlock") {
      const text = (node.content || []).map(extractNode).join("");
      return `\`\`\`\n${text}\n\`\`\`\n\n`;
    }
    if (node.type === "bulletList") {
      return (node.content || []).map((li) => `- ${(li.content || []).map(extractNode).join("").trim()}\n`).join("") + "\n";
    }
    if (node.type === "orderedList") {
      return (node.content || []).map((li, idx) => `${idx + 1}. ${(li.content || []).map(extractNode).join("").trim()}\n`).join("") + "\n";
    }
    if (node.type === "blockquote") {
      const text = (node.content || []).map(extractNode).join("").trim();
      return `> ${text}\n\n`;
    }
    if (node.type === "horizontalRule") {
      return `---\n\n`;
    }
    if (Array.isArray(node.content)) {
      return node.content.map(extractNode).join("");
    }
    return "";
  }
  return (docContent.content as ContentNode[]).map(extractNode).join("").trim();
}