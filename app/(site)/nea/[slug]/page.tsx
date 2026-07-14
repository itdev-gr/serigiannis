import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { PageHero } from '@/components/shared/PageHero';
import { PostBody } from '@/components/blog/PostBody';
import { Button } from '@/components/ui/Button';
import { getPostBySlug, getPublishedPostSlugs } from '@/lib/queries/posts';
import { coverPathUrl } from '@/lib/images';
import { SITE_URL } from '@/lib/seo';
import { decodeSlugParam } from '@/lib/slug';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(decodeSlugParam(slug));
  if (!post) return {};
  const img = coverPathUrl(post.cover_path);
  return {
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt ?? undefined,
    alternates: { canonical: `/nea/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: img ? [img] : undefined,
    },
  };
}

export default async function PostDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(decodeSlugParam(slug));
  if (!post) notFound();

  const coverUrl = coverPathUrl(post.cover_path);
  const postUrl = `${SITE_URL}/nea/${post.slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    ...(post.published_at ? { datePublished: post.published_at } : {}),
    ...(coverUrl ? { image: [coverUrl] } : {}),
    url: postUrl,
    author: { '@type': 'Organization', name: 'Sergiani Travel' },
    publisher: { '@type': 'Organization', name: 'Sergiani Travel' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero
        photo={coverUrl ?? undefined}
        photoAlt={post.title}
        eyebrow="Νέα"
        title={post.title}
        subtitle={post.excerpt ?? undefined}
        breadcrumbs={[
          { label: 'Αρχική', href: '/' },
          { label: 'Νέα', href: '/nea' },
          { label: post.title },
        ]}
        heightClass="h-[52vh] min-h-[400px]"
      />
      <section className="py-16 md:py-24">
        <div className="container max-w-prose">
          <div className="mb-10 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg border border-border bg-surface p-6 shadow-card">
            {post.trip_date && (
              <div className="flex items-center gap-2.5 text-[15px] text-body">
                <Calendar className="h-5 w-5 shrink-0 text-cta" strokeWidth={1.75} />
                <span><span className="font-semibold">Ημερομηνία εκδρομής:</span> {new Date(post.trip_date).toLocaleDateString('el-GR')}</span>
              </div>
            )}
            {post.price != null && (
              <div className="text-[15px] text-body">
                <span className="font-semibold">Τιμή:</span> {post.price}€ / άτομο
              </div>
            )}
            <Button asChild variant="accent" className="ml-auto">
              <Link href={`/kratisi?post=${post.slug}`}>Κλείστε Online Θέση</Link>
            </Button>
          </div>
          <PostBody body={post.body} />
          <Link href="/nea" className="mt-10 inline-block font-sans text-[14px] font-semibold uppercase tracking-[0.1em] text-primary hover:text-cta">
            ← Όλα τα άρθρα
          </Link>
        </div>
      </section>
    </>
  );
}
