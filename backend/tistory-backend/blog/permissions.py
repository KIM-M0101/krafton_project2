from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    """작성자 본인만 수정/삭제 가능, 나머지는 읽기만"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        author = getattr(obj, "author", None)
        return author == request.user or request.user.is_staff


class IsStaffOrReadOnly(permissions.BasePermission):
    """카테고리/태그는 블로그 주인(관리자)만 생성/수정/삭제"""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class IsCommentOwnerOrReadOnly(permissions.BasePermission):
    """댓글 작성자 본인 또는 관리자만 수정/삭제 가능"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if request.user.is_staff:
            return True
        return obj.author == request.user
