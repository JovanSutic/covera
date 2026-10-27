export type ParamType = "number" | "uuid" | "numbersList" | "name" | { oneOf: readonly string[] };

export type ParamsDeclaration = Record<string, ParamType>;

/**
 * The `:param` names in a route pattern, with optional segments (`:x?`) stripped,
 * so `checkParamKeys` can compare them against a `params` declaration.
 */
export type PathParam<P extends string> = P extends `${string}:${infer Rest}`
  ? Rest extends `${infer Name}?/${infer Tail}`
    ? Name | PathParam<`/${Tail}`>
    : Rest extends `${infer Name}?`
      ? Name
      : Rest extends `${infer Name}/${infer Tail}`
        ? Name | PathParam<`/${Tail}`>
        : Rest
  : never;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAME_PATTERN = /^[\w.-]+$/;
const NUMBER_PATTERN = /^\d+$/;
const NUMBERS_LIST_PATTERN = /^\d+(,\d+)*$/;

export function isValidParam(value: string, type: ParamType): boolean {
  if (typeof type === "object") return type.oneOf.includes(value);

  switch (type) {
    case "number": {
      if (!NUMBER_PATTERN.test(value)) return false;
      const parsed = Number(value);
      return Number.isSafeInteger(parsed);
    }
    case "uuid":
      return UUID_PATTERN.test(value);
    case "numbersList":
      return NUMBERS_LIST_PATTERN.test(value);
    case "name":
      return NAME_PATTERN.test(value);
  }
}

export type ParsedParams = Record<string, string | number | number[]>;

export function parseParam(value: string, type: ParamType): string | number | number[] {
  if (typeof type === "object") return value;

  switch (type) {
    case "number":
      return Number(value);
    case "numbersList":
      return value.split(",").map((part) => Number(part));
    case "uuid":
    case "name":
      return value;
  }
}

export function stringifyParam(value: string | number | number[], type: ParamType): string {
  if (typeof type === "string" && type === "numbersList") {
    return Array.isArray(value) ? value.join(",") : String(value);
  }
  return String(value);
}

export function areParamsValid(
  params: Record<string, string | undefined>,
  types: ParamsDeclaration,
): boolean {
  return Object.entries(types).every(([key, type]) => {
    const value = params[key];
    if (value === undefined) return false;
    return isValidParam(value, type);
  });
}

export function parseParams(
  params: Record<string, string | undefined>,
  types: ParamsDeclaration,
): ParsedParams {
  const parsed: ParsedParams = {};
  for (const [key, type] of Object.entries(types)) {
    const value = params[key];
    if (value === undefined) continue;
    parsed[key] = parseParam(value, type);
  }
  return parsed;
}
