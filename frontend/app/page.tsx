import NavbarNew from '@/components/landing/NavbarNew';
import HeroNew from '@/components/landing/HeroNew';
import Features from '@/components/landing/Features';
import Team from '@/components/landing/Team';
import AnalyticsPreview from '@/components/landing/AnalyticsPreview';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavbarNew />
      <HeroNew />
      <Features />
      <AnalyticsPreview />
      <Team />
      <CTA />
      <Footer />
    </main>
  );
}
