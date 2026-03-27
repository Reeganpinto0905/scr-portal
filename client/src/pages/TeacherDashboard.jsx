import { createCourse, getCourses, getCourseStudents, addStudentToCourse, removeStudentFromCourse } from "../api";
import { useAuth } from "../context/AuthContext";
import { PlusCircle, BookOpenCheck, Clock, Users, UserPlus, Trash2, X } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const emptySlot = () => ({ day: "Monday", startTime: "09:00", endTime: "10:00" });

const emptyForm = {
  name: "",
  code: "",
  credits: 3,
  totalSeats: 40,
  schedule: [emptySlot()],
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState("create"); // create | list
  const [managingCourse, setManagingCourse] = useState(null); // Course currently being managed
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [newStudentId, setNewStudentId] = useState("");
  const [mgmtStatus, setMgmtStatus] = useState(null);

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await getCourses();
      setCourses(res.data);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleTab = (t) => {
    setTab(t);
    if (t === "list") fetchCourses();
  };

  const updateSchedule = (i, field, value) => {
    setForm((f) => {
      const schedule = [...f.schedule];
      schedule[i] = { ...schedule[i], [field]: value };
      return { ...f, schedule };
    });
  };

  const addSlot = () => setForm((f) => ({ ...f, schedule: [...f.schedule, emptySlot()] }));
  const removeSlot = (i) =>
    setForm((f) => ({ ...f, schedule: f.schedule.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await createCourse(form);
      setStatus({ type: "success", message: `Course "${form.name}" created successfully!` });
      setForm(emptyForm);
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.message || "Failed to create course." });
    } finally {
      setSubmitting(false);
    }
  };

  const openStudentMgmt = async (course) => {
    setManagingCourse(course);
    setLoadingStudents(true);
    setMgmtStatus(null);
    setNewStudentId("");
    try {
      const res = await getCourseStudents(course._id);
      setStudents(res.data);
    } catch (err) {
      setMgmtStatus({ type: "error", message: "Failed to load students." });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentId.trim()) return;
    setSubmitting(true);
    setMgmtStatus(null);
    try {
      const res = await addStudentToCourse(managingCourse._id, newStudentId);
      setStudents((prev) => [...prev, res.data.student]);
      setNewStudentId("");
      setMgmtStatus({ type: "success", message: res.data.message });
      // Update local course seat count
      setCourses(prev => prev.map(c => c._id === managingCourse._id ? { ...c, enrolledSeats: c.enrolledSeats + 1 } : c));
    } catch (err) {
      setMgmtStatus({ type: "error", message: err.response?.data?.message || "Failed to add student." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (userId) => {
    if (!window.confirm("Are you sure you want to remove this student?")) return;
    try {
      await removeStudentFromCourse(managingCourse._id, userId);
      setStudents((prev) => prev.filter((s) => s._id !== userId));
      setMgmtStatus({ type: "success", message: "Student removed successfully." });
      // Update local course seat count
      setCourses(prev => prev.map(c => c._id === managingCourse._id ? { ...c, enrolledSeats: c.enrolledSeats - 1 } : c));
    } catch (err) {
      setMgmtStatus({ type: "error", message: "Failed to remove student." });
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Teacher Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome, {user?.name || user?.username}</p>
        </div>
        <span className="badge-green">Teacher</span>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 rounded-lg p-1 mb-6 w-fit">
        {[["create", "Create Course"], ["list", "All Courses"]].map(([t, label]) => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === t ? "bg-primary-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create Course Form */}
      {tab === "create" && (
        <form onSubmit={handleSubmit} className="card space-y-5">
          <div className="flex items-center gap-2 text-white font-semibold mb-2">
            <PlusCircle className="w-5 h-5 text-primary-500" />
            New Course
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Course Name</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Data Structures"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Course Code</label>
              <input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. CS201"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Credits</label>
              <input
                type="number" min={1} max={6}
                value={form.credits}
                onChange={(e) => setForm((f) => ({ ...f, credits: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Total Seats</label>
              <input
                type="number" min={1}
                value={form.totalSeats}
                onChange={(e) => setForm((f) => ({ ...f, totalSeats: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* Schedule slots */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Schedule</label>
              <button type="button" onClick={addSlot} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                <PlusCircle className="w-3 h-3" /> Add slot
              </button>
            </div>
            <div className="space-y-2">
              {form.schedule.map((slot, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 bg-slate-800 rounded-lg p-3 items-center">
                  <select
                    value={slot.day}
                    onChange={(e) => updateSchedule(i, "day", e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none"
                  >
                    {DAYS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <input type="time" value={slot.startTime}
                      onChange={(e) => updateSchedule(i, "startTime", e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="time" value={slot.endTime}
                      onChange={(e) => updateSchedule(i, "endTime", e.target.value)}
                      className="bg-slate-700 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none flex-1"
                    />
                    {form.schedule.length > 1 && (
                      <button type="button" onClick={() => removeSlot(i)} className="text-slate-600 hover:text-red-400 ml-1">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {status && (
            <p className={`text-sm px-3 py-2 rounded-lg border ${
              status.type === "success"
                ? "bg-emerald-900/20 border-emerald-800 text-emerald-400"
                : "bg-red-900/20 border-red-900 text-red-400"
            }`}>
              {status.message}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Creating..." : "Create Course"}
          </button>
        </form>
      )}

      {/* Course List */}
      {tab === "list" && (
        <div className="space-y-3">
          {loadingCourses && <p className="text-slate-400 animate-pulse">Loading...</p>}
          {!loadingCourses && courses.length === 0 && (
            <div className="card text-slate-400 text-center py-10">No courses yet. Create one!</div>
          )}
          {courses.map((c) => (
            <div key={c._id} className="card flex items-center gap-4">
              <BookOpenCheck className="w-5 h-5 text-primary-500 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">{c.code}</span>
                  <span className="font-medium text-white">{c.name}</span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {c.schedule?.map((s) => `${s.day} ${s.startTime}–${s.endTime}`).join(" | ")}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-1 text-sm text-slate-300">
                  <Users className="w-4 h-4 text-slate-500" />
                  {c.enrolledSeats}/{c.totalSeats}
                </div>
                <button
                  onClick={() => openStudentMgmt(c)}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium bg-primary-900/20 px-2 py-1 rounded"
                >
                  Manage Students
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Management Overlay / Modal */}
      {managingCourse && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="card w-full max-w-lg flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                <span>{managingCourse.code}: {managingCourse.name}</span>
              </h2>
              <button onClick={() => setManagingCourse(null)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="flex gap-2 mb-4">
              <input
                value={newStudentId}
                onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                placeholder="Enter Student ID (e.g. STU001)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
              <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-1 text-sm px-3">
                <UserPlus className="w-4 h-4" /> Add
              </button>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] border-t border-slate-800 pt-4">
              {loadingStudents ? (
                <p className="text-slate-500 text-center animate-pulse py-10">Loading students...</p>
              ) : students.length === 0 ? (
                <p className="text-slate-500 text-center py-10">No students enrolled yet.</p>
              ) : (
                students.map((student) => (
                  <div key={student._id} className="bg-slate-800/50 rounded-lg p-3 flex items-center justify-between border border-transparent hover:border-slate-700 transition-colors">
                    <div>
                      <p className="text-white text-sm font-medium">{student.name}</p>
                      <p className="text-slate-500 text-xs font-mono uppercase truncate max-w-[150px]">{student.studentId || "NO-ID"}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveStudent(student._id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {mgmtStatus && (
              <div className={`mt-4 p-2 text-xs rounded border ${
                mgmtStatus.type === "success" ? "bg-emerald-900/10 border-emerald-800 text-emerald-400" : "bg-red-900/10 border-red-900 text-red-400"
              }`}>
                {mgmtStatus.message}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
