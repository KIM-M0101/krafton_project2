FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8001"]

# Python 이미지 사용
# requirements 설치
# Django 코드 복사
# 8001 포트로 Django 실행