import type {ReactNode} from "react";
import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";

/**
 * Title block shared by every workspace screen. The heading level is always 1
 * so each route has a single document title; sections inside the page start at
 * level 2.
 */
export function PageHeader({
  title,
  intro,
  eyebrow,
  actions,
}: {
  title: string;
  intro?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <Stack gap={3}>
      <HStack gap={4} justify="between" align="end" wrap="wrap">
        <Stack gap={2}>
          {eyebrow ? (
            <Text type="label" color="accent">
              {eyebrow}
            </Text>
          ) : null}
          <Heading level={1} type="display-3">
            {title}
          </Heading>
        </Stack>
        {actions}
      </HStack>
      {intro ? (
        <Text type="large" color="secondary">
          {intro}
        </Text>
      ) : null}
    </Stack>
  );
}
