import Link from 'next/link';

export default function CTA() {
  return (
    <section className="py-16 md:py-24 bg-cloud-gray">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-space font-bold text-deep-navy tracking-tight">
            Ready to trade smarter?
          </h2>
          <p className="text-xl text-slate font-inter max-w-2xl mx-auto">
            Start with 24Rx.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-10 py-4 bg-gold-gradient text-deep-navy text-lg font-inter font-semibold rounded-button hover:opacity-90 transition-all duration-200 shadow-light"
            >
              Start Trading
            </Link>
            <Link
              href="/auth/register"
              className="text-slate hover:text-deep-navy font-inter font-medium transition-colors underline underline-offset-4"
            >
              Create account →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
