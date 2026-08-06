import Image from "next/image";
import Link from "next/link";
import { Post } from "@/types/blog";

interface RankedPostListProps {
  posts: Post[];
  authorMap: Record<number, string>;
}

export default function RankedPostList({ posts, authorMap }: RankedPostListProps) {
  return (
    <ol className="ranked-list">
      {posts.map((post, index) => (
        <li key={post.id} className="ranked-item">
          <span className="ranked-number">{index + 1}</span>
          <div className="ranked-body">
            <p className="ranked-eyebrow">{authorMap[post.authorId] ?? ""}</p>
            <Link href={`/posts/${post.id}`} className="ranked-title">
              {post.title}
            </Link>
          </div>
          <Link href={`/posts/${post.id}`} className="ranked-thumb">
            <Image src={post.thumbnail} alt={post.title} fill sizes="84px" />
          </Link>
        </li>
      ))}
    </ol>
  );
}