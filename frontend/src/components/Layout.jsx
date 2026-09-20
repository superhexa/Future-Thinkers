import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function Layout({ children, noFooter }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!noFooter && <Footer />}
    </div>
  );
}

export function PageLoader() {
  return <div className="min-h-[60vh] grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
}

export function Protected({ children, staff, perm }) {
  const { user, ready, hasPerm, isStaff } = useAuth();
  if (!ready) return <div className="min-h-screen grid place-items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (staff && !isStaff) return <Navigate to="/dashboard" replace />;
  if (perm && !hasPerm(perm)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div className="text-center py-16 px-4" data-testid="empty-state">
      {Icon && <div className="w-16 h-16 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4"><Icon className="w-8 h-8 text-slate-400" /></div>}
      <h3 className="font-head font-bold text-lg text-slate-800">{title}</h3>
      {desc && <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
