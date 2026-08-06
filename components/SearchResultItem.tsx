import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";
import { Post } from "@/types/blog";

interface SearchResultItemProps {
  post: Post;
  query: string;
  authorNickname: string;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text;

  const pattern = new RegExp(`(${escapeRegExp(query)})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => (
    <Fragment key={index}>
      {part.toLowerCase() === query.toLowerCase() ? (
        <strong className="search-highlight">{part}</strong>
      ) : (
        part
      )}
    </Fragment>
  ));
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

export default function SearchResultItem({
  post,
  query,
  authorNickname,
}: SearchResultItemProps) {
  return (
    <li className="search-result-item">
      <div className="search-result-body">
        <p className="search-result-author">{authorNickname}</p>
        <Link href={`/posts/${post.id}`} className="search-result-title">
          {highlight(post.title, query)}
        </Link>
        <p className="search-result-summary">{highlight(post.summary, query)}</p>
        <div className="search-result-meta">
          <span>♥ {post.sympathyCount}</span>
          <span>💬 {post.commentCount}</span>
          <span>{formatDate(post.createdAt)}</span>
        </div>
      </div>
      <Link href={`/posts/${post.id}`} className="search-result-thumb">
        <Image src={post.thumbnail} alt={post.title} fill sizes="180px" />
      </Link>
    </li>
  );
}