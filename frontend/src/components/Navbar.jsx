import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, Menu, X, LogOut, User, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import api from "@/lib/api";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { GlobalSearch } from "@/components/GlobalSearch";

const LINKS = [
  { to: "/library", label: "المكتبة" },
  { to: "/clubs", label: "الأندية" },
  { to: "/events", label: "الفعاليات" },
  { to: "/competitions", label: "المسابقات" },
  { to: "/leaderboard", label: "الصدارة" },
  { to: "/news", label: "الأخبار" },
];

export function Navbar() {
  const { user, logout, isStaff } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    if (!user) return;
    try { const { data } = await api.get("/notifications/unread-count"); setUnread(data.count); } catch {}
  }, [user]);

  useEffect(() => { loadUnread(); const t = setInterval(loadUnread, 20000); return () => clearInterval(t); }, [loadUnread, loc.pathname]);
  useEffect(() => { setOpen(false); }, [loc.pathname]);

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-6">
          <Link to="/" data-testid="nav-home-link"><Logo /></Link>
          <nav className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} data-testid={`nav-${l.to.slice(1)}`}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${loc.pathname.startsWith(l.to) ? "text-blue-700 bg-blue-50" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" data-testid="open-search-btn" onClick={() => setSearchOpen(true)} className="rounded-xl">
            <Search className="w-5 h-5" />
          </Button>

          {user ? (
            <>
              <div className="relative">
                <Button variant="ghost" size="icon" data-testid="notifications-btn" onClick={() => setNotifOpen((v) => !v)} className="rounded-xl relative">
                  <Bell className="w-5 h-5" />
                  {unread > 0 && <span className="absolute -top-0.5 -left-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] grid place-items-center">{unread}</span>}
                </Button>
                {notifOpen && <NotificationsPanel onClose={() => { setNotifOpen(false); loadUnread(); }} />}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="user-menu-btn" className="flex items-center gap-2 pr-1 pl-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
                    <Avatar className="w-8 h-8"><AvatarFallback className="bg-blue-600 text-white text-xs">{user.name?.[0] || "؟"}</AvatarFallback></Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">{user.name}</div>
                    <div className="text-xs text-slate-500">{user.level_title} · مستوى {user.level}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-dashboard" onClick={() => nav("/dashboard")}><LayoutDashboard className="w-4 h-4 ml-2" />لوحتي</DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-profile" onClick={() => nav(`/profile/${user.id}`)}><User className="w-4 h-4 ml-2" />ملفي الشخصي</DropdownMenuItem>
                  {isStaff && <DropdownMenuItem data-testid="menu-admin" onClick={() => nav("/admin")}><Shield className="w-4 h-4 ml-2" />لوحة الإدارة</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem data-testid="menu-logout" onClick={async () => { await logout(); nav("/"); }} className="text-rose-600"><LogOut className="w-4 h-4 ml-2" />تسجيل الخروج</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" data-testid="nav-login-btn" onClick={() => nav("/login")} className="rounded-xl">دخول</Button>
              <Button data-testid="nav-register-btn" onClick={() => nav("/register")} className="rounded-xl bg-blue-600 hover:bg-blue-700">انضم الآن</Button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden rounded-xl" data-testid="mobile-menu-btn" onClick={() => setOpen((v) => !v)}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {LINKS.map((l) => <Link key={l.to} to={l.to} className="block px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100">{l.label}</Link>)}
          {!user && <div className="flex gap-2 pt-2"><Button className="flex-1" variant="outline" onClick={() => nav("/login")}>دخول</Button><Button className="flex-1 bg-blue-600" onClick={() => nav("/register")}>انضم</Button></div>}
        </div>
      )}

      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </header>
  );
}
