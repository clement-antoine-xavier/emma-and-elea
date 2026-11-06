import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {AuthPage} from "@/components/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signIn");

  return {title: t("metadataTitle")};
}

export default function SignInPage() {
  return <AuthPage mode="sign-in" />;
}
