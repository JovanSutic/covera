import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * R33/H17: on a pathname change — not the first render, not a search-only
 * change — focus the main region without scrolling and announce the new title.
 */
export function RouteAnnouncer() {
  const location = useLocation();
  const [message, setMessage] = useState("");
  const previousPathname = useRef<string | null>(null);
  const hasRendered = useRef(false);

  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      previousPathname.current = location.pathname;
      return;
    }

    if (previousPathname.current === location.pathname) return;
    previousPathname.current = location.pathname;

    const title = document.title;

    const main = document.querySelector("main");
    if (main) {
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    }

    setMessage(title);
  }, [location.pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
