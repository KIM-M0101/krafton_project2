from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils import timezone


class Category(models.Model):
    """티스토리처럼 카테고리를 트리 구조(상위/하위)로 관리"""

    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True, blank=True)
    description = models.CharField(max_length=200, blank=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
    )
    order = models.PositiveIntegerField(default=0)  # 카테고리 정렬 순서
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Tag(models.Model):
    name = models.CharField(max_length=30, unique=True)
    slug = models.SlugField(max_length=40, unique=True, blank=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name, allow_unicode=True)
        super().save(*args, **kwargs)


class Post(models.Model):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "임시저장"
        PUBLISHED = "PUBLISHED", "발행"
        PRIVATE = "PRIVATE", "비공개"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True, blank=True)
    content = models.TextField()
    summary = models.CharField(max_length=300, blank=True)
    thumbnail = models.ImageField(upload_to="post_thumbnails/", null=True, blank=True)

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="posts"
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="posts"
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="posts")

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PUBLISHED)
    allow_comment = models.BooleanField(default=True)

    view_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=True) or "post"
            slug = base_slug
            i = 1
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                i += 1
                slug = f"{base_slug}-{i}"
            self.slug = slug
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def increase_view_count(self):
        Post.objects.filter(pk=self.pk).update(view_count=models.F("view_count") + 1)


class Comment(models.Model):
    """대댓글(부모-자식)과 티스토리 특유의 비밀댓글을 지원"""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="comments",
        null=True,
        blank=True,
    )
    # 비회원 댓글을 허용할 경우를 대비 (팀 정책에 따라 사용 여부 결정)
    guest_name = models.CharField(max_length=50, blank=True)
    guest_password = models.CharField(max_length=128, blank=True)  # 비회원 댓글 수정/삭제용, 해시 저장

    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies"
    )
    content = models.TextField(max_length=1000)
    is_secret = models.BooleanField(default=False)  # 비밀댓글: 작성자/글쓴이만 열람

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)  # 대댓글 구조 보존을 위한 소프트 삭제

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.author or self.guest_name}: {self.content[:20]}"

    def can_view(self, user):
        """비밀댓글 열람 권한: 댓글 작성자, 글 작성자, 관리자만 가능"""
        if not self.is_secret:
            return True
        if user is None or not user.is_authenticated:
            return False
        return user == self.author or user == self.post.author or user.is_staff


class PostLike(models.Model):
    """게시글 공감(좋아요). 유저당 글 하나에 한 번만 가능하도록 unique 제약"""

    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="post_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("post", "user")

    def __str__(self):
        return f"{self.user} likes {self.post}"


def upload_image_path(instance, filename):
    return f"editor_uploads/{timezone.now():%Y/%m/%d}/{filename}"


class UploadedImage(models.Model):
    """글쓰기 에디터 본문에 삽입되는 이미지. 작성 중에는 post가 비어있다가
    글이 저장되면 연결됨 (에디터에서 이미지부터 올리고 나중에 글을 저장하는 흐름 지원)"""

    image = models.ImageField(upload_to=upload_image_path)
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_images")
    post = models.ForeignKey(
        Post, on_delete=models.SET_NULL, null=True, blank=True, related_name="images"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.image.name
