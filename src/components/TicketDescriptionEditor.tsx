import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { useEffect, useRef } from 'react';
import { isEmptyEditorHtml } from '@/utils/editorHtml';

/** Raster / common clipboard types for paste and drag-drop (excludes SVG in data URLs). */
const CLIPBOARD_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/heic',
  'image/heif',
] as const;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('readFileAsDataUrl: unexpected result'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('readFileAsDataUrl: read failed'));
    };
    reader.readAsDataURL(file);
  });
}

async function filesToImageContent(files: File[]) {
  const imageFiles = files.filter((f) => f.type.startsWith('image/'));
  return Promise.all(
    imageFiles.map(async (file) => ({
      type: 'image' as const,
      attrs: {
        src: await readFileAsDataUrl(file),
        alt: file.name || 'Image',
      },
    })),
  );
}

function scheduleInsertImagesFromPaste(editor: Editor, files: File[]) {
  void (async () => {
    const content = await filesToImageContent(files);
    if (content.length === 0) return;
    editor.chain().focus().insertContent(content).run();
  })();
}

function scheduleInsertImagesAtDrop(editor: Editor, pos: number, files: File[]) {
  void (async () => {
    const content = await filesToImageContent(files);
    if (content.length === 0) return;
    editor.chain().focus().insertContentAt(pos, content).run();
  })();
}

export interface TicketDescriptionEditorProps {
  readonly value: string;
  readonly onChange: (html: string) => void;
  readonly placeholder?: string;
  readonly id?: string;
  readonly className?: string;
  readonly minHeight?: string;
  readonly disabled?: boolean;
}

export function TicketDescriptionEditor({
  value,
  onChange,
  placeholder = 'Description (optional)',
  id,
  className = '',
  minHeight = '5rem',
  disabled = false,
}: TicketDescriptionEditorProps) {
  const lastValueFromParent = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Typography,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
          loading: 'lazy',
          decoding: 'async',
        },
      }),
      FileHandler.configure({
        allowedMimeTypes: [...CLIPBOARD_IMAGE_MIME_TYPES],
        onPaste: (ed, files) => {
          scheduleInsertImagesFromPaste(ed, files);
        },
        onDrop: (ed, files, pos) => {
          scheduleInsertImagesAtDrop(ed, pos, files);
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          'ticket-description-editor min-w-0 w-full px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const raw = ed.getHTML();
      lastValueFromParent.current = isEmptyEditorHtml(raw) ? '' : raw;
      onChange(lastValueFromParent.current);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastValueFromParent.current) return;
    lastValueFromParent.current = value;
    editor.commands.setContent(value || '<p></p>', { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div
        className={`rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 ${className}`}
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div
      id={id}
      className={`rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 focus-within:border-neutral-400 dark:focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-400 dark:focus-within:ring-neutral-500 overflow-visible ${className}`}
      style={{ minHeight }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
