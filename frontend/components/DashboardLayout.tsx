"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: any;
  title: string;
  navLinks?: { href: string; label: string }[];
}

export default function DashboardLayout({ children, user, title, navLinks = [] }: DashboardLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-orbital-white">
      {/* Header */}
      <header className="border-b border-slate/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold font-space">
              <span className="text-gold">24</span>
              <span className="text-deep-navy">Rx</span>
            </Link>
            <span className="text-slate/40">|</span>
            <span className="text-deep-navy font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate hover:text-deep-navy transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pl-6 border-l border-slate/10">
              <div>
                <p className="text-sm font-medium text-deep-navy">{user.name}</p>
                <p className="text-xs text-gold">{user.role}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("user");
                  router.push("/auth/login");
                }}
                className="p-2 hover:bg-cloud-gray rounded-lg transition-colors text-slate hover:text-deep-navy"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
