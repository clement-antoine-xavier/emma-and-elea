"use client";

import {useAppShellMobile} from "@astryxdesign/core/AppShell";
import {Badge} from "@astryxdesign/core/Badge";
import {Divider} from "@astryxdesign/core/Divider";
import {HStack} from "@astryxdesign/core/HStack";
import {Link} from "@astryxdesign/core/Link";
import {Stack} from "@astryxdesign/core/Stack";
import {TopNav, TopNavHeading, TopNavItem} from "@astryxdesign/core/TopNav";
import {Text} from "@astryxdesign/core/Text";
import {useTranslations} from "next-intl";
import {AuthStatus} from "@/components/auth-status";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";
import {usePathname} from "@/i18n/navigation";

export type DashboardNavItem = "overview" | "team";

export function DashboardNav({
  items,
  roleLabel,
}: {
  items: DashboardNavItem[];
  roleLabel: string;
}) {
  const t = useTranslations("Dashboard.nav");
  const pathname = usePathname();
  const {isMobile, closeMobileNav} = useAppShellMobile();

  const hrefFor = (item: DashboardNavItem) =>
    item === "overview" ? "/dashboard" : "/dashboard/team";

  return (
    <TopNav
      label={t("label")}
      heading={
        <TopNavHeading heading="Emma & Éléa" headingHref="/dashboard" />
      }
      startContent={
        isMobile ? (
          <Stack gap={4}>
            {items.map((item) => (
              <Link
                key={item}
                href={hrefFor(item)}
                isStandalone
                onClick={closeMobileNav}
              >
                {t(item)}
              </Link>
            ))}
            <Divider />
            <Stack gap={2}>
              <Text type="label" color="secondary">
                {roleLabel}
              </Text>
              <LocaleSwitcher />
              <ThemeSwitcher />
            </Stack>
            <Divider />
            <AuthStatus />
          </Stack>
        ) : (
          items.map((item) => (
            <TopNavItem
              key={item}
              label={t(item)}
              href={hrefFor(item)}
              isSelected={pathname === hrefFor(item)}
            />
          ))
        )
      }
      endContent={
        isMobile ? null : (
          <HStack gap={3} align="center">
            <Badge label={roleLabel} variant="purple" />
            <LocaleSwitcher />
            <ThemeSwitcher />
            <AuthStatus />
          </HStack>
        )
      }
    />
  );
}
