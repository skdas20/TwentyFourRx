"use client";

import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <Shield className="w-10 h-10 text-[var(--brand-blue)]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-hi)] bg-clip-text text-transparent">
                Privacy Policy
              </h1>
              <p className="text-[var(--muted)] mt-2">Effective Date: December 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-8 md:p-12">

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">1. Introduction</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              24Rx Exchange ("we," "us," or "our") is a digital marketplace designed exclusively for
              licensed wholesalers, traders, and manufacturers in the pharmaceutical industry.
              This Privacy Policy describes how we collect, use, process, and disclose information
              from users ("Users" or "you") who access or use our platform, including our website
              and services (collectively, the "Platform"). We are committed to protecting the privacy
              and security of the professional information you share with us.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">2. Information We Collect</h2>
            <p className="text-[var(--muted)] leading-relaxed mb-6">
              We primarily collect professional, corporate, and transactional information necessary
              to facilitate secure and compliant B2B pharmaceutical trade.
            </p>

            <div className="space-y-6">
              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  A. Information Provided by Users (Registration & Verification)
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Identity & Contact Data:</strong> Company Name, Business Address, Contact
                    Person's Name, Email Address, Phone Number, and GST/Tax Identification Numbers.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Licensing & Compliance Data:</strong> Drug License Numbers, valid copies of Drug
                    Licenses, Manufacturer's Authorization Certificates, and other statutory
                    compliance documents required for pharmaceutical trading.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Account Credentials:</strong> Encrypted passwords and login information.</span>
                  </li>
                </ul>
              </div>

              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  B. Information for Transaction Facilitation (Sellers & Manufacturers)
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Product Listing Data:</strong> Medicine names, strengths, pack sizes, stock quantities,
                    list prices, and standardized quote prices.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Verification Data:</strong> Uploaded Purchase/Batch Bills, physical stock photos, and
                    other proof of availability documentation.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Financial Data:</strong> Bank account details required for processing payments and
                    settlements (strictly for transactional purposes).</span>
                  </li>
                </ul>
              </div>

              <div className="pl-4 border-l-4 border-[var(--brand-blue)]/30">
                <h3 className="text-xl font-semibold text-[var(--ink)] dark:text-white mb-3">
                  C. Information Collected Automatically (Usage Data)
                </h3>
                <ul className="space-y-2 text-[var(--muted)] leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Transaction Records:</strong> Detailed records of all buy/sell orders, order status,
                    logistics tracking, pricing history, and order management activities.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Market Activity Data:</strong> Watchlist data, real-time rate viewing activity, search
                    history, and market trends analysis based on your usage.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-blue)] mt-1">•</span>
                    <span><strong className="text-[var(--ink)] dark:text-white">Technical Data:</strong> IP address, browser type, device type, operating system,
                    access times, and pages viewed.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-[var(--muted)] leading-relaxed mb-6">
              We use the collected information primarily to operate, maintain, and improve the
              24Rx Exchange Platform and ensure regulatory compliance.
            </p>
            <ul className="space-y-3 text-[var(--muted)] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Platform Operation & Service Delivery:</strong> To register your account, verify your
                business licenses, process and fulfill transactions (buy/sell), manage logistics
                (holding/delivery), and provide customer support.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Compliance & Security:</strong> To verify the identity and legitimacy of all Users (as
                100% verified buyers and sellers is a core promise), enforce minimum rate
                guidelines, validate stock availability (using proof documents), prevent
                fraudulent activities, and comply with legal or regulatory obligations.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Communication:</strong> To send transaction notifications, delivery updates, system
                alerts, and compliance reminders.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Market Insights:</strong> To provide Users with real-time market data, facilitate price
                tracking (watchlist), and develop aggregated, anonymized market intelligence
                reports.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Platform Improvement:</strong> To analyze usage patterns, troubleshoot issues, and
                enhance the features and functionality of the Platform.</span>
              </li>
            </ul>
          </section>

          {/* Disclosure of Information */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">4. Disclosure of Information</h2>
            <p className="text-[var(--muted)] leading-relaxed mb-6">
              We only share information with third parties in the following limited and necessary circumstances:
            </p>
            <ul className="space-y-3 text-[var(--muted)] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Between Verified Users:</strong> To facilitate a specific transaction, we share
                necessary details (e.g., Company Name, Order ID, Product Details) between
                the verified buyer and the verified seller.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Logistics Partners:</strong> We share necessary delivery/pickup information (e.g.,
                address, contact person, order details) with our streamlined logistics partners
                to fulfill physical delivery requests.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Service Providers:</strong> We engage third-party companies (e.g., payment
                processors, hosting providers) who assist us in operating the Platform. These
                providers are contractually obligated to protect the information.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Legal & Regulatory Compliance:</strong> If required by law, regulatory body, or court
                order, we will disclose information as mandated.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span><strong className="text-[var(--ink)] dark:text-white">Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets,
                User information may be transferred as part of the transaction, subject to the
                new entity adhering to this policy.</span>
              </li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">5. Data Security</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              We implement robust technical and organizational measures to protect your
              professional data from unauthorized access, disclosure, alteration, or destruction.
              This includes data encryption, secure server hosting, multi-factor authentication for
              sensitive accounts, and strict access control procedures.
            </p>
          </section>

          {/* Data Retention */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">6. Data Retention</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              We retain your information for as long as your account is active and for a legally
              mandated period thereafter to comply with regulatory requirements (e.g.,
              pharmaceutical transaction record-keeping, financial reporting, license
              documentation).
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">7. Your Rights</h2>
            <p className="text-[var(--muted)] leading-relaxed mb-4">As a User, you have the right to:</p>
            <ul className="space-y-3 text-[var(--muted)] leading-relaxed">
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span>Access and review the data we hold about your company.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span>Request correction of inaccurate or incomplete data.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--brand-blue)] mt-1">•</span>
                <span>Request deletion of your account data, subject to our compliance and legal
                obligations to retain transaction and verification records.</span>
              </li>
            </ul>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="mb-0">
            <h2 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-4">8. Changes to this Privacy Policy</h2>
            <p className="text-[var(--muted)] leading-relaxed">
              We may update this policy periodically to reflect changes in our practices or legal
              requirements. We will notify registered Users of any material changes via email or
              prominent notice on the Platform.
            </p>
          </section>

        </div>

        {/* Contact Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10 rounded-xl border border-[var(--brand-blue)]/20">
          <p className="text-[var(--muted)] text-center">
            Questions about our Privacy Policy? Contact us at{" "}
            <a href="mailto:support@24rx.com" className="text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] font-semibold">
              support@24rx.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
