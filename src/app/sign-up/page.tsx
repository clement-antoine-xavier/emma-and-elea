import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import {AuthPage} from "@/components/auth-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signUp");

  return {title: t("metadataTitle")};
}

export default function SignUpPage() {
  return <AuthPage mode="sign-up" />;
}
