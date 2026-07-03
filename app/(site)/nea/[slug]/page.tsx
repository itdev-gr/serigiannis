import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/shared/PageHero';
import { LegalBody } from '@/components/shared/LegalBody';
import { getPostBySlug, getPublishedPostSlugs } from '@/lib/queries/posts';
import { coverPathUrl } from '@/lib/images';
import { SITE_URL } from '@/lib/seo';

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublishedPostSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
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
  const post = await getPostBySlug(slug);
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
          <LegalBody text={post.body} />
          <Link href="/nea" className="mt-10 inline-block font-sans text-[14px] font-semibold uppercase tracking-[0.1em] text-primary hover:text-cta">
            ← Όλα τα άρθρα
          </Link>
        </div>
      </section>
    </>
  );
}
