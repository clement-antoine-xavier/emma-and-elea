import {AppShell} from '@astryxdesign/core/AppShell';
import {Hero} from '@/components/landing/hero';
import {
  BenefitsSection,
  FinalCtaSection,
  ProductSection,
  RealitySection,
  SiteFooter,
} from '@/components/landing/sections';
import {SiteHeader} from '@/components/landing/site-header';

export default function Home() {
  return (
    <>
      <AppShell
        height="auto"
        variant="surface"
        contentPadding={0}
        mobileNav={{breakpoint: 'xl'}}
        topNav={<SiteHeader />}>
        <Hero />
        <RealitySection />
        <ProductSection />
        <BenefitsSection />
        <FinalCtaSection />
      </AppShell>
      <SiteFooter />
    </>
  );
}
