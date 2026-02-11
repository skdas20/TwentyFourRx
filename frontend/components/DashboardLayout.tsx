"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import ProfileCompletionBanner from "./ProfileCompletionBanner";

interface DashboardLayoutProps {
  children: React.ReactNode;
  user: any;
  title: string;
  navLinks?: { href: string; label: string }[];
}

export default function DashboardLayout({ children, user, title, navLinks = [] }: DashboardLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-2xl font-bold font-space">
              <span className="text-[var(--brand-blue)]">24</span>
              <span className="text-[var(--ink)]">Rx</span>
            </Link>
            <span className="text-[var(--muted)]/40">|</span>
            <span className="text-[var(--ink)] font-medium">{title}</span>
          </div>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition-colors text-sm font-medium"
              >
                {link.label}
              </Link>
            ))}
            <NotificationCenter />

            {/* User Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-[var(--border)]/10">
              <div className="flex flex-col">
                <p className="text-sm font-medium text-[var(--ink)] leading-none mb-1">{user?.name || "User"}</p>
                <p className="text-[10px] text-[var(--brand-blue)] font-bold uppercase tracking-wider">{user?.roleCode || "Guest"}</p>
              </div>

              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("user");
                  router.push("/auth/login");
                }}
                className="p-2 hover:bg-[var(--surface)]/50 rounded-lg transition-colors text-[var(--muted)] hover:text-[var(--ink)] ml-2"
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
        <ProfileCompletionBanner user={user} />
        {children}
      </main>
    </div>
  );
}