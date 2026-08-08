import type { NextConfig } from "next";

// EC2에서 실제로 서비스 중인 백엔드 origin (예: http://<EC2_IP>:8001, http://<EC2_IP>:8000)
// Vercel 프로젝트 설정 > Environment Variables에 등록. NEXT_PUBLIC_ 접두사 없이 서버 전용으로 둔다.
const DJANGO_ORIGIN = process.env.DJANGO_API_ORIGIN;
const BACKEND_ORIGIN = process.env.FASTAPI_BACKEND_ORIGIN;

const nextConfig: NextConfig = {
  async rewrites() {
    const rules = [];
    if (DJANGO_ORIGIN) {
      rules.push({ source: "/api/proxy/django/:path*", destination: `${DJANGO_ORIGIN}/:path*` });
    }
    if (BACKEND_ORIGIN) {
      rules.push({ source: "/api/proxy/backend/:path*", destination: `${BACKEND_ORIGIN}/:path*` });
    }
    return rules;
  },
  images: {
    // 로컬 개발: Django(localhost:8001)의 업로드 이미지를 next/image가 최적화하도록 허용.
    // Next 16이 사설 IP(localhost) 이미지를 SSRF 방지로 기본 차단하므로 로컬에서만 해제. 배포 시 제거.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "i.pravatar.cc" },
      // 카카오 프로필 사진 CDN (http로 오는 경우도 있음)
      { protocol: "https", hostname: "*.kakaocdn.net" },
      { protocol: "http", hostname: "*.kakaocdn.net" },
      // Django가 서빙하는 업로드 이미지(/media/...)를 next/image에서 쓰기 위해 허용
      { protocol: "http", hostname: "localhost", port: "8001", pathname: "/media/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8001", pathname: "/media/**" },
    ],
  },
};

export default nextConfig;
