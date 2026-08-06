import { getPosts, getUsers } from "@/lib/api";
import TopNav from "@/components/TopNav";
import SearchTabs from "@/components/SearchTabs";
import SearchResultItem from "@/components/SearchResultItem";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q ?? "";
  const sort = resolvedSearchParams.sort === "latest" ? "latest" : "relevance";

  const [posts, users] = await Promise.all([
    getPosts({ query }),
    getUsers(),
  ]);

  const sortedPosts =
    sort === "latest"
      ? [...posts].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      : posts;

  const authorMap: Record<number, string> = {};
  users.forEach((user) => {
    authorMap[user.id] = user.nickname;
  });

  return (
    <div className="page">
      <TopNav />
      <div className="search-layout">
        <h1 className="search-heading">{query}</h1>
        <SearchTabs postCount={sortedPosts.length} />
        <div className="search-sort">
          <a
            href={`/search?q=${encodeURIComponent(query)}`}
            className={
              sort === "relevance"
                ? "search-sort-link search-sort-link--active"
                : "search-sort-link"
            }
          >
            정확도순
          </a>
          <a
            href={`/search?q=${encodeURIComponent(query)}&sort=latest`}
            className={
              sort === "latest"
                ? "search-sort-link search-sort-link--active"
                : "search-sort-link"
            }
          >
            최신순
          </a>
        </div>
        {sortedPosts.length === 0 ? (
          <p className="empty-state">&apos;{query}&apos;에 대한 검색 결과가 없습니다.</p>
        ) : (
          <ul className="search-result-list">
            {sortedPosts.map((post) => (
              <SearchResultItem
                key={post.id}
                post={post}
                query={query}
                authorNickname={authorMap[post.authorId] ?? ""}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}