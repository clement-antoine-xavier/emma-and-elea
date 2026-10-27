import {AppShell} from '@astryxdesign/core/AppShell';
import {Faq} from '@/components/landing/faq';
import {Features} from '@/components/landing/features';
import {FinalCta} from '@/components/landing/final-cta';
import {Hero} from '@/components/landing/hero';
import {HowItWorks} from '@/components/landing/how-it-works';
import {Pricing} from '@/components/landing/pricing';
import {ProblemSolution} from '@/components/landing/problem-solution';
import {SiteFooter} from '@/components/landing/site-footer';
import {SiteHeader} from '@/components/landing/site-header';
import {TrustBar} from '@/components/landing/trust-bar';

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
        <TrustBar />
        <ProblemSolution />
        <Features />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </AppShell>
      <SiteFooter />
    </>
  );
}
