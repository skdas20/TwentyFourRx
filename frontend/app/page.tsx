import NavbarNew from '@/components/landing/NavbarNew';
import HeroNew from '@/components/landing/HeroNew';
import Features from '@/components/landing/Features';
import TrendingMedicines from '@/components/landing/TrendingMedicines';
import HowItWorks from '@/components/landing/HowItWorks';
import Team from '@/components/landing/Team';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="min-h-screen">
      <NavbarNew />
      <HeroNew />
      <Features />
      <TrendingMedicines />
      <HowItWorks />
      <Team />
      <CTA />
      <Footer />
    </main>
  );
}