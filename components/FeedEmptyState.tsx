import Link from "next/link";

export default function FeedEmptyState() {
  return (
    <div className="feed-empty">
      <h2 className="feed-empty-title">
        아직 구독중인 블로그의
        <br />
        새로운 글이 없어요
      </h2>
      <p className="feed-empty-desc">
        관심있는 블로그를 구독하고 새 글 소식을 피드에서 받아보세요.
      </p>
      <Link href="/" className="feed-empty-cta">
        블로그 둘러보기
      </Link>
    </div>
  );
}
