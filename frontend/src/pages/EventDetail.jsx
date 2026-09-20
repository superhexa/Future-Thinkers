import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, PageLoader } from "@/components/Layout";
import api, { fileUrl, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, MapPin, Users, Globe, ArrowRight, Building2, QrCode, CheckCircle2 } from "lucide-react";

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [e, setE] = useState(null);

  const load = async () => { try { const { data } = await api.get(`/events/${id}`); setE(data); } catch { nav("/events"); } };
  useEffect(() => { load(); }, [id]);

  const register = async () => {
    if (!user) return nav("/login");
    try { const { data } = await api.post(`/events/${id}/register`); toast.success(data.waitlist ? "أُضفت لقائمة الانتظار" : "تم تسجيلك بنجاح!"); load(); }
    catch (err) { toast.error(apiErr(err)); }
  };
  const unregister = async () => { await api.post(`/events/${id}/unregister`); toast.info("ألغيت تسجيلك"); load(); };

  if (!e) return <Layout><PageLoader /></Layout>;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => nav(-1)} className="text-slate-500 hover:text-slate-800 text-sm mb-5 flex items-center gap-1"><ArrowRight className="w-4 h-4" /> رجوع</button>
        <div className="rounded-3xl overflow-hidden ft-shadow-lg">
          <div className="h-56 bg-gradient-to-br from-blue-600 to-emerald-600">
            {e.cover_url && <img src={fileUrl(e.cover_url)} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="bg-white p-8">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700">{e.scope === "national" ? "وطنية" : e.scope === "directorate" ? "مديرية" : "مدرسة"}</span>
                <h1 className="font-head text-3xl font-extrabold text-slate-900 mt-3">{e.title}</h1>
                <p className="text-slate-500 mt-1">تنظيم: {e.organizer}</p>
              </div>
              {e.is_registered ? (
                <Button data-testid="unregister-event-btn" onClick={unregister} variant="outline" className="rounded-xl h-11">إلغاء التسجيل</Button>
              ) : (
                <Button data-testid="register-event-btn" onClick={register} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11">سجّل الآن</Button>
              )}
            </div>
            <p className="mt-5 text-slate-700 leading-relaxed">{e.description}</p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <Info icon={Calendar} label="التاريخ والوقت" value={`${e.date} ${e.time}`} />
              <Info icon={e.mode === "online" ? Globe : MapPin} label="المكان" value={e.mode === "online" ? "عن بُعد (أونلاين)" : e.location || "حضوري"} />
              <Info icon={Users} label="المقاعد" value={`${e.registered_count} / ${e.capacity}`} />
              <Info icon={Building2} label="الفئة المستهدفة" value={e.audience} />
            </div>
            {e.is_registered && e.qr_code && (
              <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
                <div className="w-20 h-20 bg-white rounded-xl grid place-items-center ft-shadow"><QrCode className="w-12 h-12 text-slate-800" /></div>
                <div>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> رمز الحضور الخاص بك</div>
                  <div className="font-mono text-lg tracking-widest text-blue-700 mt-1">{e.qr_code}</div>
                  <div className="text-xs text-slate-400 mt-1">{e.checked_in ? "تم تسجيل حضورك ✓" : "أظهر هذا الرمز عند الدخول"}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

const Info = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100">
    <div className="w-10 h-10 rounded-xl bg-white grid place-items-center ft-shadow"><Icon className="w-5 h-5 text-blue-600" /></div>
    <div><div className="text-xs text-slate-400">{label}</div><div className="font-semibold text-slate-800 text-sm">{value}</div></div>
  </div>
);
