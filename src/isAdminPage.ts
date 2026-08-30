export function isAdminPage(): boolean {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/admin") return true;
  return new URLSearchParams(window.location.search).has("admin");
}
