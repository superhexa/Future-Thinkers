import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout, EmptyState } from "@/components/Layout";
import api, { fileUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Search, Upload, BookOpen, Eye } from "lucide-react";

const SORTS = [{ v: "recent", l: "الأحدث" }, { v: "popular", l: "الأكثر قراءة" }, { v: "rating", l: "الأعلى تقييماً" }, { v: "title", l: "أبجدي" }];

export function BookCard({ b }) {
  return (
    <Link to={`/books/${b.id}`} data-testid={`book-card-${b.id}`} className="group block">
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden ft-shadow bg-slate-100">
        <img src={fileUrl(b.cover_url)} alt={b.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {b.status && b.status !== "approved" && <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px]">{b.status === "pending" ? "قيد المراجعة" : "مرفوض"}</span>}
      </div>
      <div className="mt-2.5">
        <h3 className="font-semibold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{b.title}</h3>
        <p className="text-xs text-slate-400 line-clamp-1">{b.author}</p>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{b.rating_avg || "—"}</span>
          <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{b.views || 0}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Library() {
  const { user } = useAuth();
  const [cats, setCats] = useState([]);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => { api.get("/books/categories").then((r) => setCats(r.data)); }, []);

  const load = useCallback(async () => {
    setData(null);
    const { data } = await api.get("/books", { params: { category: cat || undefined, q: q || undefined, sort, page, limit: 15 } });
    setData(data);
  }, [cat, q, sort, page]);

  useEffect(() => { const t = setTimeout(load, q ? 350 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => { setPage(1); }, [cat, sort]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <Layout>
      <div className="ft-navy-gradient grain text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-head text-3xl lg:text-4xl font-extrabold">المكتبة الرقمية</h1>
              <p className="text-slate-300 mt-2">اقرأ في العلوم والثقافة والأدب والبرمجة والفلسفة وأكثر.</p>
            </div>
            {user && <Button data-testid="upload-book-btn" asChild className="rounded-xl bg-emerald-600 hover:bg-emerald-700"><Link to="/upload-book"><Upload className="w-4 h-4 ml-1" /> أضف كتاباً</Link></Button>}
          </div>
          <div className="mt-6 relative max-w-xl">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input data-testid="library-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالعنوان أو المؤلف…" className="pr-11 h-12 rounded-xl bg-white/95 text-slate-800 border-0" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCat("")} data-testid="cat-all" className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${!cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>الكل</button>
            {cats.map((c) => (
              <button key={c.slug} onClick={() => setCat(c.slug)} data-testid={`cat-${c.slug}`} className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${cat === c.slug ? "text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={cat === c.slug ? { background: c.color } : {}}>{c.name}</button>
            ))}
          </div>
          <select data-testid="sort-select" value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        {!data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{Array.from({ length: 10 }).map((_, i) => <div key={i}><Skeleton className="aspect-[3/4] rounded-2xl" /><Skeleton className="h-4 w-3/4 mt-2" /></div>)}</div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={BookOpen} title="لا توجد كتب" desc="جرّب تغيير التصنيف أو كلمات البحث" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">{data.items.map((b) => <BookCard key={b.id} b={b} />)}</div>
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl">السابق</Button>
                <span className="px-4 py-2 text-sm text-slate-500">{page} / {totalPages}</span>
                <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl">التالي</Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
