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
import {
  BarChart3,
  BookOpen,
  Boxes,
  ChefHat,
  Factory,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Truck,
  Users,
} from "lucide-react";
import {useTranslations} from "next-intl";
import {usePathname} from "next/navigation";
import {AuthStatus} from "@/components/auth-status";
import {AssistantDrawer} from "@/components/assistant/assistant-drawer";
import type {AssistantPersona} from "@/lib/assistant";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {
  dashboardHref,
  type DashboardNavItem,
} from "@/lib/navigation";

const navIcons = {
  overview: LayoutDashboard,
  production: Factory,
  recipes: BookOpen,
  stock: Boxes,
  catalog: Package,
  purchasing: Truck,
  sales: Receipt,
  reports: BarChart3,
  team: Users,
  settings: Settings,
} as const;

/**
 * Sections only shape the rail. Visibility is decided by
 * `dashboard.service.getNavigation`, which filters on the actor's role.
 */
const navSections: ReadonlyArray<{
  titleKey: "operations" | "supply" | "business" | "organization";
  items: readonly DashboardNavItem[];
}> = [
  {
    titleKey: "operations",
    items: ["production", "recipes", "stock"],
  },
  {
    titleKey: "supply",
    items: ["catalog", "purchasing"],
  },
  {
    titleKey: "business",
    items: ["sales", "reports"],
  },
  {
    titleKey: "organization",
    items: ["team", "settings"],
  },
];

function isSelected(pathname: string, item: DashboardNavItem): boolean {
  const href = dashboardHref(item);

  if (item === "overview") return pathname === href;

  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Account controls only fit the expanded rail. The collapsed rail is icons
 * only, so the section disappears until the nav is expanded again.
 */
function SideNavAccount({
  roleLabel,
  assistantEnabled,
  assistantPersonas,
}: {
  roleLabel: string;
  assistantEnabled: boolean;
  assistantPersonas: AssistantPersona[];
}) {
  const t = useTranslations("Dashboard.nav");
  const {isCollapsed} = useSideNavCollapse();

  if (isCollapsed) {
    return null;
  }

  return (
    <SideNavSection title={t("account")} isHeaderHidden>
      <Stack gap={3} align="start">
        {assistantEnabled ? (
          <AssistantDrawer availablePersonas={assistantPersonas} />
        ) : null}
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
  assistantEnabled,
  assistantPersonas,
}: {
  items: DashboardNavItem[];
  roleLabel: string;
  brand: string;
  assistantEnabled: boolean;
  assistantPersonas: AssistantPersona[];
}) {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();
  const visible = new Set(items);

  const renderItem = (item: DashboardNavItem) => (
    <SideNavItem
      key={item}
      label={t(item)}
      icon={navIcons[item]}
      href={dashboardHref(item)}
      isSelected={isSelected(pathname, item)}
    />
  );

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
      footer={
        <SideNavAccount
          roleLabel={roleLabel}
          assistantEnabled={assistantEnabled}
          assistantPersonas={assistantPersonas}
        />
      }
    >
      {visible.has("overview") ? (
        <SideNavSection title={t("label")} isHeaderHidden>
          {renderItem("overview")}
        </SideNavSection>
      ) : null}

      {navSections.map((section) => {
        const sectionItems = section.items.filter((item) => visible.has(item));
        if (sectionItems.length === 0) return null;

        return (
          <SideNavSection
            key={section.titleKey}
            title={t(`sections.${section.titleKey}`)}
          >
            {sectionItems.map(renderItem)}
          </SideNavSection>
        );
      })}
    </SideNav>
  );
}
