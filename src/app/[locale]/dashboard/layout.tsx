import type {ReactNode} from "react";
import {AppShell} from "@astryxdesign/core/AppShell";
import {getTranslations} from "next-intl/server";
import {DashboardNav} from "@/components/dashboard-nav";
import {requireOrganizationActor} from "@/server/auth/actor";
import {dashboardService} from "@/server/services/container";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actor = await requireOrganizationActor();
  const tRoles = await getTranslations("Roles");
  const {items} = dashboardService.getNavigation(actor);

  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      mobileNav={{breakpoint: "lg"}}
      topNav={
        <DashboardNav
          items={items}
          roleLabel={tRoles(`${actor.role}.label`)}
        />
      }
    >
      {children}
    </AppShell>
  );
}
