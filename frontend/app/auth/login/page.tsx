"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
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
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold mb-2">
              <span className="text-[var(--ink)]">24R</span>
              <span className="text-[var(--brand-blue)]">x</span>
            </h1>
          </Link>
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
            <div className="text-sm"><a href="#" className="font-medium text-[var(--brand-blue)] hover:text-[var(--brand-blue-hi)] transition">Forgot password?</a></div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--brand-blue)] py-3 px-4 text-base font-semibold text-white hover:bg-[var(--brand-blue-hi)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] disabled:opacity-50 transition shadow-lg shadow-[var(--brand-blue)]/25"
          >
            {loading ? 'Signing in...' : 'Sign in'}
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
