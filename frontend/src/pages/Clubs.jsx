import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api from "@/lib/api";
import * as Icons from "lucide-react";
import { Users, ArrowLeft } from "lucide-react";

export default function Clubs() {
  const [clubs, setClubs] = useState(null);
  useEffect(() => { api.get("/clubs").then((r) => setClubs(r.data)); }, []);
  if (!clubs) return <Layout><PageLoader /></Layout>;
  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold">الأندية الطلابية</h1>
          <p className="text-slate-300 mt-2 max-w-2xl">مساحات تفاعلية للقراءة والحوار والشطرنج والبرمجة والعلوم والابتكار والمناظرات والأدب وريادة الأعمال.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clubs.map((c) => {
            const Icon = Icons[c.icon] || Icons.Circle;
            return (
              <Link key={c.id} to={`/clubs/${c.slug}`} data-testid={`club-${c.slug}`} className="group bg-white rounded-2xl p-6 border border-slate-100 ft-shadow hover-lift block">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center text-white" style={{ background: c.color }}><Icon className="w-7 h-7" /></div>
                  {c.is_member && <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">عضو</span>}
                </div>
                <h3 className="font-head font-bold text-lg text-slate-900 mt-4">{c.name}</h3>
                <p className="mt-2 text-sm text-slate-500 line-clamp-2 leading-relaxed">{c.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.members_count} عضو</span>
                  <span className="text-blue-600 text-sm font-medium inline-flex items-center gap-1 group-hover:gap-2 transition-all">ادخل <ArrowLeft className="w-4 h-4" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
