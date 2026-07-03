import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { Post } from '@/types/db';
import { coverPathUrl } from '@/lib/images';

export function PostCard({ post }: { post: Post }) {
  const cover = coverPathUrl(post.cover_path);
  const date = post.published_at ? new Date(post.published_at).toLocaleDateString('el-GR') : null;
  return (
    <Link
      href={`/nea/${post.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card transition-all duration-300 ease-editorial hover:-translate-y-1 hover:shadow-card-hover"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-primary/5">
        {cover ? (
          <div className="absolute inset-0 transition-transform duration-700 ease-editorial group-hover:scale-105">
            <Image src={cover} alt={post.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-mesh-blue" aria-hidden />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        {date && <span className="font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-muted">{date}</span>}
        <h3 className="mt-2 font-display text-[22px] font-semibold leading-tight text-primary">{post.title}</h3>
        {post.excerpt && <p className="mt-2 text-[15px] leading-relaxed text-muted line-clamp-2">{post.excerpt}</p>}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
          <span className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-primary group-hover:text-cta">Διαβάστε περισσότερα</span>
          <ArrowUpRight className="h-4 w-4 text-primary transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-cta" strokeWidth={1.75} />
        </div>
      </div>
    </Link>
  );
}
