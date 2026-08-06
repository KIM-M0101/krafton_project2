import { Category, Post, RecommendedBlog, Tag, User } from "@/types/blog";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
 
async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return res.json();
}

export function getCategories() {
  return fetchJSON<Category[]>("/categories");
}

export function getTags() {
  return fetchJSON<Tag[]>("/tags");
}

export function getUsers() {
  return fetchJSON<User[]>("/users");
}

export function getRecommendedBlogs() {
  return fetchJSON<RecommendedBlog[]>("/recommendedBlogs");
}

interface GetPostsParams {
  categoryId?: number;
  tagId?: number;
  query?: string;
}

export async function getPosts(params: GetPostsParams = {}) {
  const posts = await fetchJSON<Post[]>("/posts");
  const visiblePosts = posts.filter(
    (post) => post.visibility === "public" && !post.isDraft
  );

  return visiblePosts
    .filter((post) => {
      const matchesCategory = params.categoryId
        ? post.categoryId === params.categoryId
        : true;
      const matchesTag = params.tagId
        ? post.tagIds.includes(params.tagId)
        : true;
      const matchesQuery = params.query
        ? `${post.title} ${post.summary}`
            .toLowerCase()
            .includes(params.query.toLowerCase())
        : true;

      return matchesCategory && matchesTag && matchesQuery;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}