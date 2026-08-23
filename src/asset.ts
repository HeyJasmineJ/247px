export function asset(path: string): string;
export function asset(path: string | null | undefined): string | undefined;
export function asset(path: string | null | undefined) {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
