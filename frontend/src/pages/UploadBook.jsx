import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Image } from "lucide-react";

export default function UploadBook() {
  const nav = useNavigate();
  const [cats, setCats] = useState([]);
  const [form, setForm] = useState({ title: "", author: "", description: "", category: "general", language: "العربية", pages: "", year: "", publisher: "", age: "عام", tags: "" });
  const [pdf, setPdf] = useState(null);
  const [cover, setCover] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/books/categories").then((r) => setCats(r.data)); }, []);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!pdf) return toast.error("يرجى اختيار ملف PDF");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("pdf", pdf);
    if (cover) fd.append("cover", cover);
    setLoading(true);
    try {
      await api.post("/books", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("تم رفع الكتاب! سيُراجع من قبل الإدارة قبل النشر.");
      nav("/library");
    } catch (err) { toast.error(apiErr(err)); } finally { setLoading(false); }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="font-head text-3xl font-extrabold text-slate-900">إضافة كتاب جديد</h1>
        <p className="text-slate-500 mt-2">سيمر الكتاب بمراجعة الإدارة (قيد المراجعة → موافقة/رفض) قبل نشره في المكتبة.</p>
        <form onSubmit={submit} className="mt-8 space-y-4 bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>عنوان الكتاب</Label><Input data-testid="book-title" required value={form.title} onChange={(e) => set("title")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
            <div><Label>المؤلف</Label><Input data-testid="book-author" required value={form.author} onChange={(e) => set("author")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <div><Label>الوصف</Label><Textarea data-testid="book-desc" value={form.description} onChange={(e) => set("description")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>التصنيف</Label>
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger data-testid="book-category" className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>الوسوم (مفصولة بفاصلة)</Label><Input data-testid="book-tags" value={form.tags} onChange={(e) => set("tags")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label>عدد الصفحات</Label><Input data-testid="book-pages" type="number" value={form.pages} onChange={(e) => set("pages")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
            <div><Label>سنة النشر</Label><Input data-testid="book-year" type="number" value={form.year} onChange={(e) => set("year")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
            <div><Label>الفئة العمرية</Label><Input data-testid="book-age" value={form.age} onChange={(e) => set("age")(e.target.value)} className="mt-1.5 rounded-xl" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
              <FileText className="w-6 h-6 mx-auto text-slate-400" />
              <div className="text-sm mt-1 text-slate-600">{pdf ? pdf.name : "ملف الكتاب (PDF)"}</div>
              <input data-testid="book-pdf" type="file" accept="application/pdf" className="hidden" onChange={(e) => setPdf(e.target.files[0])} />
            </label>
            <label className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 transition-colors">
              <Image className="w-6 h-6 mx-auto text-slate-400" />
              <div className="text-sm mt-1 text-slate-600">{cover ? cover.name : "صورة الغلاف (اختياري)"}</div>
              <input data-testid="book-cover" type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files[0])} />
            </label>
          </div>
          <Button type="submit" data-testid="submit-book-btn" disabled={loading} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4 ml-1" /> رفع الكتاب</>}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
