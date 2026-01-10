"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authApi.login(formData);
      const { accessToken, refreshToken, user } = response.data;

      // Store auth tokens and user data
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      
      // Redirect based on role
      if (user.roleCode === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (user.roleCode === "SELLER" || user.roleCode === "TRADER") {
        router.push("/dashboard/seller"); // Same dashboard for both
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Login failed. Please check your credentials.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] py-12 px-4">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 rounded-full bg-[var(--brand-blue)]/5" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 rounded-full bg-[var(--brand-blue)]/5" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="lg" href="/" isLoggedIn={false} />
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-[var(--ink)]">Sign in to your account</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Or <Link href="/auth/register" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] transition">register for a new account</Link>
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--ink)] mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  className="block w-full rounded-lg border border-[var(--border)] py-3 pl-11 pr-4 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition" 
                  placeholder="Enter your email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--ink)] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  className="block w-full rounded-lg border border-[var(--border)] py-3 pl-11 pr-4 text-[var(--ink)] bg-[var(--surface)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] focus:border-transparent transition" 
                  placeholder="Enter your password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-blue)] focus:ring-[var(--brand-blue)]" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--muted)]">Remember me</label>
            </div>
            <div className="text-sm">
              <Link href="/auth/forgot-password" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] transition">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-base font-semibold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative">{loading ? 'Signing in...' : 'Sign in →'}</span>
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted)]">
          <ShieldCheck className="w-4 h-4" />
          <p>Protected by 24Rx Exchange security. Your data is encrypted.</p>
        </div>
      </div>
    </div>
  );
}
