"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";

const DEMO_USERS = {
  "admin@24rx.com": { password: "demo123", role: "ADMIN", name: "Admin User" },
  "demo@seller.com": { password: "demo123", role: "SELLER", name: "Seller Demo" },
  "demo@trader.com": { password: "demo123", role: "TRADER", name: "Trader Demo" },
};

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const user = DEMO_USERS[formData.email as keyof typeof DEMO_USERS];
      
      if (!user || user.password !== formData.password) {
        throw new Error("Invalid email or password");
      }

      localStorage.setItem("user", JSON.stringify({
        email: formData.email,
        name: user.name,
        role: user.role
      }));
      
      if (user.role === "ADMIN") {
        router.push("/dashboard/admin");
      } else if (user.role === "SELLER") {
        router.push("/dashboard/seller");
      } else if (user.role === "TRADER") {
        router.push("/dashboard/trader");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-orbital-white py-12 px-4">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -right-1/4 w-96 h-96 rounded-full bg-deep-navy/5" />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 rounded-full bg-gold/5" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-5xl font-bold mb-2 font-space">
              <span className="text-gold">24</span>
              <span className="text-deep-navy">Rx</span>
            </h1>
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-deep-navy font-space">Sign in to your account</h2>
          <p className="mt-2 text-sm text-slate">
            Or <Link href="/auth/register" className="font-medium text-gold hover:text-gold-dark transition">register for a new account</Link>
          </p>
        </div>

        <div className="bg-cloud-gray/50 border border-gold/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound className="w-4 h-4 text-gold" />
            <p className="text-sm font-semibold text-deep-navy">Demo Credentials</p>
          </div>
          <div className="space-y-2 text-sm text-slate">
            <div className="flex justify-between"><span>Admin:</span><span className="font-mono text-deep-navy">admin@24rx.com / demo123</span></div>
            <div className="flex justify-between"><span>Seller:</span><span className="font-mono text-deep-navy">demo@seller.com / demo123</span></div>
            <div className="flex justify-between"><span>Trader:</span><span className="font-mono text-deep-navy">demo@trader.com / demo123</span></div>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-deep-navy mb-2">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate" />
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  autoComplete="email" 
                  required 
                  className="block w-full rounded-input border border-slate/20 py-3 pl-11 pr-4 text-deep-navy bg-white placeholder:text-slate/50 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" 
                  placeholder="Enter your email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-deep-navy mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate" />
                <input 
                  id="password" 
                  name="password" 
                  type="password" 
                  autoComplete="current-password" 
                  required 
                  className="block w-full rounded-input border border-slate/20 py-3 pl-11 pr-4 text-deep-navy bg-white placeholder:text-slate/50 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent transition" 
                  placeholder="Enter your password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-slate/30 text-gold focus:ring-gold" />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate">Remember me</label>
            </div>
            <div className="text-sm"><a href="#" className="font-medium text-gold hover:text-gold-dark transition">Forgot password?</a></div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex items-center justify-center gap-2 rounded-button bg-gold-gradient py-3 px-4 text-base font-semibold text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50 transition shadow-light"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center justify-center gap-2 text-xs text-slate">
          <ShieldCheck className="w-4 h-4" />
          <p>Protected by 24Rx security. Your data is encrypted.</p>
        </div>
      </div>
    </div>
  );
}
