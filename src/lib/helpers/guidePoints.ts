/**
 * D8: the guide's bullet list, read defensively.
 *
 * `guide.sections.*.points` is an ARRAY in `en` and was a numeric-keyed OBJECT in `de`,
 * `tr` and `sr-Latn` — `npm run i18n:translate`'s `unflattenObject` writes arrays back that
 * way, and `DamageClaimGuidePage` called `.map()` on the result, so the page threw in every
 * non-English locale (prep 6). The locale files are repaired, but the script that broke them
 * still does this, so the page must not depend on the shape being right.
 *
 * A non-array renders as an empty list. That is the honest degradation: the section still
 * shows its title and body, and a wrong `points` shape costs three bullets rather than the
 * whole page.
 */
export function guidePoints(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  // The numeric-keyed object the translate script produces. Keyed order is the authoring
  // order, so sorting numerically preserves it.
  if (value !== null && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .filter((key) => /^\d+$/.test(key))
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => (value as Record<string, unknown>)[key])
      .filter((entry): entry is string => typeof entry === "string");
  }

  return [];
}
