from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Category, Tag, Post, Comment, PostLike, UploadedImage

User = get_user_model()


class CategorySerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)
    parent_id = serializers.IntegerField(read_only=True, allow_null=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id", "name", "slug", "description", "parent_id",
            "order", "post_count", "children",
        ]
        read_only_fields = ["slug"]

    def get_children(self, obj):
        # 최상위 목록 조회시에만 하위 카테고리를 함께 내려줘서 트리로 사용 가능
        children = obj.children.all()
        return CategorySerializer(children, many=True, context=self.context).data


class TagSerializer(serializers.ModelSerializer):
    post_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ["id", "name", "slug", "post_count"]
        read_only_fields = ["slug"]


class KakaoUserSerializer(serializers.ModelSerializer):
    avatar = serializers.CharField(source="profile_image", read_only=True)

    class Meta:
        model = User
        fields = ["id", "nickname", "avatar"]


class TagRelatedField(serializers.SlugRelatedField):
    """태그를 이름으로 주고받되, 없으면 자동 생성"""

    def to_internal_value(self, data):
        tag, _ = Tag.objects.get_or_create(name=data)
        return tag


class PostListSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.nickname")
    author_id = serializers.ReadOnlyField()
    category = serializers.ReadOnlyField(source="category.name")
    category_id = serializers.ReadOnlyField()
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    sympathy_count = serializers.IntegerField(source="like_count", read_only=True)
    visibility = serializers.SerializerMethodField()
    is_draft = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "title", "slug", "summary", "thumbnail",
            "author", "author_id", "category", "category_id",
            "tags", "tag_ids", "status", "visibility", "is_draft",
            "view_count", "sympathy_count", "comment_count", "is_liked",
            "created_at", "published_at",
        ]

    def get_tag_ids(self, obj):
        return [tag.id for tag in obj.tags.all()]

    def get_comment_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()

    def get_is_liked(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()

    def get_visibility(self, obj):
        # 프론트가 기대하는 public/protected/private 3단계 중,
        # 지금 모델엔 protected(비밀글) 개념이 없어서 private로 합쳐서 내려줌
        return "public" if obj.status == Post.Status.PUBLISHED else "private"

    def get_is_draft(self, obj):
        return obj.status == Post.Status.DRAFT


class PostDetailSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.nickname")
    author_id = serializers.ReadOnlyField()
    category_id = serializers.ReadOnlyField()
    tags = TagRelatedField(
        many=True, slug_field="name", queryset=Tag.objects.all(), required=False
    )
    tag_ids = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    sympathy_count = serializers.IntegerField(source="like_count", read_only=True)
    visibility = serializers.SerializerMethodField()
    is_draft = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            "id", "title", "slug", "content", "summary", "thumbnail",
            "author", "author_id", "category", "category_id",
            "tags", "tag_ids", "status", "visibility", "is_draft", "allow_comment",
            "view_count", "sympathy_count", "comment_count", "is_liked",
            "created_at", "updated_at", "published_at",
        ]
        read_only_fields = ["slug", "view_count", "like_count"]

    def get_tag_ids(self, obj):
        return [tag.id for tag in obj.tags.all()]

    def get_comment_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()

    def get_is_liked(self, obj):
        user = self.context.get("request").user if self.context.get("request") else None
        if not user or not user.is_authenticated:
            return False
        return obj.likes.filter(user=user).exists()

    def get_visibility(self, obj):
        return "public" if obj.status == Post.Status.PUBLISHED else "private"

    def get_is_draft(self, obj):
        return obj.status == Post.Status.DRAFT

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source="author.nickname")
    replies = serializers.SerializerMethodField()
    content = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            "id", "post", "author", "guest_name", "parent",
            "content", "is_secret", "replies",
            "created_at", "updated_at",
        ]
        read_only_fields = ["post"]

    def get_content(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if obj.is_deleted:
            return "삭제된 댓글입니다."
        if not obj.can_view(user):
            return "비밀댓글입니다."
        return obj.content

    def get_replies(self, obj):
        if obj.parent_id is not None:
            return []  # 대댓글은 한 단계까지만 (무한 중첩 방지)
        qs = obj.replies.all()
        return CommentSerializer(qs, many=True, context=self.context).data

    def create(self, validated_data):
        request = self.context["request"]
        if request.user.is_authenticated:
            validated_data["author"] = request.user
        return super().create(validated_data)


class UploadedImageSerializer(serializers.ModelSerializer):
    """글쓰기 에디터에서 이미지 업로드 시 사용. url 필드로 절대경로를 내려줌"""

    url = serializers.SerializerMethodField()

    class Meta:
        model = UploadedImage
        fields = ["id", "image", "url", "post", "created_at"]
        read_only_fields = ["url", "created_at"]
        extra_kwargs = {"image": {"write_only": True}, "post": {"required": False}}

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.image:
            return None
        return request.build_absolute_uri(obj.image.url) if request else obj.image.url

    def create(self, validated_data):
        validated_data["uploader"] = self.context["request"].user
        return super().create(validated_data)


class MyProfileSerializer(serializers.ModelSerializer):
    """마이페이지 상단에 쓰이는 최소한의 프로필 정보 + 활동 통계.
    회원 정보 자체(가입/수정)는 로그인 백엔드(FastAPI)의 카카오 유저 API 쪽 책임이라 여기선 조회 위주."""

    avatar = serializers.CharField(source="profile_image", read_only=True)
    post_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "nickname", "avatar", "created_at", "post_count", "comment_count"]
        read_only_fields = fields

    def get_post_count(self, obj):
        return obj.posts.filter(status=Post.Status.PUBLISHED).count()

    def get_comment_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()
