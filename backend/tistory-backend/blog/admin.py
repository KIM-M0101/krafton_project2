from django.contrib import admin
from .models import Category, Tag, Post, Comment, PostLike, UploadedImage


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "order"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "status", "view_count", "created_at"]
    list_filter = ["status", "category"]
    search_fields = ["title", "content"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["post", "author", "guest_name", "is_secret", "is_deleted", "created_at"]
    list_filter = ["is_secret", "is_deleted"]


@admin.register(PostLike)
class PostLikeAdmin(admin.ModelAdmin):
    list_display = ["post", "user", "created_at"]


@admin.register(UploadedImage)
class UploadedImageAdmin(admin.ModelAdmin):
    list_display = ["image", "uploader", "post", "created_at"]
