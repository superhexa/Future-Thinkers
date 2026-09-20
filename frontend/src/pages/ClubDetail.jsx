import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Layout, PageLoader, EmptyState } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { Users, MessageSquare, Heart, Plus, Crown, Trophy, Swords } from "lucide-react";
import { ChessArena } from "@/components/ChessArena";
import { CodingPanel, ProjectsPanel, DebatesPanel } from "@/components/ClubPanels";

const SPECIAL_INIT = { chess: "main", programming: "coding", innovation: "projects", debate: "debates" };

function DialogueForum({ slug }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "مجتمع" });

  const load = async () => {
    const { data } = await api.get("/discussions", { params: { club_slug: slug, category: cat || undefined } });
    setItems(data.items);
  };
  useEffect(() => { api.get("/discussions/categories").then((r) => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [cat, slug]);

  const create = async () => {
    if (!user) return nav("/login");
    if (form.title.length < 3) return toast.error("العنوان قصير جداً");
    try { await api.post("/discussions", { ...form, club_slug: slug }); toast.success("تم نشر النقاش"); setOpen(false); setForm({ title: "", body: "", category: "مجتمع" }); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setCat("")} className={`px-3 py-1.5 rounded-full text-sm ${!cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>الكل</button>
          {cats.map((c) => <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 rounded-full text-sm ${cat === c ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{c}</button>)}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-discussion-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> نقاش جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إنشاء نقاش جديد</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input data-testid="disc-title" placeholder="عنوان النقاش" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="rounded-xl" />
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="disc-category" className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea data-testid="disc-body" placeholder="اكتب تفاصيل النقاش…" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="rounded-xl min-h-[120px]" />
            </div>
            <DialogFooter><Button data-testid="disc-submit" onClick={create} className="rounded-xl bg-blue-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {!items ? <PageLoader /> : items.length === 0 ? (
        <EmptyState icon={MessageSquare} title="لا نقاشات بعد" desc="كن أول من يبدأ نقاشاً في هذا النادي" />
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <Link key={d.id} to={`/discussions/${d.id}`} data-testid={`discussion-${d.id}`} className="block bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{d.category}</span>
                  <h3 className="font-head font-bold text-lg text-slate-900 mt-2">{d.title}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2 mt-1">{d.body}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
                    <span>{d.author_name}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{d.likes_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{d.replies_count}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubLeaderboard({ slug }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (slug === "chess") api.get("/chess/leaderboard").then((r) => setRows(r.data.map((x, i) => ({ ...x, rank: i + 1, xp: x.rating }))));
    else api.get("/leaderboard", { params: { scope: "national", limit: 20 } }).then((r) => setRows(r.data));
  }, [slug]);
  if (!rows) return <PageLoader />;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
          <span className={`w-7 h-7 rounded-lg grid place-items-center text-sm font-bold ${r.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{r.rank}</span>
          <div className="flex-1"><div className="font-medium text-slate-800">{r.name}</div><div className="text-xs text-slate-400">{r.school_name}</div></div>
          <div className="font-bold text-blue-600">{slug === "chess" ? `${r.rating || r.xp}` : `${r.xp} XP`}</div>
        </div>
      ))}
    </div>
  );
}

export default function ClubDetail() {
  const { slug } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [club, setClub] = useState(null);
  const [tab, setTab] = useState("main");

  const load = async () => { const { data } = await api.get(`/clubs/${slug}`); setClub(data); };
  useEffect(() => { load(); setTab(SPECIAL_INIT[slug] || "main"); }, [slug]);

  const toggleMember = async () => {
    if (!user) return nav("/login");
    if (club.is_member) { await api.post(`/clubs/${slug}/leave`); } else { await api.post(`/clubs/${slug}/join`); toast.success("انضممت للنادي"); }
    load();
  };

  if (!club) return <Layout><PageLoader /></Layout>;
  const Icon = Icons[club.icon] || Icons.Circle;

  const SPECIAL = {
    chess: [["main", "الحلبة"], ["leaderboard", "التصنيف"], ["forum", "النقاشات"]],
    programming: [["coding", "التحديات البرمجية"], ["leaderboard", "الصدارة"], ["forum", "النقاشات"]],
    innovation: [["projects", "المشاريع"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
    debate: [["debates", "المناظرات"], ["forum", "النقاشات"], ["members", "الأعضاء"]],
  };
  const tabs = SPECIAL[slug] || [["forum", "النقاشات"], ["leaderboard", "الصدارة"], ["members", "الأعضاء"]];
  const defaultTab = tabs[0][0];
  const activeTab = tab === "main" && slug !== "chess" ? defaultTab : (tab === "main" ? "main" : tab);

  return (
    <Layout>
      <div className="relative overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${club.color}, #0A192F)` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/15 grid place-items-center"><Icon className="w-8 h-8" /></div>
              <div>
                <h1 className="font-head text-3xl font-extrabold">{club.name}</h1>
                <p className="text-white/80 mt-1 max-w-xl">{club.description}</p>
                <div className="mt-2 text-sm text-white/70 flex gap-4"><span className="flex items-center gap-1"><Users className="w-4 h-4" />{club.members_count} عضو</span><span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{club.discussions_count} نقاش</span></div>
              </div>
            </div>
            <Button data-testid="join-club-btn" onClick={toggleMember} className={`rounded-xl h-11 ${club.is_member ? "bg-white/15 hover:bg-white/25" : "bg-white text-slate-900 hover:bg-white/90"}`}>
              {club.is_member ? "مغادرة النادي" : "انضم للنادي"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 border-b border-slate-200 mb-6">
          {tabs.map(([v, l]) => (
            <button key={v} data-testid={`club-tab-${v}`} onClick={() => setTab(v)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${(tab === v) ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{l}</button>
          ))}
        </div>

        {slug === "chess" && activeTab === "main" && <ChessArena />}
        {activeTab === "coding" && <CodingPanel />}
        {activeTab === "projects" && <ProjectsPanel />}
        {activeTab === "debates" && <DebatesPanel />}
        {activeTab === "forum" && <DialogueForum slug={slug} />}
        {activeTab === "leaderboard" && <ClubLeaderboard slug={slug} />}
        {activeTab === "members" && <MembersList slug={slug} />}
      </div>
    </Layout>
  );
}

function MembersList({ slug }) {
  const [members, setMembers] = useState(null);
  useEffect(() => { api.get(`/clubs/${slug}/members`).then((r) => setMembers(r.data)); }, [slug]);
  if (!members) return <PageLoader />;
  if (!members.length) return <EmptyState icon={Users} title="لا أعضاء بعد" desc="كن أول المنضمين لهذا النادي" />;
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.map((m) => (
        <Link key={m.id} to={`/profile/${m.id}`} className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100 ft-shadow hover-lift">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white grid place-items-center font-bold">{m.name?.[0]}</div>
          <div className="flex-1"><div className="font-medium text-slate-800">{m.name}</div><div className="text-xs text-slate-400">{m.school_name}</div></div>
          <div className="text-xs text-emerald-600 font-semibold">مستوى {m.level}</div>
        </Link>
      ))}
    </div>
  );
}
