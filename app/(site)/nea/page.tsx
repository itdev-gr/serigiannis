import type { Metadata } from 'next';
import { PageHero } from '@/components/shared/PageHero';
import { PostCard } from '@/components/blog/PostCard';
import { getPosts } from '@/lib/queries/posts';

export const metadata: Metadata = {
  title: 'Νέα & Άρθρα',
  description: 'Ταξιδιωτικοί οδηγοί, νέα και προτάσεις από τη Sergiani Travel.',
};

export default async function NeaPage() {
  const posts = await getPosts();
  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Νέα & Άρθρα"
        subtitle="Ταξιδιωτικοί οδηγοί, νέα και προτάσεις από τη Sergiani Travel."
        breadcrumbs={[{ label: 'Αρχική', href: '/' }, { label: 'Νέα' }]}
        heightClass="h-[44vh] min-h-[340px]"
      />
      <section className="py-16 md:py-24">
        <div className="container">
          {posts.length === 0 ? (
            <p className="text-[17px] text-muted">Δεν υπάρχουν άρθρα ακόμη.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
