import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Flame, Trophy, BookOpen, Crown, Calendar, Zap, Award, TrendingUp, Sparkles, MessagesSquare } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
    <div className="flex items-center justify-between">
      <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: `${color}15`, color }}><Icon className="w-5 h-5" /></div>
    </div>
    <div className="mt-3 text-2xl font-extrabold font-head text-slate-900">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
    {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
  </div>
);

export default function Dashboard() {
  const { user, refresh } = useAuth();
  const [data, setData] = useState(null);
  const [gam, setGam] = useState(null);
  const [recs, setRecs] = useState([]);
  const [checkedIn, setCheckedIn] = useState(false);

  const load = async () => {
    const [d, g, r] = await Promise.all([
      api.get("/dashboard"), api.get("/gamification/me"), api.get("/books/me/recommendations"),
    ]);
    setData(d.data); setGam(g.data); setRecs(r.data);
  };
  useEffect(() => { load(); }, []);

  const checkin = async () => {
    try {
      const { data: res } = await api.post("/gamification/checkin");
      if (res.already) toast.info("سجّلت حضورك اليوم بالفعل");
      else { toast.success(`سلسلة ${res.streak} أيام! +نقاط خبرة`); refresh(); load(); }
      setCheckedIn(true);
    } catch { toast.error("تعذّر تسجيل الحضور"); }
  };

  if (!data || !gam) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero card */}
        <div className="ft-navy-gradient grain relative overflow-hidden rounded-3xl p-8 text-white mb-6">
          <div className="absolute -top-16 -left-16 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="text-slate-300 text-sm">أهلاً بك،</div>
              <h1 className="font-head text-3xl font-extrabold">{user.name}</h1>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" /> {gam.level_title} · المستوى {gam.level}
              </div>
              <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-slate-300 mb-1"><span>{gam.xp} نقطة خبرة</span><span>باقٍ {gam.xp_to_next} للمستوى التالي</span></div>
                <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${gam.level_progress}%` }} /></div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-5 py-3 rounded-2xl bg-white/10">
                <div className="text-2xl font-extrabold font-head flex items-center gap-1"><Flame className="w-5 h-5 text-orange-400" />{gam.streak}</div>
                <div className="text-[11px] text-slate-300">سلسلة أيام</div>
              </div>
              <Button data-testid="checkin-btn" onClick={checkin} disabled={checkedIn} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 h-12">
                <Zap className="w-4 h-4 ml-1" /> حضور اليوم
              </Button>
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Trophy} label="ترتيبك الوطني" value={`#${data.national_rank}`} color="#D97706" sub={data.school_rank ? `مدرستك: #${data.school_rank}` : ""} />
          <StatCard icon={BookOpen} label="كتب مقروءة" value={data.books_read} color="#2563EB" />
          <StatCard icon={Crown} label="تصنيف الشطرنج" value={data.chess_rating} color="#0A192F" />
          <StatCard icon={MessagesSquare} label="مشاركاتك" value={data.posts} color="#059669" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Continue reading */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-head font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> متابعة القراءة</h2>
                <Link to="/library" className="text-sm text-blue-600">المكتبة</Link>
              </div>
              {data.currently_reading.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">لم تبدأ أي كتاب بعد. <Link to="/library" className="text-blue-600">ابدأ القراءة الآن</Link></div>
              ) : (
                <div className="space-y-3">
                  {data.currently_reading.map((b) => (
                    <Link key={b.id} to={`/books/${b.id}`} className="flex items-center gap-4 p-2 rounded-xl hover:bg-slate-50">
                      <img src={fileUrl(b.cover_url)} alt={b.title} className="w-12 h-16 object-cover rounded-lg" />
                      <div className="flex-1">
                        <div className="font-semibold text-slate-800">{b.title}</div>
                        <div className="text-xs text-slate-500 mb-1.5">{b.author}</div>
                        <Progress value={b.progress} className="h-1.5" />
                      </div>
                      <div className="text-sm font-bold text-blue-600">{Math.round(b.progress)}%</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Recommendations */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Sparkles className="w-5 h-5 text-emerald-600" /> موصى لك</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {recs.slice(0, 4).map((b) => (
                  <Link key={b.id} to={`/books/${b.id}`} className="group">
                    <img src={fileUrl(b.cover_url)} alt={b.title} className="w-full aspect-[3/4] object-cover rounded-xl ft-shadow group-hover:scale-[1.03] transition-transform" />
                    <div className="mt-2 text-sm font-medium text-slate-800 line-clamp-1">{b.title}</div>
                    <div className="text-xs text-slate-400 line-clamp-1">{b.author}</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {/* Upcoming events */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Calendar className="w-5 h-5 text-amber-600" /> فعاليات قادمة</h2>
              {data.upcoming_events.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا فعاليات حالياً</div> : data.upcoming_events.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} className="block p-3 rounded-xl hover:bg-slate-50 border-r-2 border-amber-500 mb-2 bg-slate-50/50">
                  <div className="font-medium text-sm text-slate-800">{e.title}</div>
                  <div className="text-xs text-slate-400">{e.date} · {e.mode === "online" ? "عن بُعد" : "حضوري"}</div>
                </Link>
              ))}
            </section>

            {/* Competitions & chess */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-blue-600" /> منافسات مفتوحة</h2>
              {data.open_competitions.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">لا مسابقات حالياً</div> : data.open_competitions.map((c) => (
                <Link key={c.id} to={`/competitions/${c.id}`} className="block p-3 rounded-xl hover:bg-slate-50 mb-2 bg-slate-50/50">
                  <div className="font-medium text-sm text-slate-800">{c.title}</div>
                  <div className="text-xs text-slate-400">{c.type}</div>
                </Link>
              ))}
              {data.chess_challenges > 0 && (
                <Link to="/clubs/chess" className="mt-2 flex items-center gap-2 p-3 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium">
                  <Crown className="w-4 h-4" /> لديك {data.chess_challenges} تحدي شطرنج
                </Link>
              )}
            </section>

            {/* Achievements */}
            <section className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
              <h2 className="font-head font-bold text-lg flex items-center gap-2 mb-4"><Award className="w-5 h-5 text-emerald-600" /> إنجازاتك</h2>
              {gam.badges.length === 0 ? <div className="text-sm text-slate-400 text-center py-4">اجمع إنجازك الأول!</div> : (
                <div className="flex flex-wrap gap-2">
                  {gam.badges.map((b, i) => <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">{b}</span>)}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
