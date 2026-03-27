import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { GraduationCap, BookOpenCheck, Eye, EyeOff } from "lucide-react";
import { login, signup } from "../api";
import { useAuth } from "../context/AuthContext";

const ROLES = [
  { value: "student", label: "Student", icon: <GraduationCap className="w-5 h-5" />, desc: "Register for courses" },
  { value: "teacher", label: "Teacher", icon: <BookOpenCheck className="w-5 h-5" />, desc: "Manage & create courses" },
];

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | signup
  const [role, setRole] = useState("student");
  const [form, setForm] = useState({ name: "", username: "", password: "", studentId: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || (role === "teacher" ? "/teacher" : "/courses");

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = mode === "signup"
        ? { name: form.name, username: form.username, password: form.password, role, studentId: role === "student" ? form.studentId : undefined }
        : { username: form.username, password: form.password };
      const apiFn = mode === "signup" ? signup : login;
      const res = await apiFn(payload);
      setAuth(res.data.token, res.data.user);
      navigate(res.data.user.role === "teacher" ? "/teacher" : from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-white mb-2">
            <GraduationCap className="w-7 h-7 text-primary-500" />
            SCR Portal
          </div>
          <p className="text-slate-400 text-sm">Smart Course Registration</p>
        </div>

        <div className="card">
          {/* Mode toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1 mb-6">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  mode === m ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Role selector - Only during signup */}
          {mode === "signup" && (
            <div className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">I am a</p>
              <div className="grid grid-cols-2 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-sm ${
                      role === r.value
                        ? "border-primary-600 bg-primary-900/30 text-primary-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {r.icon}
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-slate-500">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>
            )}

            {mode === "signup" && role === "student" && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Student ID</label>
                <input
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  placeholder="e.g. STU2024001"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600 uppercase"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {mode === "login" ? "Username" : role === "student" ? "Username / Email" : "Username"}
              </label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder={mode === "login" ? "Enter your username" : role === "student" ? "e.g. john.doe" : "e.g. prof.smith"}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-900 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
