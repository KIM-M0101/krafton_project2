export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  postCount: number;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface Tag {
  id: number;
  name: string;
  postCount: number;
}

export interface User {
  id: number;
  nickname: string;
  avatar: string;
}

export type PostVisibility = "public" | "protected" | "private";

export interface RecommendedBlog {
  id: number;
  blogName: string;
  ownerNickname: string;
  avatar: string;
  subscriberCount: number;
  description: string;
}

export interface Post {
  id: number;
  title: string;
  summary: string;
  content: string;
  thumbnail: string;
  authorId: number;
  categoryId: number;
  tagIds: number[];
  visibility: PostVisibility;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  sympathyCount: number;
  commentCount: number;
}