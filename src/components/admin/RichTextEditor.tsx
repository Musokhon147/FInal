"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

function Btn({ on, label, active, children }: { on: () => void; label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={on} aria-label={label} title={label} aria-pressed={active}
      className={`flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition ${active ? "bg-brand-600 text-ink" : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"}`}>
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const link = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 p-1.5" role="toolbar">
      <Btn label="Bold" active={editor.isActive("bold")} on={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
      <Btn label="Italic" active={editor.isActive("italic")} on={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
      <Btn label="Heading 2" active={editor.isActive("heading", { level: 2 })} on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
      <Btn label="Heading 3" active={editor.isActive("heading", { level: 3 })} on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
      <Btn label="Bullet list" active={editor.isActive("bulletList")} on={() => editor.chain().focus().toggleBulletList().run()}>•</Btn>
      <Btn label="Numbered list" active={editor.isActive("orderedList")} on={() => editor.chain().focus().toggleOrderedList().run()}>1.</Btn>
      <Btn label="Quote" active={editor.isActive("blockquote")} on={() => editor.chain().focus().toggleBlockquote().run()}>❝</Btn>
      <Btn label="Link" active={editor.isActive("link")} on={link}>🔗</Btn>
      <span className="mx-1 w-px bg-slate-200" aria-hidden="true" />
      <Btn label="Undo" on={() => editor.chain().focus().undo().run()}>↶</Btn>
      <Btn label="Redo" on={() => editor.chain().focus().redo().run()}>↷</Btn>
    </div>
  );
}

/** WYSIWYG editor that submits its HTML through a hidden input called `name`. */
export default function RichTextEditor({ name, defaultValue = "", label }: { name: string; defaultValue?: string; label?: string }) {
  const [html, setHtml] = useState(defaultValue);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } })],
    content: defaultValue,
    immediatelyRender: false,
    editorProps: { attributes: { class: "prose-content min-h-40 px-4 py-3 outline-none", "aria-label": label ?? name } },
    onUpdate: ({ editor }) => setHtml(editor.isEmpty ? "" : editor.getHTML()),
  });
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-100/70 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/30">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
