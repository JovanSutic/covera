/**
 * D24: the language travels with the link.
 *
 * The Header keeps the language in `<lang>` on the query string and `i18n` keeps it in
 * localStorage, but neither follows a `<Link>`: a link replaces the whole search string,
 * so the next page starts without it. Every href this app builds for its own navigation
 * goes through here.
 *
 * `en` is omitted, matching the Header's rule for the default language: a clean URL is
 * the default, and `?lang=en` would be a second way of saying nothing. An unsupported
 * code is ignored rather than written into the URL.
 */
export const SUPPORTED_LANGS = ["en", "de", "tr", "sr-Latn"] as const;

export type AppLang = (typeof SUPPORTED_LANGS)[number];

export function withLang(path: string, lang: string): string {
  if (lang === "en" || !SUPPORTED_LANGS.includes(lang as AppLang)) return path;

  const hashIndex = path.indexOf("#");
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  const withoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);

  const queryIndex = withoutHash.indexOf("?");
  const base = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const search = queryIndex === -1 ? "" : withoutHash.slice(queryIndex + 1);

  const params = new URLSearchParams(search);
  params.set("lang", lang);

  return `${base}?${params.toString()}${hash}`;
}
