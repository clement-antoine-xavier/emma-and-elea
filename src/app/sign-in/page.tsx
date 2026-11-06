import type {Metadata} from "next";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {AuthPage} from "@/components/auth-page";
import {safeNextPath} from "@/lib/navigation";

type SignInPageProps = {
  searchParams: Promise<{next?: string | string[]}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signIn");

  return {title: t("metadataTitle")};
}

export default function SignInPage({searchParams}: SignInPageProps) {
  return (
    <Suspense fallback={<AuthPage mode="sign-in" />}>
      <SignInForm searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInForm({searchParams}: SignInPageProps) {
  const {next} = await searchParams;

  return <AuthPage mode="sign-in" next={safeNextPath(next)} />;
}
