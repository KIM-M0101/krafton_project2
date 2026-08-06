import { getRecommendedBlogs } from "@/lib/api";
import TopNav from "@/components/TopNav";
import FeedHeader from "@/components/FeedHeader";
import FeedEmptyState from "@/components/FeedEmptyState";
import RecommendedBlogGrid from "@/components/RecommendedBlogGrid";

export default async function FeedPage() {
  const recommendedBlogs = await getRecommendedBlogs();

  return (
    <div className="page">
      <TopNav />
      <div className="feed-layout">
        <FeedHeader subscribingCount={1} subscriberCount={0} />
        <FeedEmptyState />
        <section className="recommend-section">
          <h2 className="recommend-heading">추천 블로그</h2>
          <RecommendedBlogGrid blogs={recommendedBlogs} />
        </section>
      </div>
    </div>
  );
}