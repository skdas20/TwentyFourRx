"use client";

import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg)] via-white/5 to-[var(--bg)] dark:via-gray-800/5">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10 dark:from-[var(--brand-blue)]/20 dark:to-[var(--brand-blue-hi)]/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-blue)]/5 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] mb-8 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10 rounded-2xl">
              <FileText className="w-10 h-10 text-[var(--brand-blue)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-hi)] bg-clip-text text-transparent">
                Terms and Conditions
              </h1>
              <p className="text-[var(--muted)] mt-2">Effective Date: December 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-8 md:p-12">

          {/* Acceptance of Terms */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">1. Acceptance of Terms</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              Welcome to 24Rx Exchange. By accessing or using the digital marketplace, website, or
              services (the "Platform"), you ("User," "Trader," "Seller," or "Manufacturer") agree to be
              bound by these Terms and Conditions ("T&C" or "Agreement"). If you do not agree to these
              T&C, you must not use the Platform.
            </p>
          </section>

          {/* User Eligibility and Verification */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">2. User Eligibility and Verification</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">A. Eligibility</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  The Platform is exclusively for licensed wholesalers, traders, and manufacturers
                  operating in the pharmaceutical industry. Users must be legally competent to enter into
                  contracts and possess all necessary, valid, and current drug licenses and regulatory
                  approvals.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">B. Mandatory Verification</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  All Users must successfully complete the 24Rx verification process, which includes submitting current Drug Licenses, tax documents (GST/TIN), and
                  other required proofs. 24Rx reserves the right to suspend or terminate any account if the
                  submitted documentation is deemed invalid, expired, or fraudulent.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">C. Representation</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  By registering, you warrant that all information provided is true, accurate,
                  and that you are authorized to bind the registered business entity to these T&C.
                </p>
              </div>
            </div>
          </section>

          {/* Marketplace Operations and Transactions */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">3. Marketplace Operations and Transactions</h2>

            <div className="space-y-6">
              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  A. Listings and Pricing (For Sellers & Manufacturers)
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Accuracy of Listings:</strong> Sellers/Manufacturers must ensure that all listed stock
                    (Medicine names, batch numbers, quantities, expiry dates) is accurately represented
                    and physically available.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Mandatory Proof:</strong> Sellers must upload valid Purchase/Batch Bills and Physical Stock
                    Photos to prove availability and authenticity before a listing becomes active and
                    tradable.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Price Compliance:</strong> Sellers must quote prices in the 24Rx standardized format and
                    adhere strictly to all permitted minimum rate guidelines set by applicable
                    pharmaceutical regulations. 24Rx may delist non-compliant prices without notice.</span>
                  </li>
                </ul>
              </div>

              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  B. Buying and Selling
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Binding Orders:</strong> A transaction is legally binding once a buyer places an order and the
                    seller confirms the availability and price through the Platform.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Minimum-Risk Trading:</strong> 24Rx facilitates the transaction through a secure process
                    (e.g., escrow-like service) to ensure the seller ships upon payment confirmation and
                    the buyer receives the verified product.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Documentation:</strong> The Platform mandates that all transactions must be supported by
                    proper, auditable documentation, including invoices generated compliant with tax and
                    drug laws.</span>
                  </li>
                </ul>
              </div>

              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  C. Logistics and Delivery
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Logistics Partner:</strong> Physical delivery is managed through 24Rx's streamlined logistics
                    partner network.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Holding Option:</strong> Users may elect to Hold purchased stock in their designated 24Rx
                    inventory. Terms for holding, liability, and fees will be specified separately.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Seller Responsibilities:</strong> Sellers must pack orders using official 24Rx labelling and
                    have the stock ready for pickup by the designated logistics partner upon notification.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* User Obligations and Conduct */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">4. User Obligations and Conduct</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">A. Compliance</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Users must strictly comply with all applicable central, state, and local laws,
                  rules, and regulations governing the sale, purchase, storage, and distribution of
                  pharmaceutical products.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">B. Prohibited Activities</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Users shall not use the Platform for any unlawful purpose, including
                  the sale of counterfeit, misbranded, or prohibited drugs, price manipulation, or fraudulent
                  transactions.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">C. Account Security</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  Users are responsible for maintaining the confidentiality of their account
                  credentials and for all activities that occur under their account.
                </p>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">5. Intellectual Property</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              All content on the Platform, including text, graphics, logos, and the 24Rx name/trademark, is
              the exclusive property of 24Rx Exchange or its licensors. Users are granted a limited,
              non-exclusive, revocable license to use the Platform solely for their wholesale
              pharmaceutical trading activities.
            </p>
          </section>

          {/* Disclaimer of Warranties and Limitation of Liability */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">6. Disclaimer of Warranties and Limitation of Liability</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">A. No Endorsement</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  24Rx Exchange is a marketplace and does not manufacture, sell, or
                  distribute the medicines listed. We do not endorse, warrant, or guarantee the quality, safety,
                  or legality of the products listed by Sellers/Manufacturers.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--ink)] dark:text-white mb-2">B. Limitation of Liability</h3>
                <p className="text-[var(--muted)] leading-relaxed">
                  To the maximum extent permitted by law, 24Rx Exchange shall not
                  be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss
                  of profits or revenues, whether incurred directly or indirectly, arising from your use of the
                  Platform or products purchased/sold thereon. 24Rx's liability is limited to the fees paid by the
                  User for the specific transaction giving rise to the claim.
                </p>
              </div>
            </div>
          </section>

          {/* Indemnification */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">7. Indemnification</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              You agree to indemnify, defend, and hold harmless 24Rx Exchange, its affiliates, directors,
              and employees, from and against all losses, expenses, damages, and costs (including
              reasonable attorneys' fees) arising out of or related to your breach of these T&C, your
              non-compliance with pharmaceutical regulations, or your transactions conducted on the
              Platform.
            </p>
          </section>

          {/* Governing Law and Dispute Resolution */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">8. Governing Law and Dispute Resolution</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              These T&C shall be governed by the laws of India. Any disputes arising out of or in
              connection with these T&C shall be subject to the exclusive jurisdiction of the courts located
              in Ranchi, Jharkhand.
            </p>
          </section>

          {/* Changes to Terms and Conditions */}
          <section className="mb-0">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">9. Changes to Terms and Conditions</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              24Rx reserves the right to modify these T&C at any time. We will notify Users of material
              changes via email or a prominent notice on the Platform. Continued use of the Platform after
              such changes constitutes acceptance of the new T&C.
            </p>
          </section>

        </div>

        {/* Contact Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10 rounded-xl border border-[var(--brand-blue)]/20">
          <p className="text-[var(--muted)] text-center">
            Questions about our Terms and Conditions? Contact us at{" "}
            <a href="mailto:support@24rx.com" className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-semibold">
              support@24rx.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
