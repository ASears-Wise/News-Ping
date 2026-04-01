"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { billingApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Replace with your actual Stripe Price IDs
const PRICES = {
  pro_monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ?? "price_pro_monthly",
  pro_annual: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? "price_pro_annual",
  team_monthly: process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID ?? "price_team_monthly",
  team_annual: process.env.NEXT_PUBLIC_STRIPE_TEAM_ANNUAL_PRICE_ID ?? "price_team_annual",
};

export default function PricingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(tier: "pro" | "team") {
    if (!user) {
      router.push("/signup");
      return;
    }
    const priceId = billing === "monthly" ? PRICES[`${tier}_monthly`] : PRICES[`${tier}_annual`];
    setLoading(tier);
    try {
      const res = await billingApi.createCheckout(priceId);
      window.location.href = res.data.url;
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">PushPulse</Link>
          <div className="flex gap-3">
            {user ? (
              <Link href="/feed"><Button size="sm">Go to feed</Button></Link>
            ) : (
              <>
                <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
                <Link href="/signup"><Button size="sm">Sign up</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight mb-4">Simple, transparent pricing</h1>
        <p className="text-gray-500 mb-8">7-day free trial on all plans. No credit card required to sign up.</p>

        {/* Billing toggle */}
        <div className="inline-flex bg-gray-100 rounded-full p-1 mb-12">
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === "monthly" ? "bg-white shadow-sm" : "text-gray-500"}`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${billing === "annual" ? "bg-white shadow-sm" : "text-gray-500"}`}
            onClick={() => setBilling("annual")}
          >
            Annual <Badge variant="secondary" className="ml-1 text-xs">2 months free</Badge>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pro */}
          <div className="border rounded-2xl p-8 text-left">
            <h2 className="text-xl font-bold mb-1">Pro</h2>
            <p className="text-gray-500 text-sm mb-6">For individual researchers and journalists</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">{billing === "monthly" ? "$19" : "$190"}</span>
              <span className="text-gray-500 text-sm ml-1">{billing === "monthly" ? "/month" : "/year"}</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-8">
              {["Full notification feed", "Full-text search", "Date & source filters", "30-day analytics", "All 10+ news sources"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" onClick={() => handleSubscribe("pro")} disabled={loading === "pro"}>
              {loading === "pro" ? "Redirecting..." : "Start free trial"}
            </Button>
          </div>

          {/* Team */}
          <div className="border-2 border-gray-900 rounded-2xl p-8 text-left relative">
            <Badge className="absolute -top-3 right-6 bg-gray-900">Most popular</Badge>
            <h2 className="text-xl font-bold mb-1">Team</h2>
            <p className="text-gray-500 text-sm mb-6">For newsrooms, PR teams, and researchers</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold">{billing === "monthly" ? "$49" : "$490"}</span>
              <span className="text-gray-500 text-sm ml-1">{billing === "monthly" ? "/month per seat" : "/year per seat"}</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-700 mb-8">
              {["Everything in Pro", "API access", "CSV/JSON export", "Multiple seats", "90-day analytics", "Priority support"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full bg-gray-900 hover:bg-gray-800" onClick={() => handleSubscribe("team")} disabled={loading === "team"}>
              {loading === "team" ? "Redirecting..." : "Start free trial"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
