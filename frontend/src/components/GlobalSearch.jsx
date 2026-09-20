import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Search, BookOpen, MessagesSquare, Calendar, School, User } from "lucide-react";

export function GlobalSearch({ onClose }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (q.trim().length < 2) { setRes(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { const { data } = await api.get("/search", { params: { q } }); setRes(data); } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const go = (path) => { nav(path); onClose(); };
  const Section = ({ icon: Icon, label, list, render }) => (list?.length ? (
    <div className="py-2">
      <div className="px-4 py-1 text-xs font-semibold text-slate-400 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" />{label}</div>
      {list.map(render)}
    </div>
  ) : null);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl ft-shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()} data-testid="global-search">
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400" />
          <input ref={inputRef} data-testid="global-search-input" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن كتب، نقاشات، فعاليات، مدارس، طلاب…"
            className="flex-1 py-4 outline-none text-slate-800 bg-transparent" />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-6 text-center text-slate-400 text-sm">جارٍ البحث…</div>}
          {res && !loading && (
            <>
              <Section icon={BookOpen} label="كتب" list={res.books} render={(b) => <button key={b.id} onClick={() => go(`/books/${b.id}`)} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm">{b.title} <span className="text-slate-400">— {b.author}</span></button>} />
              <Section icon={MessagesSquare} label="نقاشات" list={res.discussions} render={(d) => <button key={d.id} onClick={() => go(`/discussions/${d.id}`)} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm">{d.title}</button>} />
              <Section icon={Calendar} label="فعاليات" list={res.events} render={(e) => <button key={e.id} onClick={() => go(`/events/${e.id}`)} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm">{e.title}</button>} />
              <Section icon={User} label="طلاب" list={res.students} render={(u) => <button key={u.id} onClick={() => go(`/profile/${u.id}`)} className="w-full text-right px-4 py-2 hover:bg-slate-50 text-sm">{u.name} <span className="text-slate-400">— {u.school_name}</span></button>} />
              <Section icon={School} label="مدارس" list={res.schools} render={(s) => <div key={s.id} className="px-4 py-2 text-sm text-slate-600">{s.name} <span className="text-slate-400">— {s.governorate_name}</span></div>} />
              {["books", "discussions", "events", "students", "schools"].every((k) => !res[k]?.length) && <div className="p-8 text-center text-slate-400 text-sm">لا توجد نتائج</div>}
            </>
          )}
          {!res && !loading && <div className="p-8 text-center text-slate-400 text-sm">اكتب حرفين على الأقل للبحث</div>}
        </div>
      </div>
    </div>
  );
}
