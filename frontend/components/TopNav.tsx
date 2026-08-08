"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Volume2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import HeaderSearch from "./HeaderSearch";
import AccountMenu from "./AccountMenu";
import { getCurrentUser } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AuthUser } from "@/types/auth";

export default function TopNav() {
  const pathname = usePathname();

  // 로그인된 유저 정보. 로그인 안 했으면 null
  const [user, setUser] = useState<AuthUser | null>(null);
  // 로그인 여부 "확인이 끝났는지" 표시용 (확인 전엔 아무것도 안 보여줘서 깜빡임 방지)
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();

    // 저장된 토큰이 없으면 바로 "로그인 안 함"으로 확정
    if (!token) {
      setChecked(true);
      return;
    }

    // 토큰이 있으면 그걸로 실제 유저 정보를 백엔드에 물어봄
    getCurrentUser(token).then((currentUser) => {
      setUser(currentUser);
      setChecked(true);
    });
  }, []);

  // 카카오 로그인 페이지로 이동 (지우가 준 핸들러)
  function handleKakaoLogin() {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/kakao/login`;
  }

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <Link href="/" className="brand">
          <span className="brand-ti">ti</span>
          <span className="brand-story">story</span>
        </Link>
        <nav className="nav-tabs" aria-label="주요 메뉴">
          <Link
            href="/"
            className={pathname === "/" ? "nav-tab nav-tab--active" : "nav-tab"}
          >
            홈
          </Link>
          <Link
            href="/feed"
            className={pathname === "/feed" ? "nav-tab nav-tab--active" : "nav-tab"}
          >
            피드
          </Link>
          <Link
            href="/skin"
            className={pathname === "/skin" ? "nav-tab nav-tab--active" : "nav-tab"}
          >
            스킨
          </Link>
          <Link
            href="/forum"
            className={pathname === "/forum" ? "nav-tab nav-tab--active" : "nav-tab"}
          >
            포럼
          </Link>
        </nav>
        <Suspense fallback={null}>
          <HeaderSearch />
        </Suspense>
        <div className="nav-right">
          <div className="notice">
            <Volume2 size={16} />
            <span>불법촬영물 유통 방지 조치 대상 확대 안내</span>
          </div>
          {/* 알림 아이콘은 로그인 안 했을 땐 안 보이고, 로그인했을 때만 나타남 */}
          {/* 확인이 끝난 후에만 (로그인버튼) 또는 (알림 아이콘 + AccountMenu) 중 하나를 보여줌 */}
          {checked &&
            (user ? (
              <>
                <button type="button" className="icon-btn" aria-label="알림">
                  <Bell size={20} />
                </button>
                <AccountMenu user={user} />
              </>
            ) : (
              <button type="button" className="nav-cta" onClick={handleKakaoLogin}>
                시작하기
              </button>
            ))}
        </div>
      </div>
    </header>
  );
}