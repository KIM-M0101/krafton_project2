from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet, TagViewSet, PostViewSet, CommentViewSet, KakaoUserViewSet,
    RecommendedBlogsView,
    ImageUploadView, MyProfileView, MyPostListView, MyCommentListView, MyLikedPostListView,
)

router = DefaultRouter()
router.register("categories", CategoryViewSet, basename="category")
router.register("tags", TagViewSet, basename="tag")
router.register("posts", PostViewSet, basename="post")
router.register("comments", CommentViewSet, basename="comment")
router.register("users", KakaoUserViewSet, basename="user")

urlpatterns = [
    path("", include(router.urls)),
    path("recommendedBlogs/", RecommendedBlogsView.as_view(), name="recommended_blogs"),

    # 이미지 업로드 (글쓰기 에디터용)
    path("uploads/image/", ImageUploadView.as_view(), name="image_upload"),

    # 마이페이지
    path("mypage/profile/", MyProfileView.as_view(), name="mypage_profile"),
    path("mypage/posts/", MyPostListView.as_view(), name="mypage_posts"),
    path("mypage/comments/", MyCommentListView.as_view(), name="mypage_comments"),
    path("mypage/liked-posts/", MyLikedPostListView.as_view(), name="mypage_liked_posts"),
]
