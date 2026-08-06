interface FeedHeaderProps {
  subscribingCount: number;
  subscriberCount: number;
}

export default function FeedHeader({
  subscribingCount,
  subscriberCount,
}: FeedHeaderProps) {
  return (
    <div className="feed-header">
      <div className="feed-header-text">
        <p className="feed-eyebrow">Feed</p>
        <h1 className="feed-heading">내가 구독하는 글입니다</h1>
      </div>
      <div className="feed-stats">
        <span>
          구독중 <strong>{subscribingCount}</strong>
        </span>
        <span>
          구독자 <strong>{subscriberCount}</strong>
        </span>
      </div>
    </div>
  );
}