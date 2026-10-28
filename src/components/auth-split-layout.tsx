import type {ReactNode} from "react";
import {Badge} from "@astryxdesign/core/Badge";
import {Center} from "@astryxdesign/core/Center";
import {Grid} from "@astryxdesign/core/Grid";
import {Section} from "@astryxdesign/core/Section";
import {Stack} from "@astryxdesign/core/Stack";
import {Heading, Text} from "@astryxdesign/core/Text";
import Link from "next/link";
import {getTranslations} from "next-intl/server";

/**
 * Split authentication frame: the product argument on the leading side, the
 * form on the trailing side. Mirrors the Astryx `login-split` template and
 * collapses to a stacked layout when the viewport is narrow.
 */
export async function AuthSplitLayout({children}: {children: ReactNode}) {
  const t = await getTranslations("Auth.split");

  return (
    <Grid columns={{minWidth: 460, max: 2}} gap={0} minHeight="100vh">
      <Section
        variant="muted"
        padding={8}
        minHeight="100%"
        dividers={["end"]}
      >
        <Stack gap={6} maxWidth={480} height="100%" justify="center">
          <Badge label={t("badge")} variant="yellow" />
          <Stack gap={3}>
            <Heading level={1} type="display-3">
              {t("title")}
            </Heading>
            <Text type="large" color="secondary">
              {t("intro")}
            </Text>
          </Stack>
          <Stack gap={2} as="ul">
            {(["recipes", "stock", "team"] as const).map((key) => (
              <li key={key}>
                <Text color="secondary">{t(`points.${key}`)}</Text>
              </li>
            ))}
          </Stack>
          <Link href="/">{t("home")}</Link>
        </Stack>
      </Section>
      <Center padding={8}>{children}</Center>
    </Grid>
  );
}
