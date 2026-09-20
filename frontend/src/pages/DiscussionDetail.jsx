import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Heart, MessageSquare, Bell, Trash2, ArrowRight, Flag } from "lucide-react";

export default function DiscussionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [d, setD] = useState(null);
  const [reply, setReply] = useState("");

  const load = async () => { try { const { data } = await api.get(`/discussions/${id}`); setD(data); } catch { toast.error("النقاش غير موجود"); nav("/clubs/dialogue"); } };
  useEffect(() => { load(); }, [id]);

  const likeDisc = async () => { if (!user) return nav("/login"); const { data } = await api.post(`/discussions/${id}/like`); setD((x) => ({ ...x, liked: data.liked, likes_count: x.likes_count + (data.liked ? 1 : -1) })); };
  const follow = async () => { if (!user) return nav("/login"); const { data } = await api.post(`/discussions/${id}/follow`); setD((x) => ({ ...x, following: data.following })); toast.success(data.following ? "تتابع النقاش" : "ألغيت المتابعة"); };
  const likeReply = async (rid) => { if (!user) return nav("/login"); const { data } = await api.post(`/replies/${rid}/like`); setD((x) => ({ ...x, replies: x.replies.map((r) => r.id === rid ? { ...r, liked: data.liked, likes_count: r.likes_count + (data.liked ? 1 : -1) } : r) })); };
  const submitReply = async () => { if (!user) return nav("/login"); if (!reply.trim()) return; try { await api.post(`/discussions/${id}/reply`, { body: reply }); setReply(""); load(); } catch (e) { toast.error(apiErr(e)); } };
  const del = async () => { await api.delete(`/discussions/${id}`); toast.success("تم الحذف"); nav("/clubs/dialogue"); };
  const report = async () => { await api.post("/reports", { entity_type: "discussion", entity_id: id, reason: "محتوى غير لائق" }); toast.success("تم إرسال البلاغ للمراجعة"); };

  if (!d) return <Layout><PageLoader /></Layout>;
  const canDelete = user && (user.id === d.author_id || user.permissions?.includes("discussion.moderate"));

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => nav(-1)} className="text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 ft-shadow">
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{d.category}</span>
          <h1 className="font-head text-2xl font-extrabold text-slate-900 mt-3">{d.title}</h1>
          <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
            <Avatar className="w-7 h-7"><AvatarFallback className="bg-slate-200 text-xs">{d.author_name?.[0]}</AvatarFallback></Avatar>
            {d.author_name} · {d.author_school || "—"}
          </div>
          <p className="mt-4 text-slate-700 leading-relaxed whitespace-pre-wrap">{d.body}</p>
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <Button size="sm" data-testid="like-disc-btn" onClick={likeDisc} variant={d.liked ? "default" : "outline"} className={`rounded-xl ${d.liked ? "bg-rose-600 hover:bg-rose-700" : ""}`}><Heart className={`w-4 h-4 ml-1 ${d.liked ? "fill-white" : ""}`} />{d.likes_count}</Button>
            <Button size="sm" data-testid="follow-disc-btn" onClick={follow} variant="outline" className="rounded-xl"><Bell className={`w-4 h-4 ml-1 ${d.following ? "fill-amber-400 text-amber-500" : ""}`} />{d.following ? "متابَع" : "متابعة"}</Button>
            <Button size="sm" onClick={report} variant="ghost" className="rounded-xl text-slate-400"><Flag className="w-4 h-4 ml-1" />إبلاغ</Button>
            {canDelete && <Button size="sm" data-testid="delete-disc-btn" onClick={del} variant="ghost" className="rounded-xl text-rose-500"><Trash2 className="w-4 h-4 ml-1" />حذف</Button>}
          </div>
        </div>

        <h2 className="font-head font-bold text-lg mt-8 mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-600" /> الردود ({d.replies.length})</h2>
        {user && (
          <div className="bg-white rounded-2xl p-4 border border-slate-100 ft-shadow mb-5">
            <Textarea data-testid="reply-text" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="أضف رداً…" className="rounded-xl" />
            <Button data-testid="reply-submit" onClick={submitReply} className="mt-3 rounded-xl bg-blue-600 hover:bg-blue-700">إرسال الرد</Button>
          </div>
        )}
        <div className="space-y-3">
          {d.replies.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 text-sm">
                <Avatar className="w-7 h-7"><AvatarFallback className="bg-slate-200 text-xs">{r.author_name?.[0]}</AvatarFallback></Avatar>
                <span className="font-semibold text-slate-800">{r.author_name}</span>
                <span className="text-slate-400 text-xs">{r.author_school}</span>
              </div>
              <p className="mt-2 text-slate-700 leading-relaxed whitespace-pre-wrap">{r.body}</p>
              <button data-testid={`like-reply-${r.id}`} onClick={() => likeReply(r.id)} className={`mt-2 text-xs flex items-center gap-1 ${r.liked ? "text-rose-600" : "text-slate-400"}`}><Heart className={`w-3.5 h-3.5 ${r.liked ? "fill-rose-600" : ""}`} />{r.likes_count}</button>
            </div>
          ))}
          {d.replies.length === 0 && <p className="text-slate-400 text-sm text-center py-4">كن أول من يرد على هذا النقاش</p>}
        </div>
      </div>
    </Layout>
  );
}
