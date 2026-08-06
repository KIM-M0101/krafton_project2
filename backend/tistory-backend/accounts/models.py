"""
로그인 백엔드(FastAPI)가 SQLAlchemy로 만들고 채워넣는 'users' 테이블을
Django 쪽에서 그대로 읽어 쓰기 위한 모델. Django는 이 테이블의 스키마를
관리하지 않음(managed=False) - 실제 컬럼 생성/변경은 FastAPI 쪽 책임.
"""
from django.db import models


class KakaoUser(models.Model):
    id = models.AutoField(primary_key=True)
    kakao_id = models.BigIntegerField(unique=True)
    nickname = models.CharField(max_length=255, null=True, blank=True)
    profile_image = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(null=True, blank=True)

    # Django의 AUTH_USER_MODEL 체크가 요구하는 최소 속성.
    # 실제 로그인/가입은 FastAPI 쪽에서만 이루어지므로 의미는 없음.
    USERNAME_FIELD = "kakao_id"
    REQUIRED_FIELDS = []

    class Meta:
        db_table = "users"
        managed = False

    def __str__(self):
        return self.nickname or f"user-{self.id}"

    # DRF/Django가 request.user에 기대하는 최소한의 인터페이스.
    # 이 유저들은 카카오 로그인으로만 생성되고 비밀번호가 없어서
    # Django 기본 인증(admin 로그인 등)은 사용하지 않음.
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return True

    @property
    def is_staff(self):
        return False

    def has_perm(self, perm, obj=None):
        return False

    def has_module_perms(self, app_label):
        return False
