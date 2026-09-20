import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { apiErr } from "@/lib/api";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", grade: "", section: "" });
  const [govs, setGovs] = useState([]);
  const [dirs, setDirs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [gov, setGov] = useState("");
  const [dir, setDir] = useState("");
  const [school, setSchool] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/geo/governorates").then((r) => setGovs(r.data)); }, []);
  useEffect(() => { if (gov) { api.get("/geo/directorates", { params: { governorate_id: gov } }).then((r) => setDirs(r.data)); setDir(""); setSchools([]); setSchool(""); } }, [gov]);
  useEffect(() => { if (dir) { api.get("/geo/schools", { params: { directorate_id: dir } }).then((r) => setSchools(r.data)); setSchool(""); } }, [dir]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.role === "student" && !school) { toast.error("يرجى اختيار المدرسة"); return; }
    setLoading(true);
    try {
      await register({ ...form, school_id: school || null });
      toast.success("تم إنشاء حسابك بنجاح!");
      nav("/dashboard");
    } catch (err) { toast.error(apiErr(err)); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6"><Link to="/"><Logo /></Link></div>
          <h2 className="font-head text-2xl font-bold text-slate-900">إنشاء حساب جديد</h2>
          <p className="text-slate-500 text-sm mt-1">انضم إلى مجتمع مفكري المستقبل</p>
          <form onSubmit={submit} className="mt-6 space-y-3.5">
            <div>
              <Label>الاسم الكامل</Label>
              <Input data-testid="reg-name" required value={form.name} onChange={(e) => set("name")(e.target.value)} className="mt-1.5 rounded-xl" placeholder="اسمك الكامل" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>البريد الإلكتروني</Label>
                <Input data-testid="reg-email" type="email" required value={form.email} onChange={(e) => set("email")(e.target.value)} className="mt-1.5 rounded-xl" placeholder="you@mail.com" />
              </div>
              <div>
                <Label>كلمة المرور</Label>
                <Input data-testid="reg-password" type="password" required value={form.password} onChange={(e) => set("password")(e.target.value)} className="mt-1.5 rounded-xl" placeholder="••••••" />
              </div>
            </div>
            <div>
              <Label>نوع الحساب</Label>
              <Select value={form.role} onValueChange={set("role")}>
                <SelectTrigger data-testid="reg-role" className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">طالب</SelectItem>
                  <SelectItem value="teacher">معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label>المحافظة</Label>
                <Select value={gov} onValueChange={setGov}>
                  <SelectTrigger data-testid="reg-governorate" className="mt-1.5 rounded-xl"><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                  <SelectContent>{govs.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>المديرية</Label>
                  <Select value={dir} onValueChange={setDir} disabled={!gov}>
                    <SelectTrigger data-testid="reg-directorate" className="mt-1.5 rounded-xl"><SelectValue placeholder="المديرية" /></SelectTrigger>
                    <SelectContent>{dirs.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>المدرسة</Label>
                  <Select value={school} onValueChange={setSchool} disabled={!dir}>
                    <SelectTrigger data-testid="reg-school" className="mt-1.5 rounded-xl"><SelectValue placeholder="المدرسة" /></SelectTrigger>
                    <SelectContent>{schools.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {form.role === "student" && (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>الصف</Label><Input data-testid="reg-grade" value={form.grade} onChange={(e) => set("grade")(e.target.value)} className="mt-1.5 rounded-xl" placeholder="مثال: العاشر" /></div>
                  <div><Label>الشعبة</Label><Input data-testid="reg-section" value={form.section} onChange={(e) => set("section")(e.target.value)} className="mt-1.5 rounded-xl" placeholder="أ" /></div>
                </div>
              )}
            </div>

            <Button type="submit" data-testid="reg-submit" disabled={loading} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الحساب"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-slate-500">لديك حساب؟ <Link to="/login" data-testid="go-login-link" className="text-blue-600 font-medium">سجّل الدخول</Link></p>
        </div>
      </div>

      <div className="hidden lg:flex ft-navy-gradient grain relative flex-col justify-center p-12 text-white overflow-hidden order-1 lg:order-2">
        <Link to="/" className="absolute top-12 right-12"><Logo dark /></Link>
        <h1 className="font-head text-4xl font-extrabold leading-tight">رحلتك المعرفية<br /><span className="text-emerald-400">تبدأ من هنا</span></h1>
        <p className="mt-4 text-slate-300 max-w-md">اقرأ، حاور، تنافس، وابتكر — مع نظام نقاط خبرة وإنجازات وقوائم صدارة على مستوى المملكة.</p>
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
