import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/hooks/auth";
import { cn } from "@/lib/utils";

export default function Header() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useAuthUser();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-center justify-between">
        
        <div className="flex items-center">
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            Covera
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
          ) : user ? (
            <ProfileDropdown user={user} onLogout={handleLogout} />
          ) : null}
        </div>
        
      </div>
    </header>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProfileDropdown({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        aria-expanded={isOpen}
      >
        {initials}
      </button>

      <div
        className={cn(
          "absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl transition-all duration-200 ease-in-out",
          isOpen ? "visible opacity-100 translate-y-0" : "invisible opacity-0 -translate-y-1 pointer-events-none"
        )}
        role="menu"
      >
        <div className="px-3 py-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {user.email}
          </p>
        </div>

        <div className="my-1 border-t border-gray-100" />

        <button
          onClick={() => {
            setIsOpen(false);
            onLogout();
          }}
          className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none"
          role="menuitem"
        >
          <svg className="mr-2 h-4 w-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  );
}