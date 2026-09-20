import React, { useEffect, useState } from "react";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { LayoutDashboard, ShieldCheck, Users, BookOpen, Calendar, Trophy, Newspaper, Settings, ScrollText, Plus, Check, X, Megaphone } from "lucide-react";

const NAV = [
  { k: "overview", l: "نظرة عامة", icon: LayoutDashboard, perm: "analytics.view" },
  { k: "moderation", l: "مراجعة المحتوى", icon: ShieldCheck, perm: "book.approve" },
  { k: "users", l: "المستخدمون", icon: Users, perm: "user.view" },
  { k: "content", l: "الفعاليات والمسابقات", icon: Calendar, perm: "event.create" },
  { k: "news", l: "الأخبار", icon: Newspaper, perm: "news.manage" },
  { k: "points", l: "نظام النقاط", icon: Settings, perm: "points.manage" },
  { k: "audit", l: "سجل العمليات", icon: ScrollText, perm: "audit.view" },
];
const COLORS = ["#2563EB", "#059669", "#D97706", "#7C3AED", "#0891B2", "#E11D48", "#0A192F"];

export default function Admin() {
  const { hasPerm } = useAuth();
  const tabs = NAV.filter((n) => hasPerm(n.perm));
  const [tab, setTab] = useState(tabs[0]?.k || "overview");

  return (
    <Layout noFooter>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="font-head text-2xl font-extrabold text-slate-900 mb-6">لوحة الإدارة</h1>
        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          <aside className="lg:sticky lg:top-20 self-start">
            <div className="flex lg:flex-col gap-1 overflow-x-auto bg-white rounded-2xl p-2 border border-slate-100 ft-shadow">
              {tabs.map((n) => (
                <button key={n.k} data-testid={`admin-tab-${n.k}`} onClick={() => setTab(n.k)} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${tab === n.k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                  <n.icon className="w-4 h-4" />{n.l}
                </button>
              ))}
            </div>
          </aside>
          <div>
            {tab === "overview" && <Overview />}
            {tab === "moderation" && <Moderation />}
            {tab === "users" && <UsersPanel />}
            {tab === "content" && <ContentPanel />}
            {tab === "news" && <NewsPanel />}
            {tab === "points" && <PointsPanel />}
            {tab === "audit" && <AuditPanel />}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Overview() {
  const [o, setO] = useState(null);
  const [a, setA] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setO(r.data)); api.get("/admin/analytics").then((r) => setA(r.data)); }, []);
  if (!o || !a) return <PageLoader />;
  const cards = [
    { l: "الطلاب", v: o.students, icon: Users, c: "#2563EB" }, { l: "المدارس", v: o.schools, icon: BookOpen, c: "#059669" },
    { l: "الكتب", v: o.books, icon: BookOpen, c: "#D97706" }, { l: "الفعاليات", v: o.events, icon: Calendar, c: "#7C3AED" },
    { l: "المسابقات", v: o.competitions, icon: Trophy, c: "#0891B2" }, { l: "النقاشات", v: o.discussions, icon: Users, c: "#E11D48" },
    { l: "بلاغات مفتوحة", v: o.reports_open, icon: ShieldCheck, c: "#dc2626" }, { l: "بانتظار المراجعة", v: o.books_pending + o.activities_pending, icon: ShieldCheck, c: "#f59e0b" },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.l} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
            <div className="w-10 h-10 rounded-xl grid place-items-center mb-3" style={{ background: `${c.c}15`, color: c.c }}><c.icon className="w-5 h-5" /></div>
            <div className="text-2xl font-extrabold font-head text-slate-900">{c.v}</div>
            <div className="text-xs text-slate-500">{c.l}</div>
          </div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold mb-4">الطلاب حسب المحافظة</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={a.students_by_governorate}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold mb-4">الكتب حسب التصنيف</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={a.books_by_category} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => e.name}>
                {a.books_by_category.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Moderation() {
  const [books, setBooks] = useState([]);
  const [acts, setActs] = useState([]);
  const [reports, setReports] = useState([]);
  const load = async () => {
    const [b, a, r] = await Promise.all([
      api.get("/books/pending").catch(() => ({ data: [] })),
      api.get("/activities/pending").catch(() => ({ data: [] })),
      api.get("/reports").catch(() => ({ data: [] })),
    ]);
    setBooks(b.data); setActs(a.data); setReports(r.data);
  };
  useEffect(() => { load(); }, []);
  const actBook = async (id, action, reason = "") => { await api.post(`/books/${id}/${action}`, action === "reject" ? { reason } : undefined); toast.success(action === "approve" ? "تمت الموافقة" : "تم الرفض"); load(); };
  const actActivity = async (id, action) => { await api.post(`/activities/${id}/${action}`); toast.success("تم"); load(); };
  const resolveReport = async (id, action) => { await api.post(`/reports/${id}/resolve`, { action, note: "" }); toast.success("تم"); load(); };

  return (
    <div className="space-y-6">
      <Section title={`كتب بانتظار المراجعة (${books.length})`}>
        {books.length === 0 ? <Empty t="لا كتب معلّقة" /> : books.map((b) => (
          <div key={b.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{b.title}</div><div className="text-xs text-slate-400">{b.author} · {b.uploader_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" data-testid={`approve-book-${b.id}`} onClick={() => actBook(b.id, "approve")} className="rounded-lg bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" data-testid={`reject-book-${b.id}`} onClick={() => actBook(b.id, "reject", "لا يتوافق مع معايير النشر")} className="rounded-lg text-rose-600"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </Section>
      <Section title={`أنشطة بانتظار المراجعة (${acts.length})`}>
        {acts.length === 0 ? <Empty t="لا أنشطة معلّقة" /> : acts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{a.title}</div><div className="text-xs text-slate-400">{a.author_name} · {a.school_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => actActivity(a.id, "approve")} className="rounded-lg bg-emerald-600"><Check className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => actActivity(a.id, "reject")} className="rounded-lg text-rose-600"><X className="w-4 h-4" /></Button>
            </div>
          </div>
        ))}
      </Section>
      <Section title={`بلاغات مفتوحة (${reports.length})`}>
        {reports.length === 0 ? <Empty t="لا بلاغات" /> : reports.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
            <div><div className="font-semibold text-slate-800">{r.entity_type} · {r.reason}</div><div className="text-xs text-slate-400">بلّغ عنه: {r.reporter_name}</div></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => resolveReport(r.id, "dismiss")} className="rounded-lg">تجاهل</Button>
              <Button size="sm" onClick={() => resolveReport(r.id, "delete")} className="rounded-lg bg-rose-600 hover:bg-rose-700">حذف المحتوى</Button>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function UsersPanel() {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { hasPerm } = useAuth();
  const load = async () => { const { data } = await api.get("/admin/users", { params: { q: q || undefined, role: role || undefined } }); setData(data); };
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [q, role]);
  const setUserRole = async (id, newRole) => { try { await api.put(`/admin/users/${id}/role`, { role: newRole }); toast.success("تم تحديث الدور"); load(); } catch (e) { toast.error(apiErr(e)); } };
  const setStatus = async (id, status) => { await api.put(`/admin/users/${id}/status`, { status }); toast.success("تم"); load(); };
  const ROLES = [["student", "طالب"], ["teacher", "معلم"], ["school_admin", "مدير مدرسة"], ["directorate_admin", "مدير مديرية"], ["moderator", "مشرف"], ["admin", "مسؤول"], ["super_admin", "مسؤول أعلى"]];

  return (
    <div>
      <div className="flex gap-3 mb-4">
        <Input data-testid="user-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو البريد…" className="rounded-xl" />
        <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue placeholder="كل الأدوار" /></SelectTrigger>
          <SelectContent><SelectItem value="all">كل الأدوار</SelectItem>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!data ? <PageLoader /> : (
        <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
          {data.items.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 flex-wrap">
              <div className="flex-1 min-w-[160px]"><div className="font-medium text-slate-800">{u.name}</div><div className="text-xs text-slate-400">{u.email} · {u.school_name || "—"}</div></div>
              {hasPerm("role.manage") ? (
                <Select value={u.role} onValueChange={(v) => setUserRole(u.id, v)}>
                  <SelectTrigger data-testid={`role-select-${u.id}`} className="w-36 h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              ) : <span className="text-xs px-2 py-1 rounded bg-slate-100">{u.role}</span>}
              {hasPerm("user.manage") && (u.status === "banned"
                ? <Button size="sm" variant="outline" onClick={() => setStatus(u.id, "active")} className="rounded-lg text-emerald-600">تفعيل</Button>
                : <Button size="sm" variant="outline" data-testid={`ban-${u.id}`} onClick={() => setStatus(u.id, "banned")} className="rounded-lg text-rose-600">حظر</Button>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentPanel() {
  return (
    <div className="space-y-6">
      <EventForm />
      <CompetitionForm />
      <BroadcastForm />
    </div>
  );
}

function EventForm() {
  const [f, setF] = useState({ title: "", description: "", date: "", time: "", location: "", mode: "online", scope: "national", capacity: 100 });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => { try { await api.post("/events", { ...f, capacity: Number(f.capacity) }); toast.success("تم إنشاء الفعالية"); setF({ title: "", description: "", date: "", time: "", location: "", mode: "online", scope: "national", capacity: 100 }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="إنشاء فعالية">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input data-testid="event-title" placeholder="عنوان الفعالية" value={f.title} onChange={(e) => set("title")(e.target.value)} className="rounded-xl" />
        <Input data-testid="event-date" type="date" value={f.date} onChange={(e) => set("date")(e.target.value)} className="rounded-xl" />
        <Input placeholder="الوقت (مثال: 10:00 ص)" value={f.time} onChange={(e) => set("time")(e.target.value)} className="rounded-xl" />
        <Input placeholder="المكان" value={f.location} onChange={(e) => set("location")(e.target.value)} className="rounded-xl" />
        <Select value={f.mode} onValueChange={set("mode")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="online">عن بُعد</SelectItem><SelectItem value="onsite">حضوري</SelectItem></SelectContent></Select>
        <Select value={f.scope} onValueChange={set("scope")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="national">وطنية</SelectItem><SelectItem value="directorate">مديرية</SelectItem><SelectItem value="school">مدرسة</SelectItem></SelectContent></Select>
      </div>
      <Textarea placeholder="الوصف" value={f.description} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-3" />
      <Button data-testid="create-event-btn" onClick={submit} className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء الفعالية</Button>
    </Section>
  );
}

function CompetitionForm() {
  const [f, setF] = useState({ title: "", description: "", type: "quiz", start_at: "", end_at: "", duration_minutes: 30 });
  const [qs, setQs] = useState([{ text: "", options: ["", "", "", ""], correct: 0 }]);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const submit = async () => {
    const questions = qs.filter((q) => q.text.trim());
    try { await api.post("/competitions", { ...f, duration_minutes: Number(f.duration_minutes), start_at: f.start_at || new Date().toISOString(), end_at: f.end_at || new Date(Date.now() + 7 * 864e5).toISOString(), questions }); toast.success("تم إنشاء المسابقة"); setF({ title: "", description: "", type: "quiz", start_at: "", end_at: "", duration_minutes: 30 }); setQs([{ text: "", options: ["", "", "", ""], correct: 0 }]); }
    catch (e) { toast.error(apiErr(e)); }
  };
  return (
    <Section title="إنشاء مسابقة (اختبار)">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input data-testid="comp-title" placeholder="عنوان المسابقة" value={f.title} onChange={(e) => set("title")(e.target.value)} className="rounded-xl" />
        <Select value={f.type} onValueChange={set("type")}><SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{["quiz", "science", "reading", "programming", "writing", "debate"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
      </div>
      <Textarea placeholder="الوصف" value={f.description} onChange={(e) => set("description")(e.target.value)} className="rounded-xl mt-3" />
      <div className="mt-4 space-y-3">
        {qs.map((q, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <Input data-testid={`comp-q-${i}`} placeholder={`السؤال ${i + 1}`} value={q.text} onChange={(e) => setQs((arr) => arr.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} className="rounded-lg mb-2 bg-white" />
            <div className="grid grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-center gap-1.5">
                  <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => setQs((arr) => arr.map((x, j) => j === i ? { ...x, correct: oi } : x))} />
                  <Input placeholder={`خيار ${oi + 1}`} value={opt} onChange={(e) => setQs((arr) => arr.map((x, j) => j === i ? { ...x, options: x.options.map((o, k) => k === oi ? e.target.value : o) } : x))} className="rounded-lg h-9 bg-white" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <Button size="sm" variant="outline" onClick={() => setQs((a) => [...a, { text: "", options: ["", "", "", ""], correct: 0 }])} className="rounded-lg"><Plus className="w-4 h-4 ml-1" />سؤال آخر</Button>
      </div>
      <Button data-testid="create-comp-btn" onClick={submit} className="mt-4 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />إنشاء المسابقة</Button>
    </Section>
  );
}

function BroadcastForm() {
  const [f, setF] = useState({ title: "", body: "" });
  const submit = async () => { try { const { data } = await api.post("/admin/broadcast", { ...f, scope: "all" }); toast.success(`أُرسل إلى ${data.sent} مستخدم`); setF({ title: "", body: "" }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="إعلان عام">
      <Input placeholder="عنوان الإعلان" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mb-2" />
      <Textarea placeholder="نص الإعلان" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl" />
      <Button data-testid="broadcast-btn" onClick={submit} className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700"><Megaphone className="w-4 h-4 ml-1" />إرسال الإعلان</Button>
    </Section>
  );
}

function NewsPanel() {
  const [f, setF] = useState({ title: "", body: "", category: "منصة", cover_url: "" });
  const submit = async () => { try { await api.post("/news", f); toast.success("تم نشر الخبر"); setF({ title: "", body: "", category: "منصة", cover_url: "" }); } catch (e) { toast.error(apiErr(e)); } };
  return (
    <Section title="نشر خبر">
      <Input data-testid="news-title" placeholder="عنوان الخبر" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl mb-2" />
      <Input placeholder="رابط صورة (اختياري)" value={f.cover_url} onChange={(e) => setF((x) => ({ ...x, cover_url: e.target.value }))} className="rounded-xl mb-2" />
      <Textarea placeholder="نص الخبر" value={f.body} onChange={(e) => setF((x) => ({ ...x, body: e.target.value }))} className="rounded-xl min-h-[140px]" />
      <Button data-testid="publish-news-btn" onClick={submit} className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" />نشر</Button>
    </Section>
  );
}

function PointsPanel() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { api.get("/admin/points-config").then((r) => setCfg(r.data)); }, []);
  const LABELS = { read_book: "قراءة كتاب", review_book: "تقييم كتاب", create_discussion: "إنشاء نقاش", reply_discussion: "رد على نقاش", receive_like: "استلام إعجاب", join_event: "حضور فعالية", win_chess: "فوز بالشطرنج", play_chess: "لعب الشطرنج", daily_checkin: "حضور يومي", join_competition: "دخول مسابقة", win_competition: "فوز بمسابقة", upload_book_approved: "قبول كتاب مرفوع" };
  const save = async () => { await api.put("/admin/points-config", cfg); toast.success("تم حفظ إعدادات النقاط"); };
  if (!cfg) return <PageLoader />;
  return (
    <Section title="نظام النقاط (قابل للتعديل)">
      <div className="grid sm:grid-cols-2 gap-3">
        {Object.entries(cfg).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl p-3">
            <span className="text-sm text-slate-700">{LABELS[k] || k}</span>
            <Input data-testid={`points-${k}`} type="number" value={v} onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))} className="w-24 rounded-lg h-9 bg-white" />
          </div>
        ))}
      </div>
      <Button data-testid="save-points-btn" onClick={save} className="mt-4 rounded-xl bg-blue-600 hover:bg-blue-700">حفظ التغييرات</Button>
    </Section>
  );
}

function AuditPanel() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/admin/audit-logs").then((r) => setData(r.data)); }, []);
  if (!data) return <PageLoader />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
      {data.items.map((l) => (
        <div key={l.id} className="px-4 py-2.5 border-b border-slate-50 last:border-0 text-sm flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{l.action}</span>
          <span className="text-slate-700">{l.user_email || "—"}</span>
          <span className="text-slate-400 text-xs">{l.entity} {l.entity_id ? `#${String(l.entity_id).slice(-6)}` : ""}</span>
          <span className="text-slate-300 text-xs mr-auto" dir="ltr">{new Date(l.created_at).toLocaleString("en-GB")}</span>
        </div>
      ))}
      {data.items.length === 0 && <Empty t="لا سجلات بعد" />}
    </div>
  );
}

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
    <h3 className="font-head font-bold text-lg mb-4">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);
const Empty = ({ t }) => <div className="text-center py-6 text-slate-400 text-sm">{t}</div>;
