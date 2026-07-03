import { PostForm } from '@/components/admin/PostForm';
import { upsertPost } from '../../actions';

export default function NewPostPage() {
  return (
    <div>
      <h1 className="mb-8 font-display text-4xl font-semibold text-primary">Νέο Άρθρο</h1>
      <PostForm action={upsertPost} />
    </div>
  );
}
