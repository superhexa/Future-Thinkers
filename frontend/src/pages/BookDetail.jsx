import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Star, Heart, BookOpen, ArrowRight, Eye, Download, Maximize2, X, Check } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function Reader({ book, onClose, onProgress }) {
  const [percent, setPercent] = useState(book.my_progress || 0);
  const save = async (p) => { setPercent(p); await onProgress(p); };
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900 flex flex-col" data-testid="pdf-reader">
      <div className="h-14 flex items-center justify-between px-4 bg-slate-800 text-white">
        <div className="font-semibold line-clamp-1">{book.title}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">تقدم القراءة: {Math.round(percent)}%</span>
          <Button size="sm" variant="secondary" data-testid="reader-mark-btn" onClick={() => save(Math.min(100, percent + 25))} className="rounded-lg"><Check className="w-4 h-4 ml-1" />+25%</Button>
          <Button size="sm" variant="secondary" data-testid="reader-complete-btn" onClick={() => save(100)} className="rounded-lg">أكملت الكتاب</Button>
          <Button size="icon" variant="ghost" data-testid="reader-close-btn" onClick={onClose} className="text-white"><X className="w-5 h-5" /></Button>
        </div>
      </div>
      <div className="flex-1 bg-slate-700">
        <iframe title={book.title} src={book.pdf_url} className="w-full h-full" />
      </div>
      <div className="h-2 bg-slate-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export default function BookDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reading, setReading] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const load = async () => {
    const [b, r] = await Promise.all([api.get(`/books/${id}`), api.get(`/books/${id}/reviews`)]);
    setBook(b.data); setReviews(r.data);
  };
  useEffect(() => { load(); }, [id]);

  const toggleFav = async () => {
    if (!user) return nav("/login");
    const { data } = await api.post(`/books/${id}/favorite`);
    setBook((b) => ({ ...b, is_favorite: data.favorite, favorites_count: b.favorites_count + (data.favorite ? 1 : -1) }));
  };

  const saveProgress = async (percent) => {
    await api.post(`/books/${id}/progress`, { page: 1, percent });
    setBook((b) => ({ ...b, my_progress: percent }));
    if (percent >= 100) toast.success("أكملت الكتاب! +نقاط خبرة 🎉");
  };

  const submitReview = async () => {
    if (!rating) return toast.error("اختر تقييماً");
    try { await api.post(`/books/${id}/review`, { rating, text: reviewText }); toast.success("شكراً لتقييمك"); setReviewText(""); setRating(0); load(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  if (!book) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => nav(-1)} className="text-slate-500 hover:text-slate-800 text-sm mb-6 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          <div>
            <img src={fileUrl(book.cover_url)} alt={book.title} className="w-full aspect-[3/4] object-cover rounded-3xl ft-shadow-lg" />
            <div className="mt-4 space-y-2">
              <Button data-testid="read-book-btn" onClick={() => (user ? setReading(true) : nav("/login"))} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11"><BookOpen className="w-4 h-4 ml-1" /> {book.my_progress > 0 ? "متابعة القراءة" : "اقرأ الآن"}</Button>
              <Button data-testid="favorite-btn" onClick={toggleFav} variant="outline" className="w-full rounded-xl h-11"><Heart className={`w-4 h-4 ml-1 ${book.is_favorite ? "fill-rose-500 text-rose-500" : ""}`} /> {book.is_favorite ? "في المفضلة" : "أضف للمفضلة"}</Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 w-fit px-3 py-1 rounded-full mb-3">{book.category}</div>
            <h1 className="font-head text-3xl font-extrabold text-slate-900">{book.title}</h1>
            <p className="text-slate-500 mt-1">تأليف: {book.author}</p>
            <div className="flex items-center gap-5 mt-4 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-500 fill-amber-500" />{book.rating_avg || "—"} ({book.rating_count})</span>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{book.views} قراءة</span>
              <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{book.favorites_count}</span>
            </div>
            <p className="mt-5 text-slate-700 leading-relaxed">{book.description}</p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[["الصفحات", book.pages || "—"], ["سنة النشر", book.year || "—"], ["اللغة", book.language], ["الفئة", book.age]].map(([k, v]) => (
                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100"><div className="text-slate-400 text-xs">{k}</div><div className="font-semibold text-slate-800">{v}</div></div>
              ))}
            </div>

            {/* Reviews */}
            <div className="mt-10">
              <h2 className="font-head font-bold text-xl mb-4">التقييمات والمراجعات</h2>
              {user && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-5">
                  <div className="flex items-center gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => <button key={s} data-testid={`rate-star-${s}`} onClick={() => setRating(s)}><Star className={`w-6 h-6 ${s <= rating ? "text-amber-500 fill-amber-500" : "text-slate-300"}`} /></button>)}
                  </div>
                  <Textarea data-testid="review-text" value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="شاركنا رأيك في الكتاب…" className="rounded-xl bg-white" />
                  <Button data-testid="submit-review-btn" onClick={submitReview} className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700">أرسل التقييم</Button>
                </div>
              )}
              {reviews.length === 0 ? <p className="text-slate-400 text-sm">لا توجد مراجعات بعد. كن أول المقيّمين!</p> : (
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="flex gap-3">
                      <Avatar className="w-9 h-9"><AvatarFallback className="bg-slate-200 text-slate-600 text-xs">{r.user_name?.[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><span className="font-semibold text-sm text-slate-800">{r.user_name}</span><span className="flex">{[1,2,3,4,5].map((s)=><Star key={s} className={`w-3.5 h-3.5 ${s<=r.rating?"text-amber-500 fill-amber-500":"text-slate-200"}`}/>)}</span></div>
                        {r.text && <p className="text-sm text-slate-600 mt-1">{r.text}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {reading && <Reader book={book} onClose={() => setReading(false)} onProgress={saveProgress} />}
    </Layout>
  );
}
