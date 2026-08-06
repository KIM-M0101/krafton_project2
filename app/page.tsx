import { getCategories, getPosts, getUsers } from "@/lib/api";
import TopNav from "@/components/TopNav";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryTabs from "@/components/CategoryTabs";
import RankedPostList from "@/components/RankedPostList";
import SidebarLoginCard from "@/components/SidebarLoginCard";
import CreatorRecommend from "@/components/CreatorRecommend";
import RecentFeed from "@/components/RecentFeed";

interface HomePageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;

  const [categories, users] = await Promise.all([getCategories(), getUsers()]);

  const activeCategory = categories.find(
    (category) => category.slug === resolvedSearchParams.category
  );

  const posts = await getPosts({
    categoryId: activeCategory?.id,
    query: resolvedSearchParams.q,
  });

  const authorMap: Record<number, string> = {};
  users.forEach((user) => {
    authorMap[user.id] = user.nickname;
  });

  const heroPosts = [...posts]
    .sort((a, b) => b.sympathyCount - a.sympathyCount)
    .slice(0, 4);
  const rankedPosts = [...posts]
    .sort((a, b) => b.sympathyCount - a.sympathyCount)
    .slice(0, 5);
  const recentPosts = [...posts]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 4);

  return (
    <div className="page">
      <TopNav />
      <div className="content-layout">
        <main className="content-main">
          <HeroCarousel posts={heroPosts} authorMap={authorMap} />
          <CategoryTabs categories={categories} activeSlug={resolvedSearchParams.category} />
          {posts.length === 0 ? (
            <p className="empty-state">조건에 맞는 글이 없습니다.</p>
          ) : (
            <RankedPostList posts={rankedPosts} authorMap={authorMap} />
          )}
        </main>
        <aside className="content-sidebar">
          <SidebarLoginCard />
          <CreatorRecommend creators={users} />
          <RecentFeed posts={recentPosts} />
        </aside>
      </div>
    </div>
  );
}