import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard, ListChecks, Bookmark, Bell, BarChart2, History,
  Settings, Scan, Menu, X, Home, Shield, LogOut, Users, Heart, WalletCards
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { SESSION_TOKEN_KEY } from "@/authSession";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dr-picks", icon: ListChecks, label: "DR Picks" },
  { href: "/dr80-scanner", icon: Scan, label: "Daily Scanner" },
  { href: "/watchlist", icon: Bookmark, label: "Watchlist" },
  { href: "/alerts", icon: Bell, label: "Alerts" },
  { href: "/performance", icon: BarChart2, label: "Performance" },
  { href: "/history", icon: History, label: "History" },
  { href: "/dividend-dashboard", icon: WalletCards, label: "Dividend Dashboard" },
  { href: "/thai-dividend-portfolio", icon: Settings, label: "Broker Connection" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { href: "/admin", icon: ListChecks, label: "Manage Picks", adminOnly: true },
  { href: "/admin/users", icon: Users, label: "Admin Users", adminOnly: true },
  { href: "/settings", icon: Settings, label: "Settings", adminOnly: true },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async data => {
      localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
      await utils.auth.me.invalidate();
      toast.success("เข้าสู่ระบบสำเร็จ");
    },
    onError: error => toast.error(error.message),
  });
  const { data: alertsData } = trpc.drPicks.getAlerts.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const alertCount = (alertsData as unknown[])?.length ?? 0;
  const isAdmin = user?.role === "admin";
  const donateUrl = (import.meta.env.VITE_STRIPE_DONATE_URL ?? "").trim();
  const donateQrUrl = (import.meta.env.VITE_DONATE_QR_URL ?? "/donate-qr.jpg").trim();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close mobile menu on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0d1117] items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d1117]">
        <div className="flex flex-col items-center gap-6 p-8 max-w-sm w-full">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <BarChart2 className="w-6 h-6 text-green-400" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white mb-1">DR Strategy Tracker</h1>
            <p className="text-sm text-white/40">หนุ่มนักออม AI Research</p>
          </div>
          <p className="text-sm text-white/60 text-center">กรุณาเข้าสู่ระบบเพื่อดูข้อมูล</p>
          <div className="w-full space-y-3">
            <input
              type="email"
              value={loginEmail}
              onChange={event => setLoginEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-500/60"
              placeholder="Email"
            />
            <input
              type="password"
              value={loginPassword}
              onChange={event => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-green-500/60"
              placeholder="Password"
            />
          </div>
          <Button
            onClick={() => {
              loginMutation.mutate({ email: loginEmail, password: loginPassword });
            }}
            disabled={loginMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-500 text-white"
          >
            {loginMutation.isPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </div>
      </div>
    );
  }

  const navWithBadge = NAV_ITEMS.map(item =>
    item.href === "/alerts" ? { ...item, badge: alertCount } : item
  );

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
            <BarChart2 className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">DR STRATEGY</p>
            <p className="text-xs font-bold text-white leading-tight">TRACKER</p>
            <p className="text-[10px] text-white/40">หนุ่มนักออม AI Research</p>
          </div>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navWithBadge.map(item => {
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${active ? "bg-green-500/20 text-green-400 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{item.badge > 9 ? "9+" : item.badge}</span>
                ) : null}
              </div>
            </Link>
          );
        })}

        {/* Admin section — only visible to admin */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1">
              <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-3 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> ADMIN
              </p>
            </div>
            {ADMIN_NAV_ITEMS.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all cursor-pointer ${active ? "bg-green-500/20 text-green-400 font-semibold" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-white/10">
        {donateUrl ? (
          <a
            href={donateUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-semibold text-pink-200 transition-colors hover:border-pink-400/40 hover:bg-pink-500/15 hover:text-white"
          >
            <Heart className="h-3.5 w-3.5" />
            ส่งกำลังใจให้ทีมพัฒนา
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setDonateOpen(true)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-pink-500/25 bg-pink-500/10 px-3 py-2 text-xs font-semibold text-pink-200 transition-colors hover:border-pink-400/40 hover:bg-pink-500/15 hover:text-white"
          >
            <Heart className="h-3.5 w-3.5" />
            ส่งกำลังใจให้ทีมพัฒนา
          </button>
        )}
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold text-green-400 shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate leading-tight">{user?.name ?? "-"}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Badge
                className={`text-[9px] px-1.5 py-0 h-4 border-0 ${isAdmin ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}
              >
                {isAdmin ? "Admin" : "Viewer"}
              </Badge>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      {donateOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-white/10 bg-[#111827] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">ส่งกำลังใจให้ทีมพัฒนา</p>
                <p className="text-xs text-white/45">สแกน QR พร้อมเพย์เพื่อสนับสนุนโปรเจกต์</p>
              </div>
              <button
                type="button"
                onClick={() => setDonateOpen(false)}
                className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
                aria-label="Close donation QR"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="bg-white p-4">
              <img
                src={donateQrUrl}
                alt="QR PromptPay สำหรับส่งกำลังใจให้ทีมพัฒนา"
                className="mx-auto w-full max-w-[300px]"
              />
            </div>
            <div className="px-4 py-3 text-center text-xs text-white/45">
              ขอบคุณสำหรับทุกกำลังใจครับ
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[200px] shrink-0 bg-[#0f1117] border-r border-white/10 flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-[220px] bg-[#0f1117] border-r border-white/10 flex flex-col z-50 transition-transform duration-200 ease-out md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <span className="text-sm font-bold text-white">เมนู</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden flex items-center gap-3 h-12 px-4 border-b border-white/10 bg-[#0d1117] sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            onClick={() => setLocation("/")}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Home"
          >
            <Home className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-white flex-1 truncate">
            {NAV_ITEMS.find(i => i.href !== "/" && location.startsWith(i.href))?.label ??
             ADMIN_NAV_ITEMS.find(i => location.startsWith(i.href))?.label ??
             (location === "/" ? "Dashboard" : "DR Strategy Tracker")}
          </span>
          {alertCount > 0 && (
            <button onClick={() => setLocation("/alerts")} className="relative p-1.5">
              <Bell className="w-4 h-4 text-white/60" />
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{alertCount > 9 ? "9+" : alertCount}</span>
            </button>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
