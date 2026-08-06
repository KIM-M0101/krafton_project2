"use client";

import Image from "next/image";
import { useState } from "react";
import { RecommendedBlog } from "@/types/blog";

interface RecommendedBlogGridProps {
  blogs: RecommendedBlog[];
}

export default function RecommendedBlogGrid({ blogs }: RecommendedBlogGridProps) {
  const [subscribedIds, setSubscribedIds] = useState<number[]>([]);

  function toggleSubscribe(id: number) {
    setSubscribedIds((prev) =>
      prev.includes(id) ? prev.filter((subscribedId) => subscribedId !== id) : [...prev, id]
    );
  }

  return (
    <div className="blog-grid">
      {blogs.map((blog) => {
        const isSubscribed = subscribedIds.includes(blog.id);
        return (
          <div key={blog.id} className="blog-card">
            <div className="blog-avatar">
              <Image src={blog.avatar} alt={blog.blogName} fill sizes="72px" />
            </div>
            <p className="blog-name">{blog.blogName}</p>
            <p className="blog-subscribers">구독자 {blog.subscriberCount}</p>
            <p className="blog-desc">{blog.description}</p>
            <button
              type="button"
              className={
                isSubscribed ? "blog-subscribe-btn blog-subscribe-btn--active" : "blog-subscribe-btn"
              }
              onClick={() => toggleSubscribe(blog.id)}
            >
              {isSubscribed ? "구독중" : "구독하기"}
            </button>
          </div>
        );
      })}
    </div>
  );
}