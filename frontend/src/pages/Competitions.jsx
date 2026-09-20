import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users, Timer, Brain, Code2, BookOpen, Crown, Atom, Feather, Scale } from "lucide-react";

const TYPE_META = {
  quiz: { label: "اختبار معرفي", icon: Brain, color: "#2563EB" },
  chess: { label: "شطرنج", icon: Crown, color: "#0A192F" },
  programming: { label: "برمجة", icon: Code2, color: "#1E293B" },
  reading: { label: "قراءة", icon: BookOpen, color: "#D97706" },
  writing: { label: "كتابة", icon: Feather, color: "#0891B2" },
  science: { label: "علوم", icon: Atom, color: "#059669" },
  debate: { label: "مناظرة", icon: Scale, color: "#7C3AED" },
};

export default function Competitions() {
  const [data, setData] = useState(null);
  const [type, setType] = useState("");
  useEffect(() => { setData(null); api.get("/competitions", { params: { type: type || undefined } }).then((r) => setData(r.data)); }, [type]);

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold">المسابقات</h1>
          <p className="text-slate-300 mt-2">اختبارات معرفية وعلمية وبرمجية وأدبية مع نقاط خبرة وشهادات وترتيب.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 flex-wrap mb-6">
          <button onClick={() => setType("")} className={`px-3.5 py-1.5 rounded-full text-sm ${!type ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>الكل</button>
          {Object.entries(TYPE_META).map(([k, m]) => <button key={k} onClick={() => setType(k)} className={`px-3.5 py-1.5 rounded-full text-sm ${type === k ? "text-white" : "bg-slate-100 text-slate-600"}`} style={type === k ? { background: m.color } : {}}>{m.label}</button>)}
        </div>
        {!data ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Trophy} title="لا مسابقات حالياً" desc="ستُعلن المسابقات القادمة قريباً" />
          : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.items.map((c) => {
                const m = TYPE_META[c.type] || TYPE_META.quiz;
                const Icon = m.icon;
                return (
                  <Link key={c.id} to={`/competitions/${c.id}`} data-testid={`competition-${c.id}`} className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow hover-lift">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-2xl grid place-items-center text-white" style={{ background: m.color }}><Icon className="w-6 h-6" /></div>
                      <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-600">{m.label}</span>
                    </div>
                    <h3 className="font-head font-bold text-lg text-slate-900 line-clamp-1">{c.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{c.description}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.participants_count} مشارك</span>
                      <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{c.duration_minutes} دقيقة</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
      </div>
    </Layout>
  );
}
