"use client";
import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";

export default function Team() {
  return (
    <section id="team" className="py-24 bg-[var(--surface)]">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-[var(--ink)] mb-4">
            Meet Our Team
          </h2>
          <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto mb-12">
            The passionate professionals revolutionizing pharmaceutical trading in India
          </p>

          {/* Team Icon */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-hi)] 
                          rounded-full flex items-center justify-center mb-6">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-[var(--muted)] text-lg">
              Our dedicated team of experts brings together years of experience in pharmaceutical trading, 
              technology, and healthcare to build India's most trusted medicine exchange platform.
            </p>
          </div>

          {/* Meet Full Team Button */}
          <Link 
            href="/team"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--brand-blue)] text-white rounded-lg 
                     hover:bg-[var(--brand-blue-hi)] transition-colors font-semibold text-lg"
          >
            Meet Our Entire Team
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
