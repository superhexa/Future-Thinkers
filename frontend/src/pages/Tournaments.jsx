import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Users, CalendarDays, ShieldCheck, Swords, Clock3, Medal, Search, Filter, Bell, ClipboardList } from "lucide-react";

const demo = [{ id: "demo", title: "بطولة أبطال الشطرنج", status: "live", players: 16, round: "نصف النهائي", date: "اليوم", format: "إقصائي" }];
const demoRounds = [
  { name: "ربع النهائي", matches: [["أحمد خالد", "سارة علي"], ["يوسف سامي", "ليان عمر"], ["نور حسن", "محمد عادل"], ["ريم فهد", "عمر وليد"]] },
  { name: "نصف النهائي", matches: [["أحمد خالد", "يوسف سامي"], ["الفائز 3", "ريم فهد"]] },
  { name: "النهائي", matches: [["المتأهل الأول", "المتأهل الثاني"]] },
];
const standings = [{ name: "أحمد خالد", points: 12, wins: 4 }, { name: "ريم فهد", points: 10, wins: 3 }, { name: "يوسف سامي", points: 8, wins: 3 }, { name: "سارة علي", points: 6, wins: 2 }];

export default function Tournaments() {
  const [items, setItems] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [joined, setJoined] = useState(false);
  const [reminder, setReminder] = useState(false);
  useEffect(() => { api.get("/chess/tournaments").then((r) => setItems(r.data.items || r.data)).catch(() => setItems(demo)); }, []);
  const filtered = useMemo(() => (items || []).filter((t) => (filter === "all" || t.status === filter) && t.title.toLowerCase().includes(query.toLowerCase())), [items, query, filter]);
  if (!items) return <Layout><PageLoader /></Layout>;
  return <Layout>
    <div className="ft-navy-gradient grain text-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12"><div className="flex items-start gap-3"><Trophy className="text-amber-300 mt-1 shrink-0" /><div><h1 className="font-head text-3xl font-extrabold">بطولات الشطرنج</h1><p className="text-slate-300 mt-1">أقواس إقصائية، ترتيب تلقائي، ومباريات حية.</p></div></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8"><Stat icon={Users} label="لاعبون" value="128" /><Stat icon={Swords} label="مباريات اليوم" value="24" /><Stat icon={Medal} label="بطولات مكتملة" value="18" /><Stat icon={ShieldCheck} label="نظام النزاهة" value="مفعّل" /></div></div></div>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between"><div className="relative flex-1 max-w-md"><Search className="absolute right-3 top-3.5 size-4 text-slate-400" /><input aria-label="بحث في البطولات" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن بطولة…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200" /></div><div className="flex gap-2"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="rounded-lg">الكل</Button><Button size="sm" variant={filter === "live" ? "default" : "outline"} onClick={() => setFilter("live")} className="rounded-lg">مباشرة</Button><Button size="sm" variant={filter === "upcoming" ? "default" : "outline"} onClick={() => setFilter("upcoming")} className="rounded-lg">قادمة</Button></div></section>
      <div className="grid md:grid-cols-3 gap-4">{filtered.map((t) => <Link key={t.id} to={`/tournaments/${t.id}`} className="bg-white rounded-2xl border border-slate-100 p-5 ft-shadow hover-lift"><div className="flex justify-between"><div className="size-11 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center"><Crown /></div><Badge variant="secondary">{t.status === "live" ? "مباشرة" : "قادمة"}</Badge></div><h2 className="font-head font-bold mt-4">{t.title}</h2><div className="flex flex-wrap gap-3 text-xs text-slate-500 mt-3"><span><Users className="inline size-3 ml-1" />{t.players} لاعب</span><span><CalendarDays className="inline size-3 ml-1" />{t.date}</span><span><ClipboardList className="inline size-3 ml-1" />{t.format || "إقصائي"}</span></div></Link>)}</div>
      <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-6"><section className="bg-white rounded-2xl border border-slate-100 p-5 ft-shadow overflow-x-auto"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5"><div><h2 className="font-head text-xl font-bold">القوس الإقصائي</h2><p className="text-sm text-slate-500">تتقدم النتائج تلقائياً بعد اعتماد حكم المباراة.</p></div><div className="flex gap-2"><Button onClick={() => setJoined(!joined)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Swords data-icon="inline-start" />{joined ? "تم تسجيلك" : "انضم لبطولة"}</Button><Button variant="outline" onClick={() => setReminder(!reminder)} className="rounded-xl"><Bell data-icon="inline-start" />{reminder ? "التذكير مفعّل" : "تذكيري"}</Button></div></div><div className="flex min-w-[720px] gap-6">{demoRounds.map((round) => <div key={round.name} className="flex-1"><h3 className="text-sm font-bold text-slate-500 mb-3">{round.name}</h3><div className="flex flex-col gap-5">{round.matches.map((match, i) => <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden"><div className="px-3 py-2 border-b border-slate-200 flex justify-between text-sm"><span>{match[0]}</span><strong className="text-emerald-700">{i === 0 && round.name !== "النهائي" ? "فاز" : ""}</strong></div><div className="px-3 py-2 text-sm">{match[1]}</div></div>)}</div></div>)}</div></section><aside className="bg-white rounded-2xl border border-slate-100 p-5 ft-shadow"><div className="flex items-center gap-2 mb-4"><Medal className="text-amber-500" /><h2 className="font-head font-bold">ترتيب المتصدرين</h2></div><div className="flex flex-col gap-3">{standings.map((p, i) => <div key={p.name} className="flex items-center gap-3"><span className="size-7 rounded-full bg-slate-100 grid place-items-center text-xs font-bold">{i + 1}</span><div className="flex-1"><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-slate-400">{p.wins} انتصارات</div></div><strong className="text-emerald-700">{p.points}</strong></div>)}</div><div className="mt-5 pt-4 border-t text-xs text-slate-500 flex items-center gap-2"><Clock3 className="size-4" /> الجولة التالية بعد 02:45:18</div></aside></div>
      <section className="grid sm:grid-cols-3 gap-4"><Info title="نظام اللعب" text="إقصاء مباشر مع كسر تعادل تلقائي وتوثيق لكل نتيجة." /><Info title="صلاحيات الحكام" text="الحكم يعتمد النتيجة، والمشرف يراجع الاعتراضات وسجل النزاهة." /><Info title="جوائز وترتيب" text="النقاط والترتيب يتحدثان فوراً مع حفظ تاريخ كل بطولة." /></section>
    </main>
  </Layout>;
}
function Stat({ icon: Icon, label, value }) { return <div className="rounded-xl bg-white/10 border border-white/10 p-3"><Icon className="size-4 text-emerald-300" /><div className="font-bold mt-2">{value}</div><div className="text-xs text-slate-300">{label}</div></div>; }
function Info({ title, text }) { return <div className="rounded-2xl border border-slate-100 bg-white p-5 ft-shadow"><h3 className="font-head font-bold">{title}</h3><p className="text-sm text-slate-500 mt-2 leading-6">{text}</p></div>; }
export function TournamentDetail() { return <Tournaments />; }
