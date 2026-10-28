import { describe, expect, it } from "vitest";
import {
  findCoverageGaps,
  hooksUsedBy,
  parseImports,
  readRouteDeclarations,
  INTERACTION_GATED_HOOKS,
} from "./coverage";
import { QUERY_HOOKS } from "@/lib/api/queries/manifest";

function declarationFor(specifier: string) {
  const found = readRouteDeclarations().find((entry) => entry.specifier === specifier);
  if (!found) throw new Error(`no route declares ${specifier}`);
  return found;
}

describe("the parser sees what it must (guards against a vacuous pass)", () => {
  it("reads a default import, not just a braced one", () => {
    const parsed = parseImports('import Tabs from "@/components/Tabs";\nimport { A, B as C } from "@/x";');

    expect(parsed.map((entry) => entry.specifier)).toContain("@/components/Tabs");
    expect(parsed.find((entry) => entry.specifier === "@/x")?.names).toEqual(["A", "B"]);
  });

  it("finds every page/layout specifier across the route modules", () => {
    const specifiers = readRouteDeclarations().map((entry) => entry.specifier);

    expect(specifiers).toContain("@/pages/host/IndividualApartment");
    expect(specifiers).toContain("@/pages/host/Dashboard");
    expect(specifiers).toContain("@/pages/admin/Dashboard");
    expect(specifiers).toContain("@/pages/InspectionPage");
    expect(specifiers.length).toBeGreaterThanOrEqual(9);
  });

  it("pairs each specifier with the resources declared beside it", () => {
    expect(declarationFor("@/pages/host/IndividualApartment").resources).toEqual([
      "apartment",
      "assets",
      "shots",
      "reservations",
    ]);

    expect(declarationFor("@/pages/InspectionPage").resources).toEqual(["inspection"]);
  });

  it("knows the query hooks", () => {
    expect(QUERY_HOOKS).toHaveProperty("useApartment");
    expect(QUERY_HOOKS).toHaveProperty("useInspection");
    expect(QUERY_HOOKS).toHaveProperty("useApartmentsHost");
  });

  it("detects hooks through a page's transitive local imports", () => {
    // The admin dashboard reads its data in the two section components it renders
    // by DEFAULT import, which a braced-only parser would miss entirely.
    const hooks = hooksUsedBy(declarationFor("@/pages/admin/Dashboard").file);

    expect(hooks).toContain("useUsers");
    expect(hooks).toContain("useApartmentsAll");
  });

  it("detects the host detail page's four hooks", () => {
    const hooks = hooksUsedBy(declarationFor("@/pages/host/IndividualApartment").file);

    expect([...hooks].sort()).toEqual([
      "useApartment",
      "useAssets",
      "useReservations",
      "useShots",
    ]);
  });
});

describe("prefetch coverage (D12)", () => {
  it("every page's queries are declared by its route, or explicitly exempt", () => {
    const gaps = findCoverageGaps();

    // The failure message names the page, the hook and the fix, so whoever adds a
    // query next knows exactly what to declare.
    expect(
      gaps.map(
        (gap) =>
          `${gap.file} reads ${gap.hook} but ${gap.specifier} does not declare it`,
      ),
    ).toEqual([]);
  });

  it("every exemption carries a reason", () => {
    for (const [hook, reason] of Object.entries(INTERACTION_GATED_HOOKS)) {
      expect(reason.length, hook).toBeGreaterThan(20);
    }
  });
});
