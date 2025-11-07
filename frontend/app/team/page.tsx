"use client";

import Link from "next/link";
import { ArrowLeft, Linkedin, Twitter, Mail } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Sumit Kumar Das",
    role: "Founder & CEO",
    bio: "Visionary leader driving the transformation of pharmaceutical trading in India with innovative technology solutions.",
    image: null, // placeholder for avatar
    linkedin: "#",
    twitter: "#",
    email: "sumit@24rx.com"
  },
  {
    name: "Aninda Shankar Sukla",
    role: "Co-Founder & CTO",
    bio: "Technology architect with deep expertise in building scalable platforms for healthcare and pharmaceutical industries.",
    image: null,
    linkedin: "#",
    twitter: "#",
    email: "aninda@24rx.com"
  },
  {
    name: "Sombit",
    role: "Lead Developer",
    bio: "Full-stack developer specializing in modern web technologies and secure pharmaceutical trading systems.",
    image: null,
    linkedin: "#",
    twitter: "#",
    email: "sombit@24rx.com"
  },
  {
    name: "Saurabh",
    role: "Head of Operations",
    bio: "Operations expert ensuring smooth platform functionality and efficient pharmaceutical supply chain management.",
    image: null,
    linkedin: "#",
    twitter: "#",
    email: "saurabh@24rx.com"
  },
];

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-hi)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Meet Our Team</h1>
            <p className="text-xl text-white/90 max-w-3xl mx-auto">
              The passionate professionals revolutionizing pharmaceutical trading in India
            </p>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member, index) => (
            <div key={index} className="bg-[var(--surface)] rounded-2xl p-6 border border-[var(--border)] hover:shadow-lg transition-shadow">
              <div className="text-center">
                {/* Avatar */}
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-hi)] 
                              flex items-center justify-center text-white text-2xl font-bold">
                  {member.name.charAt(0)}
                </div>
                
                <h3 className="text-xl font-semibold text-[var(--ink)] mb-1">{member.name}</h3>
                <p className="text-[var(--brand-blue)] font-medium mb-4">{member.role}</p>
                <p className="text-[var(--muted)] text-sm leading-relaxed mb-6">{member.bio}</p>
                
                {/* Social Links */}
                <div className="flex justify-center space-x-4">
                  <a href={member.linkedin} className="text-[var(--muted)] hover:text-[var(--brand-blue)] transition-colors">
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a href={member.twitter} className="text-[var(--muted)] hover:text-[var(--brand-blue)] transition-colors">
                    <Twitter className="w-5 h-5" />
                  </a>
                  <a href={`mailto:${member.email}`} className="text-[var(--muted)] hover:text-[var(--brand-blue)] transition-colors">
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-[var(--surface)] border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-[var(--ink)] mb-4">Join Our Mission</h2>
          <p className="text-[var(--muted)] text-lg mb-8 max-w-2xl mx-auto">
            We're always looking for talented individuals who share our vision of transforming pharmaceutical trading.
          </p>
          <Link 
            href="/auth/register"
            className="inline-flex items-center px-8 py-3 bg-[var(--brand-blue)] text-white rounded-lg hover:bg-[var(--brand-blue-hi)] transition-colors font-semibold"
          >
            Start Trading Today
          </Link>
        </div>
      </div>
    </div>
  );
}