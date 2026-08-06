import Link from "next/link";
import { Category } from "@/types/blog";

interface CategoryTabsProps {
  categories: Category[];
  activeSlug?: string;
}

export default function CategoryTabs({ categories, activeSlug }: CategoryTabsProps) {
  const topLevel = categories.filter((category) => category.parentId === null);

  return (
    <div className="category-tabs">
      <Link
        href="/"
        className={!activeSlug ? "category-tab category-tab--active" : "category-tab"}
      >
        전체
      </Link>
      {topLevel.map((category) => (
        <Link
          key={category.id}
          href={`/?category=${category.slug}`}
          className={
            category.slug === activeSlug
              ? "category-tab category-tab--active"
              : "category-tab"
          }
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}