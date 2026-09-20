import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MapPin, Users, Globe, Building2 } from "lucide-react";

const SCOPE = { national: "وطنية", directorate: "مديرية", school: "مدرسة" };

export default function Events() {
  const { hasPerm } = useAuth();
  const [data, setData] = useState(null);
  const [scope, setScope] = useState("");
  useEffect(() => { setData(null); api.get("/events", { params: { scope: scope || undefined } }).then((r) => setData(r.data)); }, [scope]);

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold">الفعاليات</h1>
          <p className="text-slate-300 mt-2">فعاليات وطنية وعلى مستوى المديريات والمدارس، حضورية وعن بُعد.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6">
          {[["", "الكل"], ["national", "وطنية"], ["directorate", "مديرية"], ["school", "مدرسة"]].map(([v, l]) => (
            <button key={v} onClick={() => setScope(v)} data-testid={`event-scope-${v || "all"}`} className={`px-3.5 py-1.5 rounded-full text-sm font-medium ${scope === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{l}</button>
          ))}
        </div>
        {!data ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Calendar} title="لا فعاليات حالياً" desc="تابعنا لمعرفة الفعاليات القادمة" />
          : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.items.map((e) => (
                <Link key={e.id} to={`/events/${e.id}`} data-testid={`event-${e.id}`} className="bg-white rounded-2xl overflow-hidden border border-slate-100 ft-shadow hover-lift">
                  <div className="h-36 bg-gradient-to-br from-blue-600 to-emerald-600 relative">
                    {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="w-full h-full object-cover" />}
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/90 text-xs font-medium text-slate-700">{SCOPE[e.scope]}</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-head font-bold text-slate-900 line-clamp-1">{e.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mt-1">{e.description}</p>
                    <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />{e.date} {e.time}</div>
                      <div className="flex items-center gap-1.5">{e.mode === "online" ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}{e.mode === "online" ? "عن بُعد" : e.location || "حضوري"}</div>
                      <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{e.registered_count}/{e.capacity} مسجّل</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>
    </Layout>
  );
}
