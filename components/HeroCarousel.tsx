"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Post } from "@/types/blog";

interface HeroCarouselProps {
  posts: Post[];
  authorMap: Record<number, string>;
}

export default function HeroCarousel({ posts, authorMap }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const post = posts[index];

  if (!post) return null;

  return (
    <div className="hero">
      <Link href={`/posts/${post.id}`} className="hero-image">
        <Image
          src={post.thumbnail}
          alt={post.title}
          fill
          sizes="(max-width: 900px) 100vw, 760px"
          priority
        />
        <span className="hero-badge">오늘의 티스토리</span>
        <div className="hero-caption">
          <p className="hero-title">&ldquo; {post.title}</p>
          <div className="hero-author">
            <span className="hero-avatar" />
            <span>{authorMap[post.authorId] ?? ""}</span>
          </div>
        </div>
      </Link>
      <div className="hero-dots">
        {posts.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`${i + 1}번째 슬라이드`}
            className={i === index ? "hero-dot hero-dot--active" : "hero-dot"}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}