import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-bold text-xl tracking-tight">PushPulse</div>
          <div className="flex gap-3">
            <Link href="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
            <Link href="/login"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link href="/signup"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </nav>

      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-6">Now tracking 10 news organizations</Badge>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
          Every news push notification,<br />in one place.
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          PushPulse captures breaking news alerts from top outlets the moment they hit phones.
          Search, filter, and analyze what the biggest newsrooms are pushing — and when.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/signup"><Button size="lg" className="px-8">Start free trial</Button></Link>
          <Link href="/pricing"><Button size="lg" variant="outline" className="px-8">See pricing</Button></Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: "Real-time capture", desc: "Notifications captured directly from news apps via Android devices the moment they are sent." },
          { title: "Full-text search", desc: "Search every notification ever sent. Filter by source, category, date range, or keyword." },
          { title: "Analytics", desc: "See when outlets are most active, what topics they push, and how alert strategy compares." },
        ].map((f) => (
          <div key={f.title} className="border rounded-xl p-6 bg-gray-50">
            <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
            <p className="text-gray-600 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="border-t bg-gray-50 py-16 px-6 text-center">
        <p className="text-sm text-gray-500 uppercase tracking-widest mb-6">Tracking notifications from</p>
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
          {["NYT", "CNN", "BBC", "WSJ", "AP", "Reuters", "Washington Post", "Fox News", "The Guardian", "NPR"].map((s) => (
            <span key={s} className="bg-white border rounded-full px-4 py-1.5 text-sm shadow-sm">{s}</span>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <span className="font-semibold text-gray-600">PushPulse</span>
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/login" className="hover:text-gray-600">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
