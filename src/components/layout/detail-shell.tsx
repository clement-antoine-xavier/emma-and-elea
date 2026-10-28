import type {ReactNode} from "react";
import {Grid} from "@astryxdesign/core/Grid";
import {Stack} from "@astryxdesign/core/Stack";

/**
 * Two-column record layout: the record itself on the leading side, its
 * properties and actions in a side rail. Mirrors the Astryx `detail-page` and
 * `work-item-detail` templates, and falls back to one column when the viewport
 * is too narrow for both.
 */
export function DetailShell({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
  asideLabel?: string;
}) {
  if (!aside) {
    return <>{children}</>;
  }

  return (
    <Grid
      columns={{minWidth: 420, max: 2}}
      gap={6}
      align="start"
      width="100%"
    >
      <Stack gap={6}>{children}</Stack>
      <Stack gap={4}>{aside}</Stack>
    </Grid>
  );
}
