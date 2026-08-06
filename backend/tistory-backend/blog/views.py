from django.db.models import Count, Q, Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, permissions, status, generics
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import KakaoUser

from .models import Category, Tag, Post, Comment, PostLike, UploadedImage
from .serializers import (
    CategorySerializer, TagSerializer, KakaoUserSerializer,
    PostListSerializer, PostDetailSerializer, CommentSerializer,
    UploadedImageSerializer, MyProfileSerializer,
)
from .permissions import IsAuthorOrReadOnly, IsStaffOrReadOnly, IsCommentOwnerOrReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
    """카테고리 CRUD. 최상위 카테고리만 리스트에 내려주고 하위는 children으로 중첩"""

    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        qs = Category.objects.annotate(post_count=Count("posts")).order_by("order", "id")
        if self.action == "list":
            return qs.filter(parent__isnull=True)
        return qs


class TagViewSet(viewsets.ModelViewSet):
    """태그 CRUD + 인기 태그 조회"""

    queryset = Tag.objects.annotate(post_count=Count("posts")).order_by("name")
    serializer_class = TagSerializer
    permission_classes = [IsStaffOrReadOnly]

    @action(detail=False, methods=["get"])
    def popular(self, request):
        tags = Tag.objects.annotate(post_count=Count("posts")).order_by("-post_count")[:20]
        data = [{"id": t.id, "name": t.name, "slug": t.slug, "post_count": t.post_count} for t in tags]
        return Response(data)


class PostViewSet(viewsets.ModelViewSet):
    """게시글 CRUD, 카테고리/태그/검색 필터, 조회수 증가"""

    queryset = Post.objects.select_related("author", "category").prefetch_related("tags")
    permission_classes = [IsAuthorOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category__slug", "tags__slug", "status", "author__nickname"]
    search_fields = ["title", "content", "summary"]
    ordering_fields = ["created_at", "view_count", "like_count"]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer
        return PostDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # 비공개/임시저장 글은 작성자 본인(또는 관리자)에게만 노출, 나머지는 발행글만
        user = self.request.user
        if user.is_authenticated and user.is_staff:
            return qs.distinct()
        if user.is_authenticated:
            from django.db.models import Q
            qs = qs.filter(Q(status=Post.Status.PUBLISHED) | Q(author=user))
        else:
            qs = qs.filter(status=Post.Status.PUBLISHED)
        return qs.distinct()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.increase_view_count()
        instance.refresh_from_db(fields=["view_count"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, slug=None):
        """좋아요 토글: 이미 눌렀으면 취소, 안 눌렀으면 추가. 유저당 1회만 카운트됨"""
        post = self.get_object()
        like, created = PostLike.objects.get_or_create(post=post, user=request.user)
        if created:
            Post.objects.filter(pk=post.pk).update(like_count=post.like_count + 1)
            liked = True
        else:
            like.delete()
            Post.objects.filter(pk=post.pk).update(like_count=max(post.like_count - 1, 0))
            liked = False
        post.refresh_from_db(fields=["like_count"])
        return Response({"liked": liked, "like_count": post.like_count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def search(self, request):
        """제목/본문/요약/태그/카테고리를 아우르는 통합 검색. ?q=키워드"""
        q = request.query_params.get("q", "").strip()
        qs = self.filter_queryset(self.get_queryset())
        if q:
            qs = qs.filter(
                Q(title__icontains=q)
                | Q(content__icontains=q)
                | Q(summary__icontains=q)
                | Q(tags__name__icontains=q)
                | Q(category__name__icontains=q)
            ).distinct()
        page = self.paginate_queryset(qs)
        serializer = PostListSerializer(page or qs, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class CommentViewSet(viewsets.ModelViewSet):
    """댓글 CRUD. post 쿼리 파라미터로 특정 글의 최상위 댓글만 조회"""

    serializer_class = CommentSerializer
    permission_classes = [IsCommentOwnerOrReadOnly]

    def get_queryset(self):
        qs = Comment.objects.select_related("author", "post").prefetch_related("replies")
        post_id = self.request.query_params.get("post")
        if post_id:
            qs = qs.filter(post_id=post_id)
        if self.action == "list":
            qs = qs.filter(parent__isnull=True)
        return qs

    def perform_destroy(self, instance):
        # 대댓글 구조를 보존하기 위해 실제로 지우지 않고 소프트 삭제
        if instance.replies.exists():
            instance.is_deleted = True
            instance.content = ""
            instance.save(update_fields=["is_deleted", "content"])
        else:
            instance.delete()


class ImageUploadView(generics.CreateAPIView):
    """글쓰기 에디터에서 본문 중간에 이미지를 삽입할 때 쓰는 업로드 API.
    응답의 url을 에디터 <img src>로 바로 사용하면 됨."""

    queryset = UploadedImage.objects.all()
    serializer_class = UploadedImageSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    MAX_SIZE_MB = 5
    ALLOWED_EXT = ("jpg", "jpeg", "png", "gif", "webp")

    def create(self, request, *args, **kwargs):
        image = request.FILES.get("image")
        if image is None:
            return Response({"detail": "image 필드가 필요합니다."}, status=status.HTTP_400_BAD_REQUEST)
        ext = image.name.rsplit(".", 1)[-1].lower() if "." in image.name else ""
        if ext not in self.ALLOWED_EXT:
            return Response(
                {"detail": f"지원하지 않는 확장자입니다. ({', '.join(self.ALLOWED_EXT)})"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if image.size > self.MAX_SIZE_MB * 1024 * 1024:
            return Response(
                {"detail": f"이미지는 {self.MAX_SIZE_MB}MB 이하만 업로드 가능합니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)


class MyProfileView(generics.RetrieveAPIView):
    """마이페이지 상단 프로필 + 활동 통계 조회"""

    serializer_class = MyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class MyPostListView(generics.ListAPIView):
    """마이페이지 - 내가 쓴 글 목록 (임시저장/비공개 포함, 상태별 필터 가능)"""

    serializer_class = PostListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "category__slug"]
    ordering_fields = ["created_at", "view_count", "like_count"]

    def get_queryset(self):
        return (
            Post.objects.filter(author=self.request.user)
            .select_related("category")
            .prefetch_related("tags")
        )


class MyCommentListView(generics.ListAPIView):
    """마이페이지 - 내가 쓴 댓글 목록"""

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(author=self.request.user, is_deleted=False).select_related("post")


class MyLikedPostListView(generics.ListAPIView):
    """마이페이지 - 내가 좋아요 누른 글 목록"""

    serializer_class = PostListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(likes__user=self.request.user).select_related("category").prefetch_related("tags")


class KakaoUserViewSet(viewsets.ReadOnlyModelViewSet):
    """프론트에서 글쓴이 닉네임/아바타 표시용으로 쓰는 유저 목록 (읽기 전용)"""

    queryset = KakaoUser.objects.all()
    serializer_class = KakaoUserSerializer
    permission_classes = [permissions.AllowAny]


class RecommendedBlogsView(APIView):
    """추천 블로그 목록. 실제 '블로그'/구독 개념이 없어서
    발행글이 있는 유저를 좋아요 합계 기준으로 추천해줌 (근사치)"""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        users = (
            KakaoUser.objects.filter(posts__status=Post.Status.PUBLISHED)
            .annotate(
                post_count=Count("posts", distinct=True),
                total_likes=Sum("posts__like_count"),
            )
            .order_by("-total_likes")[:10]
        )
        data = [
            {
                "id": user.id,
                "blog_name": f"{user.nickname or ('user-' + str(user.id))}의 블로그",
                "owner_nickname": user.nickname,
                "avatar": user.profile_image,
                "subscriber_count": user.total_likes or 0,
                "description": f"{user.post_count}개의 글을 발행했어요.",
            }
            for user in users
        ]
        return Response(data)
