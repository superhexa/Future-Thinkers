import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ft_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErr(e, fallback = "حدث خطأ ما، حاول مرة أخرى") {
  const d = e?.response?.data?.detail;
  if (d == null) return e?.message || fallback;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((x) => (x?.msg ? x.msg : JSON.stringify(x))).join(" ");
  if (d?.msg) return d.msg;
  return String(d);
}

export const fileUrl = (path) => (path?.startsWith("http") ? path : `${API}/files/${path}`);

export const wsUrl = (path) => {
  const base = process.env.REACT_APP_BACKEND_URL.replace(/^http/, "ws");
  const token = localStorage.getItem("ft_token") || "";
  return `${base}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
};

export default api;
export { API };
