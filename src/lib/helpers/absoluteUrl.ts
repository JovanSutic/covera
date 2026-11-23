/**
 * D12/prep 4a: the URL the host PASTES somewhere else.
 *
 * `buildPath` returns an app-relative path (`/inspection/<id>`), which is right for a
 * `<Link>` and wrong for a message: the host sends this to a guest by email or chat, where
 * a relative URL resolves against the reader's own origin — or against nothing. The guest
 * then has a dead link and the host has no way to know.
 *
 * `origin` is a parameter rather than a `window.location.origin` read so this stays pure
 * and testable, and so the caller is visibly responsible for the value (the component reads
 * `window.location.origin` once).
 *
 * An already-absolute URL is returned unchanged: the caller may hand this a path that
 * `withLang` or a future helper already made absolute, and prefixing it again would produce
 * `https://a/https://b`.
 */
export function absoluteUrl(path: string, origin: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return path;

  const base = origin.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;

  return `${base}${suffix}`;
}