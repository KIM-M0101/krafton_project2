"use client";

import { useState } from "react";
import { User } from "@/types/blog";

interface CreatorRecommendProps {
  creators: User[];
}

export default function CreatorRecommend({ creators }: CreatorRecommendProps) {
  const [subscribedIds, setSubscribedIds] = useState<number[]>([]);

  function toggleSubscribe(id: number) {
    setSubscribedIds((prev) =>
      prev.includes(id) ? prev.filter((subscribedId) => subscribedId !== id) : [...prev, id]
    );
  }

  return (
    <div className="creator-section">
      <h2 className="creator-heading">스토리 크리에이터</h2>
      <ul className="creator-list">
        {creators.map((creator) => {
          const isSubscribed = subscribedIds.includes(creator.id);
          return (
            <li key={creator.id} className="creator-item">
              <span className="creator-name">{creator.nickname}</span>
              <button
                type="button"
                className={
                  isSubscribed
                    ? "creator-subscribe creator-subscribe--active"
                    : "creator-subscribe"
                }
                onClick={() => toggleSubscribe(creator.id)}
              >
                {isSubscribed ? "구독중" : "+ 구독"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}