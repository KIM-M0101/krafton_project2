import {
  Blog,
  Category,
  Comment,
  Post,
  PostVisibility,
  RecommendedBlog,
  Tag,
  User,
} from "@/types/blog";
import { AuthUser } from "@/types/auth";

// 브라우저용 주소. 배포 환경에서는 CORS/혼합 콘텐츠를 피하려고 Vercel rewrites 경유
// 상대경로(예: /api/proxy/django/api/v1)를 씀. 로컬에서는 EC2/localhost 절대주소를 그대로 씀.
const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PUBLIC_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

// rewrites는 "Next 서버로 들어오는 요청"만 가로채므로, 서버 컴포넌트(SSR)에서 나가는
// fetch에는 적용되지 않음 → 상대경로를 쓰면 Node fetch가 파싱 실패로 죽는다.
// 그래서 서버에서 실행될 때는 EC2 주소로 직접 호출하고, 브라우저에서는 프록시 상대경로를 쓴다.
function apiBaseUrl(): string | undefined {
  if (typeof window === "undefined" && process.env.DJANGO_API_ORIGIN) {
    return `${process.env.DJANGO_API_ORIGIN}/api/v1`;
  }
  return PUBLIC_API_BASE_URL;
}

function backendBaseUrl(): string | undefined {
  if (typeof window === "undefined" && process.env.FASTAPI_BACKEND_ORIGIN) {
    return process.env.FASTAPI_BACKEND_ORIGIN;
  }
  return PUBLIC_BACKEND_URL;
}

// 인증이 필요한 요청에 Authorization 헤더를 붙여주는 헬퍼
function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBaseUrl()}${path}`, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return res.json();
}

// Django는 기본적으로 끝에 슬래시(/)가 붙은 경로를 사용함
export function getCategories() {
  return fetchJSON<Category[]>("/categories/");
}

export function getTags() {
  return fetchJSON<Tag[]>("/tags/");
}

export function getUsers() {
  return fetchJSON<User[]>("/users/");
}

export function getRecommendedBlogs() {
  return fetchJSON<RecommendedBlog[]>("/recommendedBlogs/");
}

// 홈(서버 컴포넌트)에서 토큰 없이 부르는 대표 블로그 정보 (공개 엔드포인트)
export function getBlog() {
  return fetchJSON<Blog>("/blog/public/");
}

export async function getPostById(id: string): Promise<Post | null> {
  // Django PostViewSet을 숫자 id(pk) 조회로 맞춰둠 → /posts/{id}/
  const res = await fetch(`${apiBaseUrl()}/posts/${id}/`, { cache: "no-store" });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch post ${id}`);
  }

  return res.json();
}

export function getComments(postId: number) {
  // Django CommentViewSet은 ?post= 쿼리로 특정 글의 댓글을 필터함
  return fetchJSON<Comment[]>(`/comments/?post=${postId}`);
}

interface CreatePostParams {
  title: string;
  summary: string;
  content: string;
  thumbnail: string;
  authorId: number;
  categoryId: number;
  tagIds: number[];
  visibility: PostVisibility;
  isDraft: boolean;
}

// 프론트의 visibility/isDraft 조합을 Django Post.status(DRAFT/PUBLISHED/PRIVATE)로 변환
function toStatus(visibility: PostVisibility, isDraft: boolean): string {
  if (isDraft) return "DRAFT";
  if (visibility === "public") return "PUBLISHED";
  return "PRIVATE"; // private/protected는 백엔드에 protected 개념이 없어 PRIVATE로 합침
}

// 에디터에서 고른 이미지 파일을 백엔드에 업로드하고, 본문에 넣을 이미지 URL을 돌려줌
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`${apiBaseUrl()}/uploads/image/`, {
    method: "POST",
    // FormData는 Content-Type을 브라우저가 boundary와 함께 자동 설정하므로 직접 지정하지 않음
    headers: authHeaders(getTokenForApi()),
    body: form,
  });

  if (!res.ok) {
    throw new Error("이미지 업로드에 실패했습니다.");
  }

  const data = await res.json();
  return data.url as string;
}

// 본문 마크다운(![alt](url))에서 첫 번째 이미지 URL을 뽑아냄 (썸네일용)
function firstImageUrl(content: string): string | undefined {
  const match = content.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
  return match ? match[1] : undefined;
}

export async function createPost(params: CreatePostParams): Promise<Post> {
  const token = getTokenForApi();
  const res = await fetch(`${apiBaseUrl()}/posts/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(token) },
    body: JSON.stringify({
      title: params.title,
      summary: params.summary,
      content: params.content,
      status: toStatus(params.visibility, params.isDraft),
      categoryId: params.categoryId, // 파서가 category_id로 변환 → 카테고리 지정
      tagIds: params.tagIds, // 파서가 tag_ids로 변환 → 태그 지정
      // 본문 첫 이미지를 썸네일로 사용 (파서가 thumbnail_url로 변환). 없으면 백엔드가 무시
      thumbnailUrl: firstImageUrl(params.content),
      // authorId는 백엔드에서 토큰으로 결정
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to create post");
  }

  return res.json();
}

// 글 삭제 (로그인 필요, 작성자 본인만 백엔드에서 허용됨)
export async function deletePost(id: number, token: string): Promise<void> {
  const res = await fetch(`${apiBaseUrl()}/posts/${id}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });

  // 성공은 204(No Content). 403/404 등은 실패로 처리
  if (!res.ok) {
    throw new Error("Failed to delete post");
  }
}

// 저장해둔 토큰으로 "지금 로그인된 유저가 누구인지" 로그인 백엔드(FastAPI)에 물어봄
export async function getCurrentUser(token: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${backendBaseUrl()}/api/auth/me`, {
      headers: authHeaders(token),
      cache: "no-store",
    });

    if (!res.ok) {
      return null;
    }

    return res.json();
  } catch {
    return null;
  }
}

interface GetPostsParams {
  categoryId?: number;
  tagId?: number;
  query?: string;
  authorId?: number;
}

export async function getPosts(params: GetPostsParams = {}) {
  // Django는 익명 요청에 발행글만 내려주지만, 안전하게 프론트에서도 한 번 더 거른다
  const posts = await fetchJSON<Post[]>("/posts/");
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
      const matchesAuthor = params.authorId
        ? post.authorId === params.authorId
        : true;

      return matchesCategory && matchesTag && matchesQuery && matchesAuthor;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// 내 블로그 정보 (로그인 필요) - 토큰의 주인 기준
export async function getMyBlog(token: string): Promise<Blog> {
  const res = await fetch(`${apiBaseUrl()}/blog/`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch my blog");
  }

  return res.json();
}

// 내가 쓴 글 목록 (임시저장/비공개 포함, 로그인 필요)
export async function getMyPosts(token: string): Promise<Post[]> {
  const res = await fetch(`${apiBaseUrl()}/mypage/posts/`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch my posts");
  }

  const posts: Post[] = await res.json();
  return posts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// api.ts는 서버/클라이언트 양쪽에서 import되므로, 브라우저에서만 토큰을 읽도록 안전하게 접근
function getTokenForApi(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem("token") ?? undefined;
}
