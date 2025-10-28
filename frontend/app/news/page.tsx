"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Newspaper, Tag, Eye, FileText, AlertCircle, CheckCircle, Shield, Bell, Plus } from "lucide-react";

// Demo news articles
const NEWS_ARTICLES = [
  {
    id: 1,
    title: "New Import Regulations for Generic Medicines",
    excerpt: "The Ministry of Health has announced revised import regulations for generic medicines, effective from November 2025. The new guidelines aim to streamline the approval process while maintaining quality standards.",
    content: "Full article content here...",
    publishedAt: "2025-10-28",
    publishedBy: "Admin User",
    category: "Regulatory",
    medicines: ["Paracetamol 500mg", "Amoxicillin 250mg", "Ibuprofen 400mg"],
    views: 1247,
  },
  {
    id: 2,
    title: "Price Cap on Essential Drugs Extended",
    excerpt: "Government extends price cap on 50 essential medicines until March 2026. This decision comes after consultation with pharmaceutical manufacturers and healthcare providers.",
    content: "Full article content here...",
    publishedAt: "2025-10-27",
    publishedBy: "Admin User",
    category: "Policy",
    medicines: ["Metformin 500mg", "Atorvastatin 10mg", "Amlodipine 5mg", "Losartan 50mg", "Omeprazole 20mg"],
    views: 2156,
  },
  {
    id: 3,
    title: "FDA Approves 12 New Generic Formulations",
    excerpt: "The FDA has granted approval to 12 new generic formulations, providing more affordable alternatives for patients. The approvals include cardiovascular and diabetes medications.",
    content: "Full article content here...",
    publishedAt: "2025-10-25",
    publishedBy: "Admin User",
    category: "Approvals",
    medicines: [
      "Rosuvastatin 10mg", "Pantoprazole 40mg", "Losartan 50mg", "Amlodipine 5mg",
      "Metformin 500mg", "Atorvastatin 10mg", "Cetirizine 10mg", "Azithromycin 500mg",
      "Omeprazole 20mg", "Paracetamol 500mg", "Amoxicillin 250mg", "Ibuprofen 400mg"
    ],
    views: 3421,
  },
  {
    id: 4,
    title: "Quality Compliance Updates for Q4 2025",
    excerpt: "Updated quality compliance requirements for pharmaceutical distributors and traders. All registered entities must complete the new certification by December 31, 2025.",
    content: "Full article content here...",
    publishedAt: "2025-10-24",
    publishedBy: "Admin User",
    category: "Compliance",
    medicines: ["Paracetamol 500mg", "Cetirizine 10mg"],
    views: 987,
  },
  {
    id: 5,
    title: "Supply Chain Disruptions in North India",
    excerpt: "Severe weather conditions in North India have caused temporary supply chain disruptions. Authorities are working to restore normal operations within 72 hours.",
    content: "Full article content here...",
    publishedAt: "2025-10-23",
    publishedBy: "Admin User",
    category: "Alert",
    medicines: [],
    views: 1876,
  },
  {
    id: 6,
    title: "Digital KYC Process Now Mandatory",
    excerpt: "Starting November 1, 2025, all new seller and trader registrations must complete digital KYC verification. Existing users have until January 2026 to update their documents.",
    content: "Full article content here...",
    publishedAt: "2025-10-22",
    publishedBy: "Admin User",
    category: "Platform",
    medicines: [],
    views: 2543,
  },
];

export default function NewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const filteredNews = selectedCategory === "ALL" 
    ? NEWS_ARTICLES 
    : NEWS_ARTICLES.filter(article => article.category === selectedCategory);

  const categories = ["ALL", ...Array.from(new Set(NEWS_ARTICLES.map(a => a.category)))];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Regulatory": return <Shield className="w-4 h-4" />;
      case "Policy": return <FileText className="w-4 h-4" />;
      case "Approvals": return <CheckCircle className="w-4 h-4" />;
      case "Compliance": return <AlertCircle className="w-4 h-4" />;
      case "Alert": return <Bell className="w-4 h-4" />;
      case "Platform": return <Newspaper className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-orbital-white">
      {/* Header */}
      <header className="border-b border-slate/10 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-[#D4AF37] font-space">24Rx</Link>
            <span className="text-slate/40">|</span>
            <span className="text-deep-navy font-semibold">Industry News</span>
          </div>
          <div className="flex items-center gap-6">
            {user && (
              <>
                <Link 
                  href={`/dashboard/${user.role.toLowerCase()}`} 
                  className="text-deep-navy hover:text-[#D4AF37] transition-colors font-semibold"
                >
                  Dashboard
                </Link>
                <Link href="/medicines" className="text-deep-navy hover:text-[#D4AF37] transition-colors font-semibold">
                  Medicines
                </Link>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-deep-navy font-semibold">{user.name}</p>
                    <p className="text-xs text-[#D4AF37]">{user.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem("user");
                      router.push("/auth/login");
                    }}
                    className="px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg transition-colors font-semibold"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            {!user && (
              <Link href="/auth/login" className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg hover:bg-[#D4AF37]/90 transition-colors font-semibold">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-deep-navy mb-2 font-space flex items-center gap-3">
            <Newspaper className="w-10 h-10 text-[#D4AF37]" />
            Industry News & Updates
          </h1>
          <p className="text-slate">Stay informed about pharmaceutical industry regulations and updates</p>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-2xl p-4 border border-slate/10 shadow-sm mb-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  selectedCategory === category
                    ? "bg-[#D4AF37] text-white shadow-md"
                    : "bg-cloud-gray/30 text-deep-navy hover:bg-cloud-gray/50"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredNews.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-2xl p-6 border border-slate/10 shadow-sm hover:border-[#D4AF37]/50 hover:shadow-lg transition-all group"
            >
              {/* Article Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                    article.category === "Regulatory" ? "bg-blue-500/10 text-blue-600" :
                    article.category === "Policy" ? "bg-purple-500/10 text-purple-600" :
                    article.category === "Approvals" ? "bg-green-500/10 text-green-600" :
                    article.category === "Compliance" ? "bg-yellow-500/10 text-yellow-600" :
                    article.category === "Alert" ? "bg-red-500/10 text-red-600" :
                    "bg-[#D4AF37]/10 text-[#D4AF37]"
                  }`}>
                    {getCategoryIcon(article.category)}
                    {article.category}
                  </span>
                </div>
                <div className="text-sm text-slate">{article.publishedAt}</div>
              </div>

              {/* Title & Excerpt */}
              <h2 className="text-2xl font-bold text-deep-navy mb-3 group-hover:text-[#D4AF37] transition-colors">
                {article.title}
              </h2>
              <p className="text-slate leading-relaxed mb-4">{article.excerpt}</p>

              {/* Related Medicines */}
              {article.medicines.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm text-[#D4AF37] mb-2 flex items-center gap-1">
                    <Tag className="w-4 h-4" />
                    Related Medicines:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.medicines.slice(0, 5).map((medicine, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-cloud-gray/30 text-deep-navy rounded text-xs"
                      >
                        {medicine}
                      </span>
                    ))}
                    {article.medicines.length > 5 && (
                      <span className="px-2 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded text-xs font-semibold">
                        +{article.medicines.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate/10">
                <div className="text-sm text-slate">
                  By {article.publishedBy}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {article.views.toLocaleString()} views
                  </div>
                  <button className="px-4 py-2 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg transition-colors text-sm font-semibold">
                    Read More →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate/10">
            <Newspaper className="w-16 h-16 text-slate/40 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold text-deep-navy mb-2">No articles found</h3>
            <p className="text-slate">Try selecting a different category</p>
          </div>
        )}

        {/* Admin Panel */}
        {user && user.role === "ADMIN" && (
          <div className="mt-8 bg-white rounded-2xl p-6 border border-slate/10 shadow-sm">
            <h3 className="text-xl font-semibold text-deep-navy mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-[#D4AF37]" />
              Admin Actions
            </h3>
            <button className="px-6 py-3 bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Publish New Article
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
