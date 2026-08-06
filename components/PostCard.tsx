import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types/blog";

interface PostCardProps {
  post: Post;
  categoryName: string;
  authorNickname: string;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function PostCard({
  post,
  categoryName,
  authorNickname,
}: PostCardProps) {
  return (
    <article className="post-card">
      <Link href={`/posts/${post.id}`} className="post-card-thumb">
        <Image
          src={post.thumbnail}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, 200px"
        />
      </Link>
      <div className="post-card-body">
        <div className="post-card-meta">
          <span className="post-card-category">{categoryName}</span>
          <span className="post-card-date">{formatDate(post.createdAt)}</span>
        </div>
        <Link href={`/posts/${post.id}`} className="post-card-title">
          {post.title}
        </Link>
        <p className="post-card-summary">{post.summary}</p>
        <div className="post-card-footer">
          <span className="post-card-author">{authorNickname}</span>
          <span className="post-card-stats">
            <span title="조회수">조회 {post.viewCount}</span>
            <span title="공감">♥ {post.sympathyCount}</span>
            <span title="댓글">댓글 {post.commentCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}