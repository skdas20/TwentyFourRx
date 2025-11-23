"use client";

import Link from "next/link";
import { ArrowLeft, Linkedin, Twitter, Mail } from "lucide-react";

const TEAM_MEMBERS = [
  {
    name: "Saurav Kumar",
    role: "Founder",
    bio: "Visionary founder driving the transformation of pharmaceutical trading in India with innovative technology solutions.",
    image: "/assets/saurav.jpeg",
    linkedin: "https://www.linkedin.com/in/saurabh-kumar-32427a245/",
    twitter: "#",
    email: "saurav@24rx.com"
  },
  {
    name: "Aninda Shankar Shukla",
    role: "CEO",
    bio: "Strategic leader with deep expertise in building scalable platforms for healthcare and pharmaceutical industries.",
    image: "/assets/aninda.jpeg",
    linkedin: "https://www.linkedin.com/in/aninda-sankar-sukla-67914271",
    twitter: "#",
    email: "aninda@24rx.com"
  },
  {
    name: "Summit Kumar Das",
    role: "Technical Lead",
    bio: "Technology architect specializing in modern web technologies and secure pharmaceutical trading systems.",
    image: "/assets/sumit.jpeg",
    linkedin: "https://www.linkedin.com/in/sumitkumardas-ai/",
    twitter: "#",
    email: "summit@24rx.com"
  },
  {
    name: "Sombit Biswas",
    role: "Developer Assistant",
    bio: "Full-stack developer supporting the development of cutting-edge features for the 24Rx platform.",
    image: "/assets/sombit.jpeg",
    linkedin: "https://www.linkedin.com/in/sombit-biswas-7b8a90184",
    twitter: "#",
    email: "sombit@24rx.com"
  },
];

export default function TeamPage() {
  const handleSocialClick = (url: string) => {
    if (url && url !== "#") {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg)] via-white/5 to-[var(--bg)] dark:via-gray-800/5">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10 dark:from-[var(--brand-blue)]/20 dark:to-[var(--brand-blue-hi)]/20" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--brand-blue)]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <Link href="/" className="inline-flex items-center gap-2 text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] mb-8 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-hi)] bg-clip-text text-transparent">
              Meet Our Team
            </h1>
            <p className="text-xl text-[var(--muted)] max-w-3xl mx-auto leading-relaxed">
              The passionate professionals revolutionizing pharmaceutical trading in India with cutting-edge technology and industry expertise.
            </p>
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM_MEMBERS.map((member, index) => (
            <div 
              key={index} 
              className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 
                         hover:shadow-2xl hover:border-[var(--brand-blue)]/50 transition-all duration-300 overflow-hidden h-full flex flex-col"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-blue)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative text-center p-8 flex flex-col h-full">
                {/* Avatar */}
                <div className="flex-shrink-0 mb-6">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name}
                      loading="lazy"
                      className="w-28 h-28 mx-auto rounded-full object-cover shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform duration-300 border-4 border-white dark:border-gray-700"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-[var(--brand-blue)] to-[var(--brand-blue-hi)] 
                                flex items-center justify-center text-white text-4xl font-bold shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-transform duration-300 ${member.image ? 'hidden' : ''}`}>
                    {member.name.charAt(0)}
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-[var(--ink)] dark:text-white mb-2">{member.name}</h3>
                <p className="text-[var(--brand-blue)] font-semibold mb-4 text-sm uppercase tracking-wide">{member.role}</p>
                <p className="text-[var(--muted)] text-sm leading-relaxed mb-6 flex-grow">{member.bio}</p>
                
                {/* Social Links - Fixed at bottom */}
                <div className="flex-shrink-0 flex justify-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
                  <button
                    onClick={() => handleSocialClick(member.linkedin)}
                    className={`p-2.5 rounded-lg transition-all duration-300 ${
                      member.linkedin && member.linkedin !== "#"
                        ? "bg-gray-100 dark:bg-gray-700 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white hover:scale-110 cursor-pointer"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
                    }`}
                    title="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleSocialClick(member.twitter)}
                    className={`p-2.5 rounded-lg transition-all duration-300 ${
                      member.twitter && member.twitter !== "#"
                        ? "bg-gray-100 dark:bg-gray-700 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white hover:scale-110 cursor-pointer"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
                    }`}
                    title="Twitter"
                  >
                    <Twitter className="w-5 h-5" />
                  </button>
                  <a
                    href={`mailto:${member.email}`}
                    className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-[var(--brand-blue)] hover:bg-[var(--brand-blue)] hover:text-white transition-all duration-300 hover:scale-110"
                    title="Email"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative mt-20 mb-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-blue)]/10 to-[var(--brand-blue-hi)]/10" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-4xl font-bold text-[var(--ink)] dark:text-white mb-4">Join Our Mission</h2>
          <p className="text-[var(--muted)] text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            We're always looking for talented individuals who share our vision of transforming pharmaceutical trading in India.
          </p>
          <Link 
            href="/auth/register"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-hi)] text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-lg"
          >
            Start Trading Today
          </Link>
        </div>
      </div>
    </div>
  );
}