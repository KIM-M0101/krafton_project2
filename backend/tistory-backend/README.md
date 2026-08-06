# 티스토리 클론 백엔드 (Post / Comment / Category / Tag)

담당 범위: 게시글, 댓글, 카테고리, 태그 기능 (Django + DRF + PostgreSQL)

로그인/회원(카카오 OAuth, JWT 발급)은 `backend/app`의 FastAPI 서버가 담당하고,
이 Django 서버는 그 FastAPI가 만든 `users` 테이블과 발급한 JWT를 그대로 읽어서 씁니다
(`accounts/models.py`, `accounts/authentication.py` 참고). 두 서버는 같은 PostgreSQL
DB를 공유하는 별도 프로세스로 동시에 떠 있어야 정상 동작합니다.

## 1. 설치 및 실행

```bash
cd backend/tistory-backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

DB는 루트의 `docker-compose.yml`이 띄우는 PostgreSQL(`db` 서비스)을 그대로 씁니다.
저장소 루트에서:

```bash
docker compose up db backend   # db(Postgres) + FastAPI 로그인 서버
```

FastAPI가 최초 1회 기동되면서 `users` 테이블을 만들어 줍니다. **`users` 테이블이 생긴
뒤에** Django 마이그레이션을 돌려야 합니다 (blog 테이블들이 `users`를 FK로 참조하기 때문).

```bash
cd backend/tistory-backend
python manage.py migrate
# createsuperuser는 사용하지 않습니다 — 유저는 카카오 로그인(FastAPI)으로만 생성됨

# FastAPI가 이미 8000번 포트를 쓰고 있으므로 Django는 다른 포트로 띄웁니다
python manage.py runserver 8001
```

DB 접속 정보(`DB_NAME/USER/PASSWORD/HOST/PORT`)는 `docker-compose.yml`의 기본값과
이미 맞춰져 있어 별도 설정 없이도 동작합니다. 다른 값을 쓰려면 환경변수로 덮어쓰세요.

## 2. 인증 (FastAPI가 발급한 카카오 로그인 JWT를 그대로 검증)

- 로그인/토큰 발급은 전부 FastAPI(`/api/auth/kakao/login`, `/api/auth/kakao/callback`) 쪽에서 처리합니다.
- 프론트는 그렇게 받은 JWT를 `Authorization: Bearer <token>` 헤더에 담아 이 Django API를 호출하면 됩니다.
- Django는 `accounts.authentication.KakaoJWTAuthentication`으로 그 JWT를 검증만 합니다 (직접 발급하지 않음).
- **중요**: FastAPI(`backend/.env`)와 Django(`config/settings.py` 또는 이 폴더의 `.env`)의
  `JWT_SECRET_KEY`가 반드시 동일해야 토큰 검증이 성공합니다. `.env.example` 참고.

## 3. API 엔드포인트

### 카테고리 (`/api/v1/categories/`)
| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/categories/` | 최상위 카테고리 목록 (하위는 children으로 중첩) | 전체 |
| POST | `/categories/` | 카테고리 생성 (parent 지정 가능) | staff만 |
| PUT/PATCH | `/categories/{id}/` | 수정 | staff만 |
| DELETE | `/categories/{id}/` | 삭제 | staff만 |

### 태그 (`/api/v1/tags/`)
| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/tags/` | 태그 목록 | 전체 |
| GET | `/tags/popular/` | 게시글 많은 순 인기 태그 20개 | 전체 |
| POST | `/tags/` | 태그 생성 | staff만 |

### 게시글 (`/api/v1/posts/`)
| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/posts/` | 목록 (발행글 + 본인 글) | 전체(비공개는 본인만) |
| GET | `/posts/{slug}/` | 상세 조회 (조회수 자동 증가) | 전체 |
| POST | `/posts/` | 작성 (태그는 이름 배열로 전달, 없으면 자동 생성) | 로그인 필요 |
| PUT/PATCH | `/posts/{slug}/` | 수정 | 작성자 본인만 |
| DELETE | `/posts/{slug}/` | 삭제 | 작성자 본인만 |
| POST | `/posts/{slug}/like/` | 좋아요 +1 | 로그인 필요 |

필터/검색: `?category__slug=xxx`, `?tags__slug=xxx`, `?status=PUBLISHED`, `?search=키워드`, `?ordering=-view_count`

게시글 생성 예시:
```json
{
  "title": "첫 글입니다",
  "content": "본문 내용",
  "summary": "요약",
  "category": 1,
  "tags": ["django", "python"],
  "status": "PUBLISHED"
}
```

### 댓글 (`/api/v1/comments/`)
| Method | URL | 설명 | 권한 |
|---|---|---|---|
| GET | `/comments/?post={post_id}` | 해당 글의 최상위 댓글 (대댓글은 replies로 중첩) | 전체(비밀댓글은 마스킹) |
| POST | `/comments/` | 댓글 작성 (`parent` 지정 시 대댓글) | 전체(비회원은 guest_name 사용) |
| PATCH | `/comments/{id}/` | 수정 | 작성자 본인만 |
| DELETE | `/comments/{id}/` | 삭제 (대댓글 있으면 소프트 삭제) | 작성자 본인만 |

- `is_secret: true`로 비밀댓글 작성 가능 — 댓글 작성자/글 작성자/관리자만 내용이 보이고, 그 외에는 "비밀댓글입니다"로 마스킹됩니다.
- 대댓글은 1단계까지만 지원(무한 중첩 방지). 필요하면 프론트 요청에 맞춰 조정 가능.

### 검색 (`/api/v1/posts/search/`)
- `GET /posts/search/?q=키워드` — 제목/본문/요약/태그/카테고리를 한 번에 검색
- 기존 필터(`category__slug`, `tags__slug`, `status` 등)와 `ordering`도 같이 조합 가능
  - 예: `/posts/search/?q=파이썬&ordering=-view_count`
- 단일 필드만 검색하고 싶으면 기존처럼 `/posts/?search=키워드`도 계속 사용 가능 (DRF 기본 SearchFilter)

### 좋아요/공감 (`/api/v1/posts/{slug}/like/`)
- `POST /posts/{slug}/like/` — 토글 방식. 처음 누르면 좋아요 추가, 다시 누르면 취소
- 로그인 필요, 유저당 글 하나에 1회만 카운트(`PostLike` unique 제약)
- 응답: `{"liked": true/false, "like_count": 3}`
- 게시글 목록/상세 응답에 `is_liked` 필드로 현재 로그인 유저의 좋아요 여부 포함

### 이미지 업로드 (`/api/v1/uploads/image/`)
- `POST /uploads/image/` (multipart/form-data, `image` 필드) — 글쓰기 에디터 본문에 삽입할 이미지 업로드
- 로그인 필요, jpg/jpeg/png/gif/webp만 허용, 5MB 이하 제한
- 응답의 `url`을 에디터 `<img src>`로 바로 사용
- 글 저장 시 본문에 포함된 이미지의 `post` 필드를 해당 글 id로 연결해주면 나중에 "글 삭제 시 첨부 이미지 정리" 같은 작업이 쉬워짐 (현재는 연결 로직 프론트/추가 구현 필요)

### 마이페이지 (`/api/v1/mypage/`)
| Method | URL | 설명 |
|---|---|---|
| GET | `/mypage/profile/` | 내 프로필(닉네임/아바타/가입일) + 작성 글수/댓글수 |
| GET | `/mypage/posts/` | 내가 쓴 글 목록 (임시저장/비공개 포함), `?status=`, `?category__slug=` 필터 가능 |
| GET | `/mypage/comments/` | 내가 쓴 댓글 목록 |
| GET | `/mypage/liked-posts/` | 내가 좋아요 누른 글 목록 |

- 모두 로그인 필요. 프로필 자체의 수정(닉네임/비밀번호 변경 등)은 User 인증 담당 팀원의 API 영역이라 여기선 조회만 제공.

## 4. 다음에 논의가 필요한 부분
- 인증 방식 최종 확정 (JWT vs 세션) — 프론트 팀과 협의 필요
- 비회원 댓글 사용 여부 및 비밀번호 검증 로직 (현재 필드만 만들어둠, 해싱/검증 로직 미구현)
- 이미지 업로드 저장소 (로컬 media vs S3 등)
