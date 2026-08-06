"""
로그인 백엔드(FastAPI)가 발급한 JWT(sub=user_id)를 그대로 검증해서
Django 쪽 request.user로 연결해주는 DRF 인증 클래스.
"""
from django.conf import settings
from jose import JWTError, jwt
from rest_framework import authentication, exceptions

from .models import KakaoUser


class KakaoJWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
        except JWTError:
            raise exceptions.AuthenticationFailed("유효하지 않거나 만료된 토큰입니다.")

        user_id = payload.get("sub")
        if not user_id:
            raise exceptions.AuthenticationFailed("토큰에 사용자 정보가 없습니다.")

        try:
            user = KakaoUser.objects.get(pk=int(user_id))
        except KakaoUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("사용자를 찾을 수 없습니다.")

        return (user, token)
