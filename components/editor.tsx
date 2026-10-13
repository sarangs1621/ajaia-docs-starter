"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Minus,
  Undo2, Redo2, LoaderCircle
} from "lucide-react";

type Props = {
  content: Record<string, unknown>;
  editable?: boolean;
  onChange: (content: Record<string, unknown>) => void;
};

export default function Editor({ content, editable = true, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: activeEditor }) => onChange(activeEditor.getJSON() as Record<string, unknown>),
    editorProps: {
      attributes: {
        class: "tiptap-content",
        "aria-label": "Document content",
        spellcheck: "true",
      },
    },
  });

  if (!editor) {
    return (
      <div className="editor-loading">
        <LoaderCircle size={18} className="spin" />
        <span>Preparing editor…</span>
      </div>
    );
  }

  const markButtons = [
    { label: "Bold (⌘B)", icon: <Bold size={15}/>, active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic (⌘I)", icon: <Italic size={15}/>, active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline (⌘U)", icon: <UnderlineIcon size={15}/>, active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Strikethrough", icon: <Strikethrough size={15}/>, active: editor.isActive("strike"), action: () => editor.chain().focus().toggleStrike().run() },
  ];

  const headingButtons = [
    { label: "Heading 1", icon: <Heading1 size={16}/>, active: editor.isActive("heading", { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: <Heading2 size={16}/>, active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Heading 3", icon: <Heading3 size={16}/>, active: editor.isActive("heading", { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  ];

  const blockButtons = [
    { label: "Bullet list", icon: <List size={16}/>, active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: <ListOrdered size={16}/>, active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: <Quote size={15}/>, active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", icon: <Code size={15}/>, active: editor.isActive("codeBlock"), action: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Horizontal divider", icon: <Minus size={16}/>, active: false, action: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  return (
    <div className={`editor-frame ${!editable ? "read-only" : ""}`}>
      {editable && (
        <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
          <div className="toolbar-group">
            {markButtons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                title={btn.label}
                aria-label={btn.label}
                aria-pressed={btn.active}
                className={`toolbar-button ${btn.active ? "is-active" : ""}`}
                onClick={btn.action}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          <span className="toolbar-separator" />

          <div className="toolbar-group">
            {headingButtons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                title={btn.label}
                aria-label={btn.label}
                aria-pressed={btn.active}
                className={`toolbar-button ${btn.active ? "is-active" : ""}`}
                onClick={btn.action}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          <span className="toolbar-separator" />

          <div className="toolbar-group">
            {blockButtons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                title={btn.label}
                aria-label={btn.label}
                aria-pressed={btn.active}
                className={`toolbar-button ${btn.active ? "is-active" : ""}`}
                onClick={btn.action}
              >
                {btn.icon}
              </button>
            ))}
          </div>

          <span className="toolbar-separator" />

          <div className="toolbar-group toolbar-history">
            <button
              type="button"
              className="toolbar-button"
              aria-label="Undo"
              title="Undo (⌘Z)"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
            >
              <Undo2 size={15}/>
            </button>
            <button
              type="button"
              className="toolbar-button"
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
            >
              <Redo2 size={15}/>
            </button>
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
