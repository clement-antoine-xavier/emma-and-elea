import {Suspense, type ReactNode} from "react";
import {AppShell} from "@astryxdesign/core/AppShell";
import {Skeleton} from "@astryxdesign/core/Skeleton";
import {VStack} from "@astryxdesign/core/VStack";
import {getTranslations} from "next-intl/server";
import {DashboardSideNav} from "@/components/dashboard-side-nav";
import {availableAssistantPersonas} from "@/server/agents/access";
import {requireOrganizationActor} from "@/server/auth/actor";
import {dashboardService} from "@/server/services/container";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AppShell
      height="fill"
      variant="surface"
      contentPadding={0}
      mobileNav={{breakpoint: "lg"}}
      sideNav={
        <Suspense fallback={<DashboardNavSkeleton />}>
          <DashboardNavigation />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}

function DashboardNavSkeleton() {
  return (
    <VStack gap={3} padding={4} width={260}>
      <Skeleton width="70%" height={28} />
      <Skeleton width="100%" height={40} index={1} />
      <Skeleton width="100%" height={40} index={2} />
      <Skeleton width="80%" height={40} index={3} />
    </VStack>
  );
}

async function DashboardNavigation() {
  const actor = await requireOrganizationActor();
  const t = await getTranslations("Dashboard");
  const tRoles = await getTranslations("Roles");
  const {items} = dashboardService.getNavigation(actor);
  const assistantEnabled = availableAssistantPersonas(actor).length > 0;

  return (
    <DashboardSideNav
      items={items}
      roleLabel={tRoles(`${actor.role}.label`)}
      brand={t("brand")}
      assistantEnabled={assistantEnabled}
      organizationLogo={actor.organization.logo ?? null}
      organizationName={actor.organization.name}
      userImage={actor.image ?? null}
      userName={actor.name}
    />
  );
}
