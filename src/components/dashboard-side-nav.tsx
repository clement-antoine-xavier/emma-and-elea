"use client";

import {Badge} from "@astryxdesign/core/Badge";
import {Icon} from "@astryxdesign/core/Icon";
import {NavIcon} from "@astryxdesign/core/NavIcon";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
  useSideNavCollapse,
} from "@astryxdesign/core/SideNav";
import {Stack} from "@astryxdesign/core/Stack";
import {ChefHat, LayoutDashboard, Users} from "lucide-react";
import {useTranslations} from "next-intl";
import {usePathname} from "next/navigation";
import {AuthStatus} from "@/components/auth-status";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";

export type DashboardNavItem = "overview" | "team";

const navIcons = {
  overview: LayoutDashboard,
  team: Users,
} as const;

const hrefFor = (item: DashboardNavItem) =>
  item === "overview" ? "/dashboard" : "/dashboard/team";

/**
 * Account controls only fit the expanded rail. The collapsed rail is icons
 * only, so the section disappears until the nav is expanded again.
 */
function SideNavAccount({roleLabel}: {roleLabel: string}) {
  const t = useTranslations("Dashboard.nav");
  const {isCollapsed} = useSideNavCollapse();

  if (isCollapsed) {
    return null;
  }

  return (
    <SideNavSection title={t("account")} isHeaderHidden>
      <Stack gap={3} align="start">
        <Badge label={roleLabel} variant="purple" />
        <LocaleSwitcher />
        <ThemeSwitcher />
        <AuthStatus />
      </Stack>
    </SideNavSection>
  );
}

export function DashboardSideNav({
  items,
  roleLabel,
  brand,
}: {
  items: DashboardNavItem[];
  roleLabel: string;
  brand: string;
}) {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();

  return (
    <SideNav
      collapsible
      resizable={{
        defaultWidth: 300,
        minWidth: 240,
        maxWidth: 380,
        autoSaveId: "dashboard-side-nav",
      }}
      header={
        <SideNavHeading
          heading={brand}
          icon={<NavIcon icon={<Icon icon={ChefHat} size="sm" />} />}
          headingHref="/dashboard"
        />
      }
      footer={<SideNavAccount roleLabel={roleLabel} />}
    >
      <SideNavSection title={t("label")} isHeaderHidden>
        {items.map((item) => (
          <SideNavItem
            key={item}
            label={t(item)}
            icon={navIcons[item]}
            href={hrefFor(item)}
            isSelected={pathname === hrefFor(item)}
          />
        ))}
      </SideNavSection>
    </SideNav>
  );
}
