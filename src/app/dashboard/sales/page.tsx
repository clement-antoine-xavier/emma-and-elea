import type {Metadata} from "next";
import {requirePermission} from "@/server/auth/actor";
import {
  WorkspacePage,
  workspaceMetadata,
} from "@/components/workspace-page";

// Session data keeps this route blocking until it is moved to a streamed shell.
export const instant = false;

export function generateMetadata(): Promise<Metadata> {
  return workspaceMetadata("sales");
}

export default async function SalesPage() {
  await requirePermission("order:read");

  return <WorkspacePage area="sales" />;
}
