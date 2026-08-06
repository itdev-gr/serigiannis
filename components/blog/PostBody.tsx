import { sanitizeArticleHtml } from '@/lib/sanitize-html';

export function PostBody({ body }: { body: string }) {
  const looksHtml = /<[a-z][\s\S]*>/i.test(body);

  if (looksHtml) {
    // Το σώμα του άρθρου είναι HTML γραμμένο από το γραφείο ή εισαγμένο από το
    // παλιό site — καθαρίζεται πριν φτάσει στον browser του επισκέπτη.
    return <div className="post-body" dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(body) }} />;
  }

  const blocks = body
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="post-body">
      {blocks.map((b, i) => (
        <p key={i} className="whitespace-pre-wrap">
          {b}
        </p>
      ))}
    </div>
  );
}
