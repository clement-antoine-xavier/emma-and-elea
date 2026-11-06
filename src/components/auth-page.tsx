import {HStack} from "@astryxdesign/core/HStack";
import {Stack} from "@astryxdesign/core/Stack";
import {AuthForm} from "@/components/auth-form";
import {AuthSplitLayout} from "@/components/auth-split-layout";
import {LocaleSwitcher} from "@/components/locale-switcher";
import {ThemeSwitcher} from "@/components/theme-switcher";

/**
 * Shared frame for the sign-in and sign-up pages. It contains no request data
 * so the route can ship a useful static shell while `searchParams` resolves.
 */
export function AuthPage({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up";
  next?: string | undefined;
}) {
  return (
    <AuthSplitLayout>
      <Stack gap={4} width="100%" maxWidth={440}>
        <HStack gap={4} align="center" justify="end" wrap="wrap">
          <ThemeSwitcher />
          <LocaleSwitcher />
        </HStack>
        <AuthForm mode={mode} next={next} />
      </Stack>
    </AuthSplitLayout>
  );
}
