import { useEffect, useState } from "react";
import { getCourses, registerCourses } from "../api";
import { CheckCircle2, XCircle, AlertTriangle, Trash2, GraduationCap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState([]);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'clash', message }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCourses().then((res) => setCourses(res.data));
  }, []);

  const toggleCourse = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.length === 0) return setStatus({ type: "error", message: "Select at least one course." });
    setLoading(true);
    setStatus(null);
    try {
      await registerCourses({ courseIds: selected });
      setStatus({ type: "success", message: "Registration successful! Check your schedule." });
      setSelected([]);
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed.";
      const clashes = err.response?.data?.clashes;
      setStatus({ type: clashes ? "clash" : "error", message: msg, clashes });
    } finally {
      setLoading(false);
    }
  };

  const selectedCourses = courses.filter((c) => selected.includes(c._id));
  const availableCourses = courses.filter((c) => c.enrolledSeats < c.totalSeats);

  return (
    <main className="max-w-5xl mx-auto px-4 pt-24 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Course Registration</h1>
        <p className="text-slate-400">Select courses below. Clashes and seat limits are validated automatically.</p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course selector */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-sm font-medium text-slate-300 mb-2">Available Courses</p>
          {availableCourses.length === 0 && (
            <div className="card text-slate-400 text-sm text-center py-8">No available courses.</div>
          )}
          {availableCourses.map((course) => {
            const isSelected = selected.includes(course._id);
            return (
              <div
                key={course._id}
                onClick={() => toggleCourse(course._id)}
                className={`card cursor-pointer transition-all duration-200 flex items-center gap-4 ${
                  isSelected ? "border-primary-600 bg-primary-900/20" : "hover:border-slate-600"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? "border-primary-500 bg-primary-500" : "border-slate-600"
                }`}>
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{course.code}</span>
                    <span className="font-medium text-white truncate">{course.name}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {course.schedule?.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join(" | ")} •{" "}
                    {course.enrolledSeats}/{course.totalSeats} seats
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary panel */}
        <div className="space-y-4">
          <div className="card border-primary-900/50 bg-primary-950/10">
            <div className="flex items-center gap-2 text-primary-400 font-semibold mb-1">
              <GraduationCap className="w-4 h-4" />
              <span>Student Profile</span>
            </div>
            <p className="text-white text-sm font-bold">{user?.name}</p>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">{user?.studentId}</p>
          </div>

          <div className="card">
            <p className="text-sm font-medium text-slate-300 mb-3">
              Selected ({selected.length})
            </p>
            {selectedCourses.length === 0 ? (
              <p className="text-xs text-slate-500">No courses selected yet.</p>
            ) : (
              <ul className="space-y-2">
                {selectedCourses.map((c) => (
                  <li key={c._id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 truncate">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleCourse(c._id)}
                      className="text-slate-500 hover:text-red-400 ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div className={`card text-sm flex flex-col gap-2 ${
              status.type === "success"
                ? "border-emerald-800 text-emerald-400"
                : status.type === "clash"
                ? "border-yellow-800 text-yellow-400"
                : "border-red-800 text-red-400"
            }`}>
              <div className="flex items-center gap-2">
                {status.type === "success" && <CheckCircle2 className="w-4 h-4" />}
                {status.type === "clash" && <AlertTriangle className="w-4 h-4" />}
                {status.type === "error" && <XCircle className="w-4 h-4" />}
                <span>{status.message}</span>
              </div>
              {status.clashes && (
                <ul className="ml-6 list-disc text-xs space-y-1">
                  {status.clashes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? "Registering..." : "Confirm Registration"}
          </button>
        </div>
      </form>
    </main>
  );
}
