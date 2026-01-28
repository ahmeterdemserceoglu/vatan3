'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Undo,
    Redo,
    Quote,
    Code,
    Heading1,
    Heading2,
    Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
}

export function RichTextEditor({
    content,
    onChange,
    placeholder = 'İçerik yazın...',
    className,
    minHeight = '150px'
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
            }),
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-indigo-600 underline hover:text-indigo-800',
                },
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] p-3',
                style: `min-height: ${minHeight}`,
            },
        },
    });

    const setLink = useCallback(() => {
        if (!editor) return;

        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL:', previousUrl);

        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!editor) return null;

    const ToolButton = ({
        onClick,
        isActive = false,
        children,
        title
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        title?: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                "p-1.5 rounded transition-colors",
                isActive
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-700"
            )}
        >
            {children}
        </button>
    );

    return (
        <div className={cn("border border-stone-200 rounded-xl overflow-hidden bg-white", className)}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-stone-100 bg-stone-50">
                {/* Text Style */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                    title="Kalın"
                >
                    <Bold size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                    title="İtalik"
                >
                    <Italic size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    isActive={editor.isActive('underline')}
                    title="Altı Çizili"
                >
                    <UnderlineIcon size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive('strike')}
                    title="Üstü Çizili"
                >
                    <Strikethrough size={16} />
                </ToolButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                {/* Headings */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    isActive={editor.isActive('heading', { level: 1 })}
                    title="Başlık 1"
                >
                    <Heading1 size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    isActive={editor.isActive('heading', { level: 2 })}
                    title="Başlık 2"
                >
                    <Heading2 size={16} />
                </ToolButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                {/* Lists */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                    title="Madde Listesi"
                >
                    <List size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                    title="Numaralı Liste"
                >
                    <ListOrdered size={16} />
                </ToolButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                {/* Alignment */}
                <ToolButton
                    onClick={() => editor.chain().focus().setTextAlign('left').run()}
                    isActive={editor.isActive({ textAlign: 'left' })}
                    title="Sola Hizala"
                >
                    <AlignLeft size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().setTextAlign('center').run()}
                    isActive={editor.isActive({ textAlign: 'center' })}
                    title="Ortala"
                >
                    <AlignCenter size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().setTextAlign('right').run()}
                    isActive={editor.isActive({ textAlign: 'right' })}
                    title="Sağa Hizala"
                >
                    <AlignRight size={16} />
                </ToolButton>

                <div className="w-px h-5 bg-stone-200 mx-1" />

                {/* Other */}
                <ToolButton
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    isActive={editor.isActive('blockquote')}
                    title="Alıntı"
                >
                    <Quote size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    isActive={editor.isActive('codeBlock')}
                    title="Kod Bloğu"
                >
                    <Code size={16} />
                </ToolButton>
                <ToolButton
                    onClick={setLink}
                    isActive={editor.isActive('link')}
                    title="Link Ekle"
                >
                    <LinkIcon size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().setHorizontalRule().run()}
                    title="Yatay Çizgi"
                >
                    <Minus size={16} />
                </ToolButton>

                <div className="flex-1" />

                {/* Undo/Redo */}
                <ToolButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Geri Al"
                >
                    <Undo size={16} />
                </ToolButton>
                <ToolButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Yinele"
                >
                    <Redo size={16} />
                </ToolButton>
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Styles for the editor */}
            <style jsx global>{`
                .ProseMirror p.is-editor-empty:first-child::before {
                    color: #9ca3af;
                    content: attr(data-placeholder);
                    float: left;
                    height: 0;
                    pointer-events: none;
                }
                .ProseMirror {
                    outline: none;
                }
                .ProseMirror h1 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror h2 {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-top: 0.75rem;
                    margin-bottom: 0.5rem;
                }
                .ProseMirror h3 {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-top: 0.5rem;
                    margin-bottom: 0.25rem;
                }
                .ProseMirror ul, .ProseMirror ol {
                    padding-left: 1.5rem;
                }
                .ProseMirror ul {
                    list-style-type: disc;
                }
                .ProseMirror ol {
                    list-style-type: decimal;
                }
                .ProseMirror blockquote {
                    border-left: 3px solid #e5e7eb;
                    padding-left: 1rem;
                    margin-left: 0;
                    color: #6b7280;
                    font-style: italic;
                }
                .ProseMirror pre {
                    background: #1f2937;
                    color: #e5e7eb;
                    border-radius: 0.5rem;
                    padding: 0.75rem 1rem;
                    font-family: monospace;
                    overflow-x: auto;
                }
                .ProseMirror code {
                    background: #f3f4f6;
                    border-radius: 0.25rem;
                    padding: 0.125rem 0.25rem;
                    font-family: monospace;
                    font-size: 0.875em;
                }
                .ProseMirror hr {
                    border: none;
                    border-top: 1px solid #e5e7eb;
                    margin: 1rem 0;
                }
            `}</style>
        </div>
    );
}

// Helper to render HTML content safely
import DOMPurify from 'isomorphic-dompurify';

export function RichTextContent({ content, className }: { content: string; className?: string }) {
    // Check if content is HTML (contains tags) or plain text
    const isHTML = /<[^>]+>/.test(content);

    if (!isHTML) {
        // Plain text, render as-is with line breaks
        return (
            <div className={className}>
                {content.split('\n').map((line, i) => (
                    <span key={i}>
                        {line}
                        {i < content.split('\n').length - 1 && <br />}
                    </span>
                ))}
            </div>
        );
    }

    const cleanContent = DOMPurify.sanitize(content, {
        ADD_TAGS: ['iframe'], // Allow iframes for embeds if needed
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });

    return (
        <div
            className={cn("prose prose-sm max-w-none", className)}
            dangerouslySetInnerHTML={{ __html: cleanContent }}
        />
    );
}
