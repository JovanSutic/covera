import { useMemo } from "react";
import { useParams } from "react-router";
import { areParamsValid, parseParams } from "./params";
import type { ParsedParams } from "./params";
import type { PathDefinition } from "./paths";

/**
 * H9/R21: typed params for a route that declares them. A missing or invalid value
 * means the hook is mounted under the wrong route — a programming error, so it
 * throws rather than returning `undefined` and letting an API call fail later.
 */
export function useRouteParams<D extends PathDefinition>(definition: D): ParsedParams {
  const raw = useParams();

  const present = useMemo(() => {
    const result: Record<string, string | undefined> = {};
    for (const key of Object.keys(definition.params)) result[key] = raw[key];
    return result;
  }, [definition.params, raw]);

  if (!areParamsValid(present, definition.params)) {
    throw new Error(
      `[router] useRouteParams(${definition.pattern}) found invalid or missing params: ` +
        `${JSON.stringify(present)}`,
    );
  }

  return parseParams(present, definition.params);
}
