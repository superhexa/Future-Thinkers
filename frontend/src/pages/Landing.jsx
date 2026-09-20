import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Counter } from "@/components/Counter";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import * as Icons from "lucide-react";
import { BookOpen, Crown, MessagesSquare, Users, GraduationCap, Building2, Calendar, ArrowLeft, Sparkles, Target, Flag, Trophy, Rocket } from "lucide-react";

const CLUB_ICON = (name) => Icons[name] || Icons.Circle;

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [cms, setCms] = useState(null);

  useEffect(() => {
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
    api.get("/clubs").then((r) => setClubs(r.data)).catch(() => {});
    api.get("/landing/cms").then((r) => setCms(r.data)).catch(() => {});
  }, []);

  const statItems = stats ? [
    { label: "مفكرو المستقبل", value: stats.students, icon: Users },
    { label: "الكتب المعرفية", value: stats.books, icon: BookOpen },
    { label: "المدارس المشاركة", value: stats.schools, icon: GraduationCap },
    { label: "مديريات التربية", value: stats.directorates, icon: Building2 },
    { label: "الفعاليات", value: stats.events, icon: Calendar },
    { label: "مباريات الشطرنج", value: stats.chess_games, icon: Crown },
  ] : [];

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden ft-navy-gradient grain text-white">
        <div className="absolute top-20 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-sm mb-6">
              <Sparkles className="w-4 h-4 text-emerald-400" /> المنصة المعرفية الوطنية لطلاب الأردن
            </div>
            <h1 className="font-head text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight">
              نقرأ أكثر، نفكّر أعمق،<br /><span className="text-emerald-400">ونصنع المستقبل.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-2xl">
              بيئة معرفية وثقافية وعلمية تجمع طلاب المملكة الأردنية الهاشمية حول القراءة والحوار والشطرنج والبرمجة والابتكار والمنافسات في مجتمع طلابي واحد.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button data-testid="hero-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white h-12 px-7 text-base">
                {user ? "اذهب إلى لوحتي" : "انضم إلى مفكري المستقبل"} <ArrowLeft className="w-5 h-5 mr-1" />
              </Button>
              <Button data-testid="hero-library-btn" onClick={() => nav("/library")} size="lg" variant="outline" className="rounded-2xl h-12 px-7 text-base bg-white/5 border-white/20 text-white hover:bg-white/10">
                تصفّح المكتبة
              </Button>
            </div>
          </div>
        </div>
        {/* stats ribbon */}
        <div className="relative border-t border-white/10 bg-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {statItems.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl lg:text-3xl font-extrabold font-head text-white"><Counter value={s.value} /></div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision / Mission / Goals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-3xl p-8 ft-shadow border border-slate-100 hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 grid place-items-center mb-4"><Flag className="w-6 h-6 text-blue-600" /></div>
            <h2 className="font-head text-2xl font-bold text-slate-900">رؤيتنا</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">{cms?.vision || "أن نبني جيلاً أردنياً قارئاً ومفكراً ومبدعاً، يصنع المعرفة ويقود المستقبل."}</p>
          </div>
          <div className="bg-white rounded-3xl p-8 ft-shadow border border-slate-100 hover-lift">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 grid place-items-center mb-4"><Target className="w-6 h-6 text-emerald-600" /></div>
            <h2 className="font-head text-2xl font-bold text-slate-900">رسالتنا</h2>
            <p className="mt-3 text-slate-600 leading-relaxed">{cms?.mission || "بناء مجتمع طلابي معرفي وطني يتيح القراءة والحوار والتعلّم والمنافسة والإبداع."}</p>
          </div>
        </div>
        <h2 className="font-head text-2xl font-bold text-slate-900 mb-5">أهدافنا</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(cms?.goals || []).map((g, i) => (
            <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-emerald-600 text-white grid place-items-center text-sm font-bold shrink-0">{i + 1}</div>
              <p className="text-slate-700 text-sm leading-relaxed">{g}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clubs showcase */}
      <section className="bg-white py-20 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-head text-3xl lg:text-4xl font-extrabold text-slate-900">اكتشف الأندية</h2>
            <p className="mt-3 text-slate-500 max-w-2xl mx-auto">مساحات تفاعلية حقيقية للقراءة، الحوار، الشطرنج، البرمجة، العلوم، الابتكار والمزيد.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {clubs.map((c) => {
              const Icon = CLUB_ICON(c.icon);
              return (
                <Link key={c.id} to={`/clubs/${c.slug}`} data-testid={`club-card-${c.slug}`} className="group bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-100 hover-lift block">
                  <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 text-white" style={{ background: c.color }}><Icon className="w-6 h-6" /></div>
                  <h3 className="font-head font-bold text-lg text-slate-900">{c.name}</h3>
                  <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
                  <div className="mt-4 text-blue-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">ادخل النادي <ArrowLeft className="w-4 h-4" /></div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-[2rem] p-10 lg:p-16 text-center text-white">
          <Trophy className="w-14 h-14 text-emerald-400 mx-auto mb-5" />
          <h2 className="font-head text-3xl lg:text-4xl font-extrabold">جاهز لتكون من مفكري المستقبل؟</h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto">انضم إلى آلاف الطلاب في رحلة معرفية تنافسية، واجمع نقاط الخبرة، وتصدّر قوائم الصدارة الوطنية.</p>
          <Button data-testid="cta-join-btn" onClick={() => nav(user ? "/dashboard" : "/register")} size="lg" className="mt-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12 px-8 text-base">
            <Rocket className="w-5 h-5 ml-2" /> {user ? "لوحتي" : "ابدأ الآن مجاناً"}
          </Button>
        </div>
      </section>
    </Layout>
  );
}
