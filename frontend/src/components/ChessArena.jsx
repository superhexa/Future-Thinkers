import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Swords, Crown, Loader2, Check, X, Play } from "lucide-react";

export function ChessArena() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [challenges, setChallenges] = useState({ incoming: [], outgoing: [] });
  const [games, setGames] = useState([]);
  const [players, setPlayers] = useState([]);
  const [q, setQ] = useState("");
  const [matching, setMatching] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [c, g] = await Promise.all([api.get("/chess/challenges"), api.get("/chess/games")]);
    setChallenges(c.data); setGames(g.data);
  }, [user]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (!user) return; const t = setTimeout(() => api.get("/chess/players", { params: { q } }).then((r) => setPlayers(r.data)), 300); return () => clearTimeout(t); }, [q, user]);

  if (!user) return <div className="text-center py-16 text-slate-500">سجّل الدخول للعب الشطرنج. <button onClick={() => nav("/login")} className="text-blue-600">دخول</button></div>;

  const quickMatch = async () => {
    setMatching(true);
    try {
      const { data } = await api.post("/chess/challenge", { opponent_id: null });
      if (data.game_id) { toast.success("تم إيجاد خصم!"); nav(`/chess/${data.game_id}`); }
      else { toast.info("بانتظار خصم… سيبدأ تلقائياً عند انضمام لاعب"); load(); }
    } catch (e) { toast.error(apiErr(e)); } finally { setMatching(false); }
  };

  const challenge = async (id) => {
    try { await api.post("/chess/challenge", { opponent_id: id }); toast.success("تم إرسال التحدي"); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const accept = async (cid) => { const { data } = await api.post(`/chess/challenges/${cid}/accept`); nav(`/chess/${data.game_id}`); };
  const decline = async (cid) => { await api.post(`/chess/challenges/${cid}/decline`); load(); };

  const activeGames = games.filter((g) => g.status === "active");
  const finishedGames = games.filter((g) => g.status === "finished");

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-head font-bold text-lg flex items-center gap-2"><Swords className="w-5 h-5 text-blue-600" /> مباراة سريعة</h3>
              <p className="text-sm text-slate-500 mt-1">تصنيفك الحالي: <span className="font-bold text-slate-800">{user.chess_rating || 1200}</span> ELO</p>
            </div>
            <Button data-testid="quick-match-btn" onClick={quickMatch} disabled={matching} className="rounded-xl bg-blue-600 hover:bg-blue-700 h-11">
              {matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 ml-1" /> ابحث عن خصم</>}
            </Button>
          </div>
        </div>

        {activeGames.length > 0 && (
          <div>
            <h3 className="font-head font-bold text-lg mb-3">مبارياتك النشطة</h3>
            <div className="space-y-2">
              {activeGames.map((g) => (
                <button key={g.id} data-testid={`active-game-${g.id}`} onClick={() => nav(`/chess/${g.id}`)} className="w-full flex items-center justify-between bg-white rounded-xl p-4 border border-slate-100 ft-shadow hover-lift">
                  <span className="font-medium text-slate-800">{g.white_name} <span className="text-slate-400">ضد</span> {g.black_name}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700">دورك؟ اضغط للعب</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold text-lg mb-3">تحدَّ لاعباً</h3>
          <Input data-testid="player-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن طالب بالاسم…" className="rounded-xl mb-3" />
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                <div><span className="font-medium text-slate-800">{p.name}</span> <span className="text-xs text-slate-400">({p.rating})</span></div>
                <Button size="sm" variant="outline" data-testid={`challenge-${p.id}`} onClick={() => challenge(p.id)} className="rounded-lg">تحدّي</Button>
              </div>
            ))}
            {q && players.length === 0 && <div className="text-sm text-slate-400 text-center py-3">لا نتائج</div>}
          </div>
        </div>

        {finishedGames.length > 0 && (
          <div>
            <h3 className="font-head font-bold text-lg mb-3">سجل المباريات</h3>
            <div className="space-y-2">
              {finishedGames.slice(0, 8).map((g) => {
                const won = g.winner_id === user.id;
                return (
                  <div key={g.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-slate-100 text-sm">
                    <span>{g.white_name} ضد {g.black_name}</span>
                    <span className={`px-2 py-0.5 rounded-md ${g.result === "draw" ? "bg-slate-100 text-slate-600" : won ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{g.result === "draw" ? "تعادل" : won ? "فوز" : "خسارة"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
          <h3 className="font-head font-bold flex items-center gap-2 mb-3"><Crown className="w-5 h-5 text-amber-500" /> تحديات واردة</h3>
          {challenges.incoming.length === 0 ? <p className="text-sm text-slate-400 text-center py-3">لا تحديات جديدة</p> : challenges.incoming.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-2 mb-2 rounded-lg bg-slate-50">
              <span className="text-sm font-medium">{c.challenger_name}</span>
              <div className="flex gap-1">
                <Button size="icon" data-testid={`accept-${c.id}`} onClick={() => accept(c.id)} className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700"><Check className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" data-testid={`decline-${c.id}`} onClick={() => decline(c.id)} className="w-8 h-8 rounded-lg"><X className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
        {challenges.outgoing.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 ft-shadow">
            <h3 className="font-head font-bold mb-3">تحديات مُرسلة</h3>
            {challenges.outgoing.map((c) => <div key={c.id} className="text-sm text-slate-500 py-1">{c.opponent_name || "بانتظار خصم…"} <span className="text-amber-600">قيد الانتظار</span></div>)}
          </div>
        )}
      </div>
    </div>
  );
}
