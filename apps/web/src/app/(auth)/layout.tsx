import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <Link href="/" className="font-bold text-xl tracking-tight mb-8 text-gray-900">
        PushPulse
      </Link>
      {children}
    </div>
  );
}
