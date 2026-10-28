import type {ReactNode} from "react";
import {AppShell} from "@astryxdesign/core/AppShell";
import {getTranslations} from "next-intl/server";
import {DashboardSideNav} from "@/components/dashboard-side-nav";
import {availableAssistantPersonas} from "@/server/agents/access";
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
  const t = await getTranslations("Dashboard");
  const tRoles = await getTranslations("Roles");
  const {items} = dashboardService.getNavigation(actor);
  const assistantEnabled = availableAssistantPersonas(actor).length > 0;

  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      mobileNav={{breakpoint: "lg"}}
      sideNav={
        <DashboardSideNav
          items={items}
          roleLabel={tRoles(`${actor.role}.label`)}
          brand={t("brand")}
          assistantEnabled={assistantEnabled}
        />
      }
    >
      {children}
    </AppShell>
  );
}
