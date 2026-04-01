"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/feed", label: "Feed" },
  { href: "/search", label: "Search" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings/billing", label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className="w-56 shrink-0 border-r bg-gray-50 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-5 border-b">
        <Link href="/feed" className="font-bold text-lg tracking-tight">
          PushPulse
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
              pathname.startsWith(item.href)
                ? "bg-gray-900 text-white"
                : "text-gray-700 hover:bg-gray-200"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-4 border-t">
        <p className="text-xs text-gray-500 truncate mb-2">{user?.email}</p>
        <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
