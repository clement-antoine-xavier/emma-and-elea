import type {ReactNode} from "react";
import {
  Layout,
  LayoutContent,
  LayoutHeader,
  LayoutPanel,
} from "@astryxdesign/core/Layout";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";

/**
 * Shared page frame: a pinned header band with the route title and actions,
 * then a scrolling content area. Mirrors the Astryx page templates
 * (`dashboard`, `table-page`, `detail-page`) instead of centering a single
 * column, so the title and primary action stay reachable while the page
 * scrolls.
 */
export function PageShell({
  title,
  intro,
  eyebrow,
  actions,
  headerContent,
  hasHeaderDivider = false,
  contentWidth,
  start,
  startLabel,
  startWidth = 240,
  children,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  actions?: ReactNode;
  headerContent?: ReactNode;
  hasHeaderDivider?: boolean;
  contentWidth?: number | string;
  start?: ReactNode;
  startLabel?: string;
  startWidth?: number;
  children: ReactNode;
}) {
  return (
    <Layout
      padding={6}
      height="auto"
      contentWidth={contentWidth}
      start={
        start ? (
          <LayoutPanel
            width={startWidth}
            hasDivider
            padding={0}
            label={startLabel}
          >
            {start}
          </LayoutPanel>
        ) : undefined
      }
    >
      <LayoutHeader
        hasDivider={hasHeaderDivider}
        paddingBlockEnd={4}
        label={title}
      >
        <Stack gap={4}>
          <HStack gap={4} justify="between" align="end" wrap="wrap">
            <Stack gap={1}>
              {eyebrow ? (
                <Text type="label" color="accent">
                  {eyebrow}
                </Text>
              ) : null}
              <Heading level={1} type="display-3">
                {title}
              </Heading>
              {intro ? (
                <Text type="large" color="secondary">
                  {intro}
                </Text>
              ) : null}
            </Stack>
            {actions ? (
              <HStack gap={2} wrap="wrap">
                {actions}
              </HStack>
            ) : null}
          </HStack>
          {headerContent}
        </Stack>
      </LayoutHeader>
      <LayoutContent isScrollable={false}>
        <Stack gap={6}>{children}</Stack>
      </LayoutContent>
    </Layout>
  );
}
