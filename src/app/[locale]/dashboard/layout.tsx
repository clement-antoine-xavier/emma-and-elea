import type {ReactNode} from "react";
import {AppShell} from "@astryxdesign/core/AppShell";
import {getTranslations} from "next-intl/server";
import {DashboardNav, type DashboardNavItem} from "@/components/dashboard-nav";
import {can} from "@/lib/permissions";
import {requireOrganization} from "@/lib/access";

// Session and search params are request data; keep the route blocking
// until the dashboard is migrated to a streamed shell.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireOrganization();
  const tRoles = await getTranslations("Roles");

  const navItems: DashboardNavItem[] = ["overview"];

  if (can(context.role, "member:read")) {
    navItems.push("team");
  }

  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      mobileNav={{breakpoint: "lg"}}
      topNav={
        <DashboardNav
          items={navItems}
          roleLabel={tRoles(`${context.role}.label`)}
        />
      }
    >
      {children}
    </AppShell>
  );
}
