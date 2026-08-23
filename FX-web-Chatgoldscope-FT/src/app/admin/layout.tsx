import Link from "next/link";
export const metadata = { robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#080b10]"><header className="border-b border-[var(--border)] p-4"><div className="container-shell flex items-center justify-between"><strong>GoldScope Admin</strong><nav className="flex gap-4 text-sm text-[var(--text-muted)]"><Link href="/admin">Overview</Link><Link href="/admin/users">Users</Link><Link href="/admin/analyses">Analyses</Link><Link href="/admin/market-feed">Feed</Link><Link href="/admin/prompts">Prompts</Link></nav></div></header>{children}</div>;
}
