import React, { useEffect, useState } from "react";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper } from "lucide-react";

export default function News() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/news").then((r) => setData(r.data)); }, []);
  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-head text-3xl lg:text-4xl font-extrabold">الأخبار</h1>
          <p className="text-slate-300 mt-2">أخبار المنصة والفعاليات وإنجازات الطلاب والمدارس والأندية.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!data ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
          : data.items.length === 0 ? <EmptyState icon={Newspaper} title="لا أخبار بعد" desc="تابعنا لآخر المستجدات" />
          : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.items.map((n) => (
                <article key={n.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 ft-shadow hover-lift">
                  {n.cover_url && <img src={fileUrl(n.cover_url)} alt="" className="h-40 w-full object-cover" />}
                  <div className="p-5">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{n.category}</span>
                    <h3 className="font-head font-bold text-lg text-slate-900 mt-2 line-clamp-2">{n.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-3 mt-1">{n.body}</p>
                    <div className="text-xs text-slate-400 mt-3">{n.author_name}</div>
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>
    </Layout>
  );
}
