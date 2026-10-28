import fs from "node:fs";
import path from "node:path";
import { QUERY_HOOKS } from "@/lib/api/queries/manifest";

const SRC = path.resolve(process.cwd(), "src");

/**
 * Route modules name their page with a literal specifier. This reads them out of
 * the route source rather than importing the module, because importing a page
 * pulls React, i18n and the generated client into the check.
 */
const PAGE_SPECIFIER = /(?:page|layout):\s*\(\)\s*=>\s*import\(\s*"([^"]+)"\s*\)/g;

/** `import … from "spec"` — every binding form, including default and type-only. */
const IMPORT_WITH_FROM = /import\s+(?:type\s+)?([\s\S]*?)\s+from\s+"([^"]+)"/g;

/** `import "spec"` — side-effect only. */
const IMPORT_SIDE_EFFECT = /import\s+"([^"]+)"/g;

/** `resource: "name"` — one element of a route's `data:` array. */
const RESOURCE_PROPERTY = /resource:\s*"([a-zA-Z]+)"/g;

const LOCAL_SPECIFIER = /^@\//;

export interface RouteDeclaration {
  /** The `page: () => import("…")` specifier, as written. */
  specifier: string;
  /** Resource names THIS route node declares via `data:`. */
  resources: string[];
  /**
   * Resource names this node declares, PLUS every ancestor's — the match chain.
   * This is what coverage is measured against: a child inherits its section's
   * prefetch, because `defineRoutes` runs the whole matched chain's loaders on
   * navigation. The section's own declaration is what covers `/host/dashboard`.
   */
  chainResources: string[];
  /** The file the specifier resolves to. */
  file: string;
}

export interface ImportedNames {
  names: string[];
  specifier: string;
}

function resolveAlias(specifier: string): string | null {
  const relative = specifier.replace(/^@\//, "");
  const base = path.join(SRC, relative);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }

  return null;
}

/**
 * Every import in a file with its bound names. Handles `import D from`, `import { A, B as C } from`,
 * `import * as N from`, `import D, { A } from` and `import "side-effect"`.
 * A brace-only regex would miss the default form, which `pages/admin/Dashboard.tsx` uses —
 * verified while writing this plan, and the reason step 4.4 exists.
 */
export function parseImports(source: string): ImportedNames[] {
  const found: ImportedNames[] = [];

  for (const match of source.matchAll(IMPORT_WITH_FROM)) {
    const clause = match[1];
    const names: string[] = [];

    const braces = clause.match(/\{([\s\S]*)\}/);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.trim().split(/\s+as\s+/)[0].trim();
        if (name) names.push(name);
      }
    }

    const head = clause
      .split("{")[0]
      .replace(/^\s*\*\s*as\s*/, "")
      .split(",")[0]
      .trim();
    if (head) names.push(head);

    found.push({ names, specifier: match[2] });
  }

  for (const match of source.matchAll(IMPORT_SIDE_EFFECT)) {
    found.push({ names: [], specifier: match[1] });
  }

  return found;
}

/** Every `.ts`/`.tsx` under `src/lib/router/routes/`, in a stable order. */
export function routeModuleFiles(): string[] {
  const dir = path.join(SRC, "lib", "router", "routes");
  return fs
    .readdirSync(dir)
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => path.join(dir, name))
    .sort();
}

/**
 * One `{` in a route module, and the `{` that encloses it. Route modules are plain
 * object literals, so brace nesting IS the route nesting: a child route object is
 * nested inside its parent's `children` array.
 */
interface BraceNode {
  index: number;
  parent: BraceNode | null;
}

/** For each character index, the innermost `{` enclosing it (null outside every object). */
function braceOwners(source: string): (BraceNode | null)[] {
  const owners: (BraceNode | null)[] = new Array(source.length).fill(null);
  const stack: BraceNode[] = [];

  for (let index = 0; index < source.length; index += 1) {
    owners[index] = stack.length > 0 ? stack[stack.length - 1] : null;

    if (source[index] === "{") {
      stack.push({ index, parent: stack.length > 0 ? stack[stack.length - 1] : null });
    } else if (source[index] === "}") {
      stack.pop();
    }
  }

  return owners;
}

/** A route object in a module: the `data:` resources it declares, and its page specifiers. */
interface RouteObjectFacts {
  brace: number;
  resources: string[];
}

/**
 * Reads every route module and pairs each page/layout specifier with the `data`
 * resource names declared in the same object literal — and with those of every
 * enclosing object, since a route's coverage is its whole match chain.
 *
 * The pairing is structural: brace nesting gives the object tree, and a `data:`
 * entry belongs to the object it sits in. A file whose shape this cannot read
 * throws rather than reporting a smaller data surface, because a check that
 * silently sees fewer declarations passes vacuously.
 */
export function readRouteDeclarations(): RouteDeclaration[] {
  const declarations: RouteDeclaration[] = [];

  for (const file of routeModuleFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const owners = braceOwners(source);
    const objects = new Map<number, RouteObjectFacts>();

    const factsFor = (brace: BraceNode | null): RouteObjectFacts | null => {
      if (!brace) return null;
      let facts = objects.get(brace.index);
      if (!facts) {
        facts = { brace: brace.index, resources: [] };
        objects.set(brace.index, facts);
      }
      return facts;
    };

    // `resource:` sits on an element of a `data:` array, so the object that
    // DECLARES it is the element object's parent.
    for (const match of source.matchAll(RESOURCE_PROPERTY)) {
      const declaring = factsFor(owners[match.index]?.parent ?? null);
      if (declaring) declaring.resources.push(match[1]);
    }

    for (const match of source.matchAll(PAGE_SPECIFIER)) {
      const own = factsFor(owners[match.index] ?? null);

      if (!own) {
        throw new Error(
          `[coverage] ${path.relative(SRC, file)} declares page "${match[1]}" outside ` +
            `any route object — this file's shape is not one the check can read.`,
        );
      }

      const resolved = resolveAlias(match[1]);
      if (!resolved) {
        throw new Error(
          `[coverage] ${path.relative(SRC, file)} declares page "${match[1]}" ` +
            `which does not resolve to a file under src/.`,
        );
      }

      // Outermost first, so `chainResources` reads root → leaf.
      const chain: RouteObjectFacts[] = [];
      for (let brace: BraceNode | null = owners[match.index] ?? null; brace; brace = brace.parent) {
        const facts = objects.get(brace.index);
        if (facts) chain.unshift(facts);
      }

      declarations.push({
        specifier: match[1],
        resources: own.resources,
        chainResources: chain.flatMap((entry) => entry.resources),
        file: resolved,
      });
    }
  }

  return declarations;
}

/**
 * The query hooks a module reads, following its app-local imports transitively.
 * A cycle is guarded by the visited set.
 */
export function hooksUsedBy(entryFile: string, seen = new Set<string>()): Set<string> {
  const hooks = new Set<string>();
  if (seen.has(entryFile) || !fs.existsSync(entryFile)) return hooks;
  seen.add(entryFile);

  for (const { names, specifier } of parseImports(fs.readFileSync(entryFile, "utf8"))) {
    for (const name of names) {
      if (name in QUERY_HOOKS) hooks.add(name);
    }

    // Follow app-local imports, but never into the generated client (it is not
    // data surface) and never into styles or JSON.
    if (!LOCAL_SPECIFIER.test(specifier)) continue;
    if (specifier.startsWith("@/api/")) continue;
    if (/\.(css|json)$/.test(specifier)) continue;

    const resolved = resolveAlias(specifier);
    if (resolved) {
      for (const hook of hooksUsedBy(resolved, seen)) hooks.add(hook);
    }
  }

  return hooks;
}

/**
 * D13: the one honest exemption. Content rendered only when a Drawer is opened is
 * genuinely conditional — the route cannot know about it at navigation time, so
 * requiring a declaration would force a wasted request on every visit.
 *
 * Keys are hook names; each entry carries its reason. Editing this list is a
 * deliberate act, and the reason is what makes it reviewable.
 */
export const INTERACTION_GATED_HOOKS: Readonly<Record<string, string>> = {
  useAssetTypes:
    "CreateAssetForm's asset-type read lives inside a Drawer (rendered only when opened); " +
    "declaring it would fetch a form's options on every navigation to the page.",
};

export interface CoverageGap {
  file: string;
  specifier: string;
  hook: string;
}

/**
 * Every hook a page reads that no route in its match chain declares, and that is
 * not explicitly exempt.
 *
 * The chain, not just the page's own route: `/host/dashboard` renders
 * `ApartmentSection`, whose `useApartmentsHost` is covered by the `host` section
 * route's declaration — that loader runs on every navigation into the section.
 * Measuring against the page's own `data:` alone would report that page as
 * uncovered and leave the check with no honest way to pass.
 */
export function findCoverageGaps(): CoverageGap[] {
  const gaps: CoverageGap[] = [];

  for (const declaration of readRouteDeclarations()) {
    const declared = new Set(declaration.chainResources);

    for (const hook of hooksUsedBy(declaration.file)) {
      if (hook in INTERACTION_GATED_HOOKS) continue;

      const owner = QUERY_HOOKS[hook];
      if (!owner || declared.has(owner)) continue;

      gaps.push({
        file: path.relative(SRC, declaration.file),
        specifier: declaration.specifier,
        hook,
      });
    }
  }

  return gaps;
}
