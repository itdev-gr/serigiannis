'use client';
import { useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Heading2, Heading3, RemoveFormatting } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Τα χρώματα που προσφέρει η μπάρα — λίγα και δεμένα με την παλέτα του site,
 *  ώστε το κείμενο να τονίζεται χωρίς να γίνεται «χριστουγεννιάτικο δέντρο».
 *  Το «Μαύρο» είναι το βασικό αίτημα του γραφείου: το σώμα κειμένου είναι
 *  γκρίζο και θέλουν κάτι να χτυπάει πιο έντονα στο μάτι. */
const COLORS = [
  { value: '#111827', label: 'Μαύρο' },
  { value: '#b91c1c', label: 'Κόκκινο' },
  { value: '#1d4ed8', label: 'Μπλε' },
  { value: '#15803d', label: 'Πράσινο' },
];

/** Απλό κείμενο από τα παλιά textarea → HTML: κενή γραμμή = παράγραφος,
 *  μονή αλλαγή = <br>. Ό,τι μοιάζει ήδη με HTML περνάει ως έχει. */
function toInitialHtml(value: string): string {
  if (!value.trim()) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return value;
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${esc(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function ToolButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // να μη χάνει το focus/επιλογή ο editor
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-md transition-colors',
        active ? 'bg-primary text-surface' : 'text-body hover:bg-primary/10'
      )}
    >
      {children}
    </button>
  );
}

/** Επεξεργαστής κειμένου του admin (άρθρα, περιγραφή εκδρομής): έντονα,
 *  πλάγια, λίστες, επικεφαλίδες και χρώμα κειμένου. Γράφει HTML σε κρυφό
 *  input με το όνομα του πεδίου, ώστε τα server actions να μη χρειάζονται
 *  καμία αλλαγή — το HTML καθαρίζεται ούτως ή άλλως στην εμφάνιση
 *  (sanitizeArticleHtml). */
export function RichTextEditor({
  name,
  defaultValue = '',
  minHeight = 200,
}: {
  name: string;
  defaultValue?: string;
  minHeight?: number;
}) {
  const [html, setHtml] = useState(() => toInitialHtml(defaultValue));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Ό,τι δεν έχει κουμπί στη μπάρα μένει εκτός για να μη μπαίνει κατά
        // λάθος με επικόλληση/συντομεύσεις που δεν φαίνονται πουθενά.
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      TextStyle,
      Color,
      Underline,
    ],
    content: toInitialHtml(defaultValue),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'post-body max-w-none px-4 py-3 focus:outline-none',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => {
      setHtml(e.getText().trim() === '' ? '' : e.getHTML());
    },
  });

  return (
    <div className="rounded-md border border-border bg-surface focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
      <input type="hidden" name={name} value={html} />
      <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-1.5">
        <ToolButton title="Έντονα" active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold className="h-4 w-4" strokeWidth={2.25} />
        </ToolButton>
        <ToolButton title="Πλάγια" active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <ToolButton title="Υπογράμμιση" active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolButton title="Επικεφαλίδα" active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <ToolButton title="Υποεπικεφαλίδα" active={editor?.isActive('heading', { level: 3 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        <ToolButton title="Λίστα με κουκκίδες" active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <ToolButton title="Αριθμημένη λίστα" active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-border" aria-hidden />
        {COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor?.chain().focus().setColor(c.value).run()}
            title={`Χρώμα κειμένου: ${c.label}`}
            aria-label={`Χρώμα κειμένου: ${c.label}`}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-primary/10',
              editor?.isActive('textStyle', { color: c.value }) && 'ring-2 ring-primary/60'
            )}
          >
            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: c.value }} />
          </button>
        ))}
        <ToolButton title="Καθαρισμός χρώματος/μορφοποίησης" onClick={() => editor?.chain().focus().unsetColor().unsetAllMarks().run()}>
          <RemoveFormatting className="h-4 w-4" strokeWidth={2} />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
