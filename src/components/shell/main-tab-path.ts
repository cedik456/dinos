import { roleTabs, type AppRole } from "@/components/shell/role-tab-config";

export function mainTabIndex(pathname: string, role: AppRole) {
  const roleRoot = `/${role}`;

  if (pathname === roleRoot || pathname === `${roleRoot}/`) return 0;

  const index = roleTabs[role].findIndex((tab) => {
    if (tab.route === "index") return false;

    const path = `${roleRoot}/${tab.route}`;
    return pathname === path || pathname.startsWith(`${path}/`);
  });

  return Math.max(index, 0);
}

export function isMainTabPath(pathname: string, role: AppRole) {
  return roleTabs[role].some((tab) => {
    const path = tab.route === "index" ? `/${role}` : `/${role}/${tab.route}`;
    return pathname === path || pathname === `${path}/`;
  });
}
