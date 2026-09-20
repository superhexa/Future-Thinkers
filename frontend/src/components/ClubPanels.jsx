import React, { useEffect, useState } from "react";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { PageLoader, EmptyState } from "@/components/Layout";
import { Code2, Play, CheckCircle2, Lightbulb, ThumbsUp, Scale, Plus, ArrowRight, Loader2 } from "lucide-react";

/* ============ نادي البرمجة — Coding challenges ============ */
export function CodingPanel() {
  const [problems, setProblems] = useState(null);
  const [active, setActive] = useState(null);
  useEffect(() => { api.get("/coding/problems").then((r) => setProblems(r.data)); }, []);
  const reload = () => api.get("/coding/problems").then((r) => setProblems(r.data));
  if (active) return <ProblemView pid={active} onBack={() => { setActive(null); reload(); }} />;
  if (!problems) return <PageLoader />;
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {problems.map((p) => (
        <button key={p.id} data-testid={`coding-problem-${p.id}`} onClick={() => setActive(p.id)} className="text-right bg-white rounded-2xl p-5 border border-slate-100 ft-shadow hover-lift">
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white grid place-items-center"><Code2 className="w-5 h-5" /></div>
            {p.solved && <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />محلولة</span>}
          </div>
          <h3 className="font-head font-bold text-slate-900 mt-3">{p.title}</h3>
          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span>الصعوبة: {"★".repeat(p.difficulty)}</span><span>+{p.xp} خبرة</span><span>{p.solved_count} حل</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function ProblemView({ pid, onBack }) {
  const [p, setP] = useState(null);
  const [code, setCode] = useState("# اكتب حلك هنا\n");
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  useEffect(() => { api.get(`/coding/problems/${pid}`).then((r) => setP(r.data)); }, [pid]);
  const run = async () => {
    setRunning(true); setResult(null);
    try { const { data } = await api.post(`/coding/problems/${pid}/submit`, { code }); setResult(data); if (data.verdict === "accepted") toast.success("حل مقبول! 🎉"); }
    catch (e) { toast.error(apiErr(e)); } finally { setRunning(false); }
  };
  if (!p) return <PageLoader />;
  return (
    <div>
      <button onClick={onBack} className="text-slate-500 hover:text-slate-800 text-sm mb-4 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> كل المسائل</button>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold text-xl text-slate-900">{p.title}</h3>
          <p className="mt-3 text-slate-700 leading-relaxed whitespace-pre-wrap">{p.statement}</p>
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold text-slate-600">أمثلة:</div>
            {p.sample_tests?.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 text-xs font-mono" dir="ltr">
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><div className="text-slate-400 mb-1">input</div>{t.input}</div>
                <div className="bg-slate-50 rounded-lg p-2 border border-slate-100"><div className="text-slate-400 mb-1">output</div>{t.output}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-slate-900 rounded-2xl overflow-hidden ft-shadow">
            <div className="px-4 py-2 text-slate-400 text-xs border-b border-slate-700 flex items-center gap-2"><Code2 className="w-4 h-4" /> Python 3</div>
            <Textarea data-testid="code-editor" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" spellCheck={false} className="min-h-[280px] bg-slate-900 text-emerald-300 font-mono border-0 rounded-none focus-visible:ring-0 resize-none" />
          </div>
          <Button data-testid="run-code-btn" onClick={run} disabled={running} className="w-full mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 ml-1" /> تشغيل واختبار</>}
          </Button>
          {result && (
            <div className={`mt-3 p-4 rounded-xl ${result.verdict === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`} data-testid="code-result">
              <div className="font-bold">{result.verdict === "accepted" ? "مقبول ✓" : result.verdict === "wrong_answer" ? "إجابة خاطئة" : "خطأ في التنفيذ"}</div>
              <div className="text-sm mt-1">نجح {result.passed} من {result.total} اختبار</div>
              {result.detail && <div className="text-xs mt-1 font-mono" dir="ltr">{result.detail}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============ نادي الابتكار — Projects + voting ============ */
export function ProjectsPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "" });
  const load = () => api.get("/projects").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { if (f.title.length < 3) return toast.error("العنوان قصير"); try { await api.post("/projects", f); toast.success("تم نشر المشروع"); setOpen(false); setF({ title: "", description: "" }); load(); } catch (e) { toast.error(apiErr(e)); } };
  const vote = async (id) => { const { data } = await api.post(`/projects/${id}/vote`); setItems((arr) => arr.map((p) => p.id === id ? { ...p, voted: data.voted, votes_count: p.votes_count + (data.voted ? 1 : -1) } : p)); };
  if (!items) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-project-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> مشروع جديد</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نشر مشروع ابتكاري</DialogTitle></DialogHeader>
            <Input data-testid="project-title" placeholder="عنوان المشروع" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl" />
            <Textarea data-testid="project-desc" placeholder="اشرح فكرتك…" value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} className="rounded-xl min-h-[120px]" />
            <DialogFooter><Button data-testid="project-submit" onClick={create} className="rounded-xl bg-emerald-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <EmptyState icon={Lightbulb} title="لا مشاريع بعد" desc="شارك فكرتك الابتكارية الأولى" /> : (
        <div className="grid sm:grid-cols-2 gap-4">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 grid place-items-center mb-3"><Lightbulb className="w-5 h-5" /></div>
              <h3 className="font-head font-bold text-slate-900">{p.title}</h3>
              <p className="text-sm text-slate-500 line-clamp-3 mt-1">{p.description}</p>
              <div className="mt-3 text-xs text-slate-400">{p.author_name} · {p.school_name || "—"}</div>
              <Button data-testid={`vote-project-${p.id}`} onClick={() => vote(p.id)} variant={p.voted ? "default" : "outline"} size="sm" className={`mt-3 rounded-xl ${p.voted ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}><ThumbsUp className="w-4 h-4 ml-1" /> {p.votes_count} تصويت</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ نادي المناظرات — Debate topics + side voting ============ */
export function DebatesPanel() {
  const [items, setItems] = useState(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ title: "", description: "", side_a: "مؤيد", side_b: "معارض" });
  const load = () => api.get("/debates").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const create = async () => { if (f.title.length < 3) return toast.error("العنوان قصير"); try { await api.post("/debates", f); toast.success("تم طرح المناظرة"); setOpen(false); setF({ title: "", description: "", side_a: "مؤيد", side_b: "معارض" }); load(); } catch (e) { toast.error(apiErr(e)); } };
  const vote = async (id, side) => { const { data } = await api.post(`/debates/${id}/vote?side=${side}`); setItems((arr) => arr.map((d) => d.id === id ? { ...d, my_vote: data.my_vote, votes_a: data.votes_a, votes_b: data.votes_b } : d)); };
  if (!items) return <PageLoader />;
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-debate-btn" className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 ml-1" /> موضوع مناظرة</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>طرح موضوع مناظرة</DialogTitle></DialogHeader>
            <Input data-testid="debate-title" placeholder="عنوان المناظرة (مثال: التعلّم عن بُعد أفضل من الحضوري)" value={f.title} onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))} className="rounded-xl" />
            <Textarea placeholder="وصف مختصر" value={f.description} onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))} className="rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="الطرف الأول" value={f.side_a} onChange={(e) => setF((x) => ({ ...x, side_a: e.target.value }))} className="rounded-xl" />
              <Input placeholder="الطرف الثاني" value={f.side_b} onChange={(e) => setF((x) => ({ ...x, side_b: e.target.value }))} className="rounded-xl" />
            </div>
            <DialogFooter><Button data-testid="debate-submit" onClick={create} className="rounded-xl bg-emerald-600">نشر</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0 ? <EmptyState icon={Scale} title="لا مناظرات بعد" desc="اطرح أول موضوع للنقاش والتصويت" /> : (
        <div className="space-y-4">
          {items.map((d) => {
            const total = (d.votes_a || 0) + (d.votes_b || 0);
            const pa = total ? Math.round((d.votes_a / total) * 100) : 50;
            return (
              <div key={d.id} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
                <div className="flex items-center gap-2"><Scale className="w-5 h-5 text-violet-600" /><h3 className="font-head font-bold text-slate-900">{d.title}</h3></div>
                {d.description && <p className="text-sm text-slate-500 mt-1">{d.description}</p>}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1"><span className="text-emerald-700 font-medium">{d.side_a} ({d.votes_a || 0})</span><span className="text-rose-700 font-medium">{d.side_b} ({d.votes_b || 0})</span></div>
                  <div className="h-2.5 rounded-full bg-rose-200 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pa}%` }} /></div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button data-testid={`vote-a-${d.id}`} onClick={() => vote(d.id, "a")} variant={d.my_vote === "a" ? "default" : "outline"} className={`rounded-xl ${d.my_vote === "a" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}>أؤيد: {d.side_a}</Button>
                  <Button data-testid={`vote-b-${d.id}`} onClick={() => vote(d.id, "b")} variant={d.my_vote === "b" ? "default" : "outline"} className={`rounded-xl ${d.my_vote === "b" ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}`}>أؤيد: {d.side_b}</Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
