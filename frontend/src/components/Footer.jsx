import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="ft-navy-gradient text-slate-300 mt-20 relative grain overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <Logo dark />
          <p className="mt-4 text-sm text-slate-400 leading-relaxed">منصة معرفية وطنية أردنية تجمع القراءة والحوار والعلم والإبداع في مجتمع طلابي واحد.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">استكشف</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/library" className="hover:text-white">المكتبة الرقمية</Link></li>
            <li><Link to="/clubs" className="hover:text-white">الأندية الطلابية</Link></li>
            <li><Link to="/events" className="hover:text-white">الفعاليات</Link></li>
            <li><Link to="/competitions" className="hover:text-white">المسابقات</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">المجتمع</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/leaderboard" className="hover:text-white">قوائم الصدارة</Link></li>
            <li><Link to="/clubs/dialogue" className="hover:text-white">نادي الحوار</Link></li>
            <li><Link to="/clubs/chess" className="hover:text-white">نادي الشطرنج</Link></li>
            <li><Link to="/news" className="hover:text-white">الأخبار</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3">المملكة الأردنية الهاشمية</h4>
          <p className="text-sm text-slate-400">منصة موجهة لجميع طلاب الأردن في مختلف المحافظات ومديريات التربية والتعليم.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} منصة مفكري المستقبل — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
