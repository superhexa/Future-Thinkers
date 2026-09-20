import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trophy, ArrowRight, Timer, Users, Award, CheckCircle2 } from "lucide-react";

export default function CompetitionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [c, setC] = useState(null);
  const [board, setBoard] = useState([]);
  const [answers, setAnswers] = useState({});
  const [taking, setTaking] = useState(false);

  const load = async () => {
    const [d, lb] = await Promise.all([api.get(`/competitions/${id}`), api.get(`/competitions/${id}/leaderboard`)]);
    setC(d.data); setBoard(lb.data);
  };
  useEffect(() => { load(); }, [id]);

  const register = async () => {
    if (!user) return nav("/login");
    try { await api.post(`/competitions/${id}/register`); toast.success("تم تسجيلك في المسابقة"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const submit = async () => {
    const arr = c.questions.map((_, i) => answers[i] ?? -1);
    try { const { data } = await api.post(`/competitions/${id}/submit`, { answers: arr }); toast.success(`نتيجتك: ${data.score}% (${data.correct}/${data.total})`); setTaking(false); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!c) return <Layout><PageLoader /></Layout>;
  const registered = !!c.my_entry;
  const submitted = c.my_entry?.submitted;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => nav(-1)} className="text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>

        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h1 className="font-head text-2xl font-extrabold text-slate-900">{c.title}</h1>
          <p className="text-slate-600 mt-2 leading-relaxed">{c.description}</p>
          <div className="mt-4 flex items-center gap-5 text-sm text-slate-500">
            <span className="flex items-center gap-1"><Timer className="w-4 h-4" />{c.duration_minutes} دقيقة</span>
            <span className="flex items-center gap-1"><Users className="w-4 h-4" />{c.participants_count} مشارك</span>
            <span className="flex items-center gap-1"><Award className="w-4 h-4" />{c.question_count} سؤال</span>
          </div>

          {submitted ? (
            <div className="mt-5 p-4 rounded-xl bg-emerald-50 text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> أكملت المسابقة — نتيجتك {c.my_entry.score}% ({c.my_entry.correct}/{c.my_entry.total})</div>
          ) : !registered ? (
            <Button data-testid="register-competition-btn" onClick={register} className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11">سجّل في المسابقة</Button>
          ) : !taking ? (
            c.question_count > 0 ? <Button data-testid="start-competition-btn" onClick={() => setTaking(true)} className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700 h-11">ابدأ الاختبار</Button>
              : <div className="mt-5 text-sm text-slate-500">أنت مسجّل. ستُتاح الأسئلة عند بدء المسابقة.</div>
          ) : null}
        </div>

        {taking && !submitted && (
          <div className="mt-6 space-y-4" data-testid="quiz-container">
            {c.questions.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
                <div className="font-semibold text-slate-800 mb-3">{i + 1}. {q.text}</div>
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <button key={oi} data-testid={`q${i}-opt${oi}`} onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={`w-full text-right px-4 py-2.5 rounded-xl border transition-colors ${answers[i] === oi ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 hover:bg-slate-50"}`}>{opt}</button>
                  ))}
                </div>
              </div>
            ))}
            <Button data-testid="submit-quiz-btn" onClick={submit} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-12">إرسال الإجابات</Button>
          </div>
        )}

        <div className="mt-8">
          <h2 className="font-head font-bold text-lg mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> ترتيب المتسابقين</h2>
          {board.length === 0 ? <p className="text-slate-400 text-sm">لا نتائج بعد</p> : (
            <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
              {board.map((r) => (
                <div key={r.rank} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0">
                  <span className={`w-7 h-7 rounded-lg grid place-items-center text-sm font-bold ${r.rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{r.rank}</span>
                  <div className="flex-1"><div className="font-medium text-slate-800">{r.user_name}</div><div className="text-xs text-slate-400">{r.school_name}</div></div>
                  <div className="font-bold text-blue-600">{r.score}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
