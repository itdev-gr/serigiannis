import { describe, expect, it } from 'vitest';
import { sanitizeArticleHtml } from '@/lib/sanitize-html';

describe('sanitizeArticleHtml', () => {
  it('αφήνει άθικτο το κανονικό κείμενο άρθρου', () => {
    const html =
      '<h2>Μετέωρα</h2><p>Μια <strong>μονοήμερη</strong> εκδρομή.</p>' +
      '<ul><li>Πρωινό</li></ul><a href="/ekdromes">Δείτε τις εκδρομές</a>' +
      '<img src="https://cdn.example.com/a.jpg" alt="Μετέωρα">';
    expect(sanitizeArticleHtml(html)).toBe(html);
  });

  it('σβήνει script μαζί με το περιεχόμενό του', () => {
    const out = sanitizeArticleHtml('<p>Πριν</p><script>alert(1)</script><p>Μετά</p>');
    expect(out).not.toContain('alert');
    expect(out).not.toContain('script');
    expect(out).toContain('Πριν');
    expect(out).toContain('Μετά');
  });

  it('σβήνει και το script που δεν έκλεισε ποτέ', () => {
    const out = sanitizeArticleHtml('<p>Κείμενο</p><script src="https://evil.example/x.js">');
    expect(out).not.toContain('script');
    expect(out).toContain('Κείμενο');
  });

  it('σβήνει iframe, object, embed, form και style', () => {
    for (const tag of ['iframe', 'object', 'embed', 'form', 'style']) {
      const out = sanitizeArticleHtml(`<${tag}>κακό</${tag}>`);
      expect(out, tag).not.toContain(`<${tag}`);
    }
  });

  it('σβήνει χειριστές συμβάντων σε κάθε μορφή εισαγωγικών', () => {
    const out = sanitizeArticleHtml(
      `<img src="a.jpg" onerror="alert(1)"><div onclick='alert(2)'>x</div><b onmouseover=alert(3)>y</b>`
    );
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('onmouseover');
    expect(out).not.toContain('alert');
    expect(out).toContain('src="a.jpg"');
  });

  it('σβήνει javascript: και vbscript: URL', () => {
    const out = sanitizeArticleHtml(`<a href="javascript:alert(1)">κλικ</a><a href='vbscript:msgbox'>κλικ</a>`);
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('vbscript:');
    expect(out).toContain('κλικ');
  });

  it('πιάνει το javascript: που κρύβεται πίσω από χαρακτήρες ελέγχου', () => {
    const out = sanitizeArticleHtml('<a href="java\tscript:alert(1)">κλικ</a>');
    expect(out).not.toContain('script:');
  });

  it('κρατά τις εικόνες data: αλλά κόβει κάθε άλλο data:', () => {
    const img = sanitizeArticleHtml('<img src="data:image/png;base64,iVBOR">');
    expect(img).toContain('data:image/png');
    const bad = sanitizeArticleHtml('<a href="data:text/html;base64,PHNjcmlwdD4=">κλικ</a>');
    expect(bad).not.toContain('data:text/html');
  });

  it('σβήνει σχόλια', () => {
    expect(sanitizeArticleHtml('<p>a</p><!-- κρυφό -->')).toBe('<p>a</p>');
  });

  it('δέχεται κενό κείμενο', () => {
    expect(sanitizeArticleHtml('')).toBe('');
  });
});
