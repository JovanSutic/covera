/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/router/AppContext";
import { buildPath, appPaths } from "@/lib/router";
import { cn } from "@/lib/utils";
import CustomSelect from "./formItems/Select";

const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "de", label: "DE" },
  { code: "tr", label: "TR" },
  { code: "sr-Latn", label: "SR" },
];

const SUPPORTED_LANG_CODES = LANGUAGES.map((l) => l.code);

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, status } = useSession();
  const isLoading = status === "loading";
  const { i18n } = useTranslation("general");

  // Read language from query param or fallback to "en"
  const urlLang = searchParams.get("lang");
  const currentLang =
    urlLang && SUPPORTED_LANG_CODES.includes(urlLang) ? urlLang : "en";

  // Sync i18n instance whenever URL language changes
  useEffect(() => {
    if (i18n.language !== currentLang) {
      i18n.changeLanguage(currentLang);
    }
  }, [currentLang, i18n]);

  // Update query param on select change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLang = e.target.value;
    const newParams = new URLSearchParams(searchParams);

    if (selectedLang === "en") {
      newParams.delete("lang"); // Keep URL clean for default language
    } else {
      newParams.set("lang", selectedLang);
    }

    setSearchParams(newParams, { replace: true });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate(buildPath(appPaths.login));
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center">
          <span className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Covera
          </span>
        </div>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100 dark:bg-gray-800" />
          ) : (
            <ProfileDropdown
              user={user}
              currentLang={currentLang}
              onLanguageChange={handleLanguageChange}
              onLogout={handleLogout}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function ProfileDropdown({
  user,
  currentLang,
  onLanguageChange,
  onLogout,
}: {
  user: any;
  currentLang: string;
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onLogout: () => void;
}) {
  const { t } = useTranslation("general");
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || t("header.userFallback", "User")
    : t("header.guestUser", "Guest");

  const displaySubtitle = user
    ? user.email
    : t("header.guestSubtitle", "Welcome to your stay");

  const initials = user
    ? `${user?.firstName?.charAt(0) || ""}${user?.lastName?.charAt(0) || ""}`.toUpperCase() || "U"
    : "G";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 dark:bg-blue-600 dark:focus:ring-blue-500"
        aria-expanded={isOpen}
      >
        {initials}
      </button>

      <div
        className={cn(
          "absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl transition-all duration-200 ease-in-out dark:border-gray-800 dark:bg-gray-900",
          isOpen
            ? "visible opacity-100 translate-y-0"
            : "invisible opacity-0 -translate-y-1 pointer-events-none",
        )}
        role="menu"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {displaySubtitle}
          </p>
        </div>

        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

        <div className="flex items-center justify-between px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
              />
            </svg>
            {t("header.language", "Language")}
          </span>

          <CustomSelect
            value={currentLang}
            onChange={onLanguageChange}
            options={LANGUAGES.map((lang) => ({
              value: lang.code,
              label: lang.label,
            }))}
            containerClassName="w-20"
          />
        </div>

        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

        {user ? (
          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors focus:outline-none"
            role="menuitem"
          >
            <svg
              className="mr-2 h-4 w-4 stroke-[2.5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {t("header.signOut", "Sign out")}
          </button>
        ) : (
          <button
            onClick={() => {
              setIsOpen(false);
              navigate(buildPath(appPaths.login));
            }}
            className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 transition-colors focus:outline-none"
            role="menuitem"
          >
            <svg
              className="mr-2 h-4 w-4 stroke-[2.5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            {t("header.signIn", "Sign in")}
          </button>
        )}
      </div>
    </div>
  );
}