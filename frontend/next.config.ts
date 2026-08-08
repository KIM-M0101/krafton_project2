import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
