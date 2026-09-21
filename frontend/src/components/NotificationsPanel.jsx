import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationsPanel({ onClose }) {
  const [items, setItems] = useState(null);
  const nav = useNavigate();

  const load = async () => {
    try { const { data } = await api.get("/notifications"); setItems(data); } catch { setItems([]); }
  };
  useEffect(() => { load(); }, []);

  const markAll = async () => { await api.post("/notifications/read-all"); load(); };
  const openItem = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id}/read`);
    if (n.link) { nav(n.link); onClose?.(); }
    else load();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div dir="rtl" className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:left-0 sm:right-auto sm:mt-2 w-auto sm:w-[360px] max-w-none bg-white rounded-2xl ft-shadow-lg border border-slate-200 z-50 overflow-hidden" data-testid="notifications-panel">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> الإشعارات</span>
          <Button variant="ghost" size="sm" data-testid="mark-all-read-btn" onClick={markAll} className="text-xs text-blue-600"><Check className="w-3.5 h-3.5 ml-1" />تعليم الكل كمقروء</Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {items === null ? (
            <div className="p-6 text-center text-slate-400 text-sm">جارٍ التحميل…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">لا توجد إشعارات بعد</div>
          ) : items.map((n) => (
            <button key={n.id} onClick={() => openItem(n)} className={`w-full text-right px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}>
              <div className="font-medium text-sm text-slate-800">{n.title}</div>
              {n.body && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</div>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
