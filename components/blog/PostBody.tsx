export function PostBody({ body }: { body: string }) {
  const looksHtml = /<[a-z][\s\S]*>/i.test(body);

  if (looksHtml) {
    return <div className="post-body" dangerouslySetInnerHTML={{ __html: body }} />;
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
