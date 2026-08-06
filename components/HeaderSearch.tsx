"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

interface RecentSearch {
  term: string;
  date: string;
}

const STORAGE_KEY = "tistory_recent_searches";

function formatDate(iso: string) {
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}.${day}.`;
}

export default function HeaderSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function persist(next: RecentSearch[]) {
    setRecentSearches(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveSearch(term: string) {
    const next = [
      { term, date: new Date().toISOString() },
      ...recentSearches.filter((item) => item.term !== term),
    ].slice(0, 10);
    persist(next);
  }

  function runSearch(term: string) {
    const trimmed = term.trim();
    if (!trimmed) return;
    saveSearch(trimmed);
    setValue(trimmed);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch(value);
  }

  function removeSearch(term: string) {
    persist(recentSearches.filter((item) => item.term !== term));
  }

  function clearAll() {
    persist([]);
  }

  return (
    <div className="nav-search-wrap" ref={wrapperRef}>
      <form className="nav-search" onSubmit={handleSubmit} role="search">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="검색어 입력"
          className="nav-search-input"
          aria-label="블로그 글 검색"
        />
        <button type="submit" className="nav-search-btn" aria-label="검색">
          <Search size={18} />
        </button>
      </form>
      {open && recentSearches.length > 0 && (
        <div className="search-dropdown">
          <p className="search-dropdown-heading">최근 검색어</p>
          <ul className="search-dropdown-list">
            {recentSearches.map((item) => (
              <li key={item.term} className="search-dropdown-item">
                <button
                  type="button"
                  className="search-dropdown-term"
                  onClick={() => runSearch(item.term)}
                >
                  {item.term}
                </button>
                <span className="search-dropdown-date">{formatDate(item.date)}</span>
                <button
                  type="button"
                  className="search-dropdown-remove"
                  aria-label="검색어 삭제"
                  onClick={() => removeSearch(item.term)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="search-dropdown-footer">
            <button type="button" onClick={clearAll}>
              전체삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}