import type {Metadata} from "next";
import {Suspense} from "react";
import {getTranslations} from "next-intl/server";
import {AuthPage} from "@/components/auth-page";
import {safeNextPath} from "@/lib/navigation";

type SignUpPageProps = {
  searchParams: Promise<{next?: string | string[]}>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signUp");

  return {title: t("metadataTitle")};
}

export default function SignUpPage({searchParams}: SignUpPageProps) {
  return (
    <Suspense fallback={<AuthPage mode="sign-up" />}>
      <SignUpForm searchParams={searchParams} />
    </Suspense>
  );
}

async function SignUpForm({searchParams}: SignUpPageProps) {
  const {next} = await searchParams;

  return <AuthPage mode="sign-up" next={safeNextPath(next)} />;
}
