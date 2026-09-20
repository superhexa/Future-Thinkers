import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import { Trophy, Crown, Medal, Flame, School, Building2, MapPin, Globe } from "lucide-react";

const SCOPES = [
  { v: "national", l: "المملكة", icon: Globe },
  { v: "schools", l: "المدارس", icon: School },
  { v: "directorates", l: "المديريات", icon: Building2 },
  { v: "governorates", l: "المحافظات", icon: MapPin },
];
const PERIODS = [{ v: "all", l: "الكل" }, { v: "weekly", l: "أسبوعي" }, { v: "monthly", l: "شهري" }, { v: "yearly", l: "سنوي" }];

export default function Leaderboard() {
  const [scope, setScope] = useState("national");
  const [period, setPeriod] = useState("all");
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    let url = "/leaderboard";
    let params = {};
    if (scope === "national") params = { scope: "national", period };
    else url = `/leaderboard/${scope}`;
    api.get(url, { params }).then((r) => setRows(r.data));
  }, [scope, period]);

  const isStudents = scope === "national";
  const top3 = rows?.slice(0, 3) || [];
  const rest = rows?.slice(3) || [];
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const medalColor = ["from-amber-400 to-yellow-600", "from-slate-300 to-slate-500", "from-amber-700 to-yellow-900"];

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold flex items-center gap-3"><Trophy className="w-8 h-8 text-amber-400" /> قوائم الصدارة الوطنية</h1>
          <p className="text-slate-300 mt-2">ترتيب الطلاب والمدارس والمديريات والمحافظات وفق نظام نقاط موثّق.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-2 justify-between mb-6">
          <div className="flex gap-2 flex-wrap">
            {SCOPES.map((s) => <button key={s.v} data-testid={`lb-scope-${s.v}`} onClick={() => setScope(s.v)} className={`px-3.5 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${scope === s.v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}><s.icon className="w-4 h-4" />{s.l}</button>)}
          </div>
          {isStudents && <div className="flex gap-1.5">{PERIODS.map((p) => <button key={p.v} onClick={() => setPeriod(p.v)} className={`px-3 py-1.5 rounded-full text-xs ${period === p.v ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>{p.l}</button>)}</div>}
        </div>

        {!rows ? <PageLoader /> : rows.length === 0 ? <div className="text-center py-16 text-slate-400">لا توجد بيانات بعد</div> : (
          <>
            {/* Podium */}
            {top3.length >= 1 && (
              <div className="grid grid-cols-3 gap-3 items-end mb-8">
                {podiumOrder.map((r, idx) => {
                  const realRank = r.rank;
                  const heights = ["h-28", "h-36", "h-24"];
                  const displayHeight = realRank === 1 ? "h-36" : realRank === 2 ? "h-28" : "h-24";
                  return (
                    <div key={r.id || r.name} className="text-center">
                      <div className={`w-14 h-14 rounded-full mx-auto grid place-items-center text-white text-lg font-bold bg-gradient-to-br ${medalColor[realRank - 1]} mb-2 ft-shadow`}>{realRank === 1 ? <Crown className="w-7 h-7" /> : realRank}</div>
                      <div className="font-semibold text-sm text-slate-800 line-clamp-1">{r.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{r.school_name || `${r.students || 0} طالب`}</div>
                      <div className={`mt-2 ${displayHeight} rounded-t-xl bg-gradient-to-t ${medalColor[realRank - 1]} grid place-items-start justify-center pt-2 text-white font-bold`}>{(isStudents ? r.xp : r.total_xp).toLocaleString("en-US")}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-100 ft-shadow overflow-hidden">
              {rest.map((r) => (
                <RowItem key={r.id || r.name} r={r} isStudents={isStudents} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function RowItem({ r, isStudents }) {
  const content = (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      <span className="w-8 h-8 rounded-lg grid place-items-center text-sm font-bold bg-slate-100 text-slate-500">{r.rank}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 truncate">{r.name}</div>
        <div className="text-xs text-slate-400 truncate">{isStudents ? r.school_name : `${r.students || 0} طالب`}</div>
      </div>
      {isStudents && r.streak > 0 && <span className="text-xs text-orange-500 flex items-center gap-0.5"><Flame className="w-3.5 h-3.5" />{r.streak}</span>}
      <div className="font-bold text-blue-600">{(isStudents ? r.xp : r.total_xp).toLocaleString("en-US")}</div>
    </div>
  );
  return isStudents && r.id ? <Link to={`/profile/${r.id}`} data-testid={`lb-row-${r.id}`}>{content}</Link> : content;
}
