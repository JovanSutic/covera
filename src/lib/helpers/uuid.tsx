export type WithClientId<T> = T & {
  _clientId: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addClientId<T extends Record<string, any>>(items: T[]): WithClientId<T>[] {
  return items.map((item) => ({
    ...item,
    _clientId: item._clientId ?? crypto.randomUUID(),
  }));
}


export function removeClientId<T extends { _clientId?: string }>(
  items: T[]
): Omit<T, "_clientId">[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return items.map(({ _clientId, ...cleanItem }) => cleanItem);
}