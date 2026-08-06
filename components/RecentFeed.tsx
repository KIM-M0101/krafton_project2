import Link from "next/link";
import { Post } from "@/types/blog";

interface RecentFeedProps {
  posts: Post[];
}

function relativeDate(iso: string) {
  const diffDays = Math.floor(
    (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return "오늘";
  if (diffDays < 7) return `${diffDays}일 전`;

  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${month}.${day}`;
}

export default function RecentFeed({ posts }: RecentFeedProps) {
  return (
    <ul className="recent-feed">
      {posts.map((post) => (
        <li key={post.id} className="recent-item">
          <Link href={`/posts/${post.id}`} className="recent-title">
            {post.title}
          </Link>
          <div className="recent-meta">
            <span>♥ {post.sympathyCount}</span>
            <span>💬 {post.commentCount}</span>
            <span>{relativeDate(post.createdAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}