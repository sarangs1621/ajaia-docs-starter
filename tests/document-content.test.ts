import { describe, expect, it } from "vitest";
import {
  supportedTextFile,
  textToDocument,
  documentToPlainText,
  documentToMarkdown,
} from "../lib/document-content";

describe("document import helpers", () => {
  it("converts plain text lines into editable paragraph nodes", () => {
    expect(textToDocument("first\r\nsecond")).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "first" }] },
        { type: "paragraph", content: [{ type: "text", text: "second" }] },
      ],
    });
  });

  it("accepts only txt and markdown files", () => {
    expect(supportedTextFile("notes.txt")).toBe(true);
    expect(supportedTextFile("README.MD")).toBe(true);
    expect(supportedTextFile("resume.pdf")).toBe(false);
  });
});

describe("document export helpers", () => {
  const sampleDoc = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: "Project Title" }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Here is a " },
          { type: "text", text: "bold", marks: [{ type: "bold" }] },
          { type: "text", text: " and " },
          { type: "text", text: "italic", marks: [{ type: "italic" }] },
          { type: "text", text: " statement." },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Item 1" }],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Item 2" }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("exports document to plain text correctly", () => {
    const plain = documentToPlainText(sampleDoc);
    expect(plain).toContain("Project Title");
    expect(plain).toContain("Here is a bold and italic statement.");
    expect(plain).toContain("• Item 1");
    expect(plain).toContain("• Item 2");
  });

  it("exports document to markdown formatting correctly", () => {
    const md = documentToMarkdown(sampleDoc);
    expect(md).toContain("# Project Title");
    expect(md).toContain("**bold**");
    expect(md).toContain("*italic*");
    expect(md).toContain("- Item 1");
    expect(md).toContain("- Item 2");
  });
});