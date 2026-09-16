/**
 * RichEditor — a Tiptap-based WYSIWYG editor component.
 * Props:
 *   content   – HTML string (initial value)
 *   onChange  – (html: string) => void
 *   placeholder – string
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { useEffect } from 'react'

/* ── Toolbar button ─────────────────────────────────────────────────────── */
function ToolBtn({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={`rich-editor__tool${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="rich-editor__divider" />
}

/* ── Toolbar ────────────────────────────────────────────────────────────── */
function Toolbar({ editor }) {
  if (!editor) return null

  function setLink() {
    const prev = editor.getAttributes('link').href ?? ''
    const url = window.prompt('Enter URL', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run()
    }
  }

  return (
    <div className="rich-editor__toolbar">
      {/* History */}
      <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <path d="M2 6h7a4 4 0 0 1 0 8H6" /><path d="M2 6l3-3-3-3" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <path d="M14 6H7a4 4 0 0 0 0 8h3" /><path d="M14 6l-3-3 3-3" />
        </svg>
      </ToolBtn>
      <Divider />

      {/* Block type */}
      <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <span className="text-xs font-bold">H2</span>
      </ToolBtn>
      <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <span className="text-xs font-bold">H3</span>
      </ToolBtn>
      <ToolBtn title="Paragraph" active={editor.isActive('paragraph')} onClick={() => editor.chain().focus().setParagraph().run()}>
        <span className="text-xs font-semibold">P</span>
      </ToolBtn>
      <Divider />

      {/* Inline marks */}
      <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <span className="text-xs font-bold">B</span>
      </ToolBtn>
      <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="text-xs italic">I</span>
      </ToolBtn>
      <ToolBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <span className="text-xs underline">U</span>
      </ToolBtn>
      <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <span className="text-xs line-through">S</span>
      </ToolBtn>
      <ToolBtn title="Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <polyline points="5 4 1 8 5 12" /><polyline points="11 4 15 8 11 12" />
        </svg>
      </ToolBtn>
      <Divider />

      {/* Alignment */}
      <ToolBtn title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <rect x="1" y="3" width="14" height="1.5" rx="0.5" /><rect x="1" y="7" width="9" height="1.5" rx="0.5" /><rect x="1" y="11" width="12" height="1.5" rx="0.5" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <rect x="1" y="3" width="14" height="1.5" rx="0.5" /><rect x="3.5" y="7" width="9" height="1.5" rx="0.5" /><rect x="2" y="11" width="12" height="1.5" rx="0.5" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <rect x="1" y="3" width="14" height="1.5" rx="0.5" /><rect x="6" y="7" width="9" height="1.5" rx="0.5" /><rect x="3" y="11" width="12" height="1.5" rx="0.5" />
        </svg>
      </ToolBtn>
      <Divider />

      {/* Lists */}
      <ToolBtn title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <circle cx="2" cy="4" r="1.2" /><rect x="5" y="3" width="9" height="1.5" rx="0.5" />
          <circle cx="2" cy="8" r="1.2" /><rect x="5" y="7" width="9" height="1.5" rx="0.5" />
          <circle cx="2" cy="12" r="1.2" /><rect x="5" y="11" width="9" height="1.5" rx="0.5" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Ordered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <text x="1" y="5" fontSize="5" fontFamily="monospace">1.</text>
          <rect x="5" y="3" width="9" height="1.5" rx="0.5" />
          <text x="1" y="9" fontSize="5" fontFamily="monospace">2.</text>
          <rect x="5" y="7" width="9" height="1.5" rx="0.5" />
        </svg>
      </ToolBtn>
      <ToolBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M3 6c0-1.7 1.3-3 3-3v1.5C5.2 4.5 4.5 5.2 4.5 6v.5H7V10H3V6zm7 0c0-1.7 1.3-3 3-3v1.5c-.8 0-1.5.7-1.5 1.5v.5H14V10h-4V6z" />
        </svg>
      </ToolBtn>
      <Divider />

      {/* Link */}
      <ToolBtn title="Link" active={editor.isActive('link')} onClick={setLink}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <path d="M6.5 9.5a4 4 0 0 0 5.657 0l2-2a4 4 0 0 0-5.657-5.657L7.086 3.257" />
          <path d="M9.5 6.5a4 4 0 0 0-5.657 0l-2 2a4 4 0 0 0 5.657 5.657l1.414-1.414" />
        </svg>
      </ToolBtn>

      {/* Code block */}
      <ToolBtn title="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <rect x="1" y="2" width="14" height="12" rx="1.5" />
          <polyline points="5 6 3 8 5 10" /><polyline points="11 6 13 8 11 10" />
        </svg>
      </ToolBtn>

      {/* Horizontal rule */}
      <ToolBtn title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-3.5 w-3.5">
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      </ToolBtn>
    </div>
  )
}

/* ── Editor ─────────────────────────────────────────────────────────────── */
export default function RichEditor({ content = '', onChange, placeholder = 'Start writing…', minHeight = 320 }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose rich-editor__content',
        style: `min-height:${minHeight}px`,
      },
    },
  })

  // Sync external content changes (e.g. when editing loads)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content, false)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  const chars = editor?.storage.characterCount.characters() ?? 0
  const words = editor?.storage.characterCount.words() ?? 0

  return (
    <div className="rich-editor-shell">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <div className="rich-editor__count">
        <span>{words} words</span>
        <span>{chars} characters</span>
      </div>
    </div>
  )
}
