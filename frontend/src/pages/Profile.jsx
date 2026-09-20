import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import * as Icons from "lucide-react";
import { Trophy, Flame, BookOpen, Crown, MessageSquare, School, MapPin, Award, Sparkles } from "lucide-react";

export default function Profile() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  useEffect(() => { setP(null); api.get(`/users/${id}/profile`).then((r) => setP(r.data)); }, [id]);
  if (!p) return <Layout><PageLoader /></Layout>;

  const stats = [
    { icon: Trophy, label: "الترتيب الوطني", value: `#${p.national_rank}`, color: "#D97706" },
    { icon: Sparkles, label: "نقاط الخبرة", value: p.xp.toLocaleString("en-US"), color: "#2563EB" },
    { icon: BookOpen, label: "كتب مقروءة", value: p.stats?.books_read || 0, color: "#059669" },
    { icon: Crown, label: "تصنيف الشطرنج", value: p.chess_rating, color: "#0A192F" },
    { icon: MessageSquare, label: "مشاركات", value: p.stats?.posts || 0, color: "#7C3AED" },
    { icon: Flame, label: "سلسلة الأيام", value: p.streak, color: "#EA580C" },
  ];

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-24 h-24 rounded-3xl bg-white/15 grid place-items-center text-4xl font-extrabold">{p.name?.[0]}</div>
            <div>
              <h1 className="font-head text-3xl font-extrabold">{p.name}</h1>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm">{p.level_title} · المستوى {p.level}</div>
              <div className="mt-2 text-slate-300 text-sm flex items-center gap-4 flex-wrap">
                {p.school_name && <span className="flex items-center gap-1"><School className="w-4 h-4" />{p.school_name}</span>}
                {p.governorate_name && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{p.governorate_name}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {p.bio && <p className="text-slate-600 mb-6 bg-white rounded-2xl p-5 border border-slate-100">{p.bio}</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${s.color}15`, color: s.color }}><s.icon className="w-5 h-5" /></div>
              <div className="text-2xl font-extrabold font-head text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="font-head font-bold text-xl mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-emerald-600" /> الإنجازات ({p.achievements.length})</h2>
        {p.achievements.length === 0 ? <p className="text-slate-400 text-sm">لا إنجازات بعد</p> : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {p.achievements.map((a) => {
              const Icon = Icons[a.icon] || Icons.Award;
              return (
                <div key={a.key} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 ft-shadow">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white grid place-items-center"><Icon className="w-5 h-5" /></div>
                  <div><div className="font-semibold text-slate-800 text-sm">{a.title}</div><div className="text-xs text-slate-400">{a.badge}</div></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
