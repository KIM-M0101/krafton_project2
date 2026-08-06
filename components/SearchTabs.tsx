interface SearchTabsProps {
  postCount: number;
}

export default function SearchTabs({ postCount }: SearchTabsProps) {
  return (
    <div className="search-tabs">
      <div className="search-tab search-tab--active">
        글 <span className="search-tab-count">{postCount}건</span>
      </div>
      <div className="search-tab search-tab--disabled">블로그</div>
    </div>
  );
}