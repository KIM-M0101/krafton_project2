"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LayoutGrid, Volume2 } from "lucide-react";
import HeaderSearch from "./HeaderSearch";

export default function TopNav() {
  const pathname = usePathname();

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
        <HeaderSearch />
        <div className="nav-right">
          <div className="notice">
            <Volume2 size={16} />
            <span>불법촬영물 유통 방지 조치 대상 확대 안내</span>
          </div>
          <button type="button" className="icon-btn" aria-label="알림">
            <Bell size={20} />
          </button>
          <button type="button" className="avatar-btn" aria-label="전체 메뉴">
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}