import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("scr_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const login = (data) => api.post("/auth/login", data);
export const signup = (data) => api.post("/auth/signup", data);

// Courses
export const getCourses = () => api.get("/courses");
export const createCourse = (data) => api.post("/courses", data);
export const updateCourse = (id, data) => api.put(`/courses/${id}`, data);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);

export const getCourseStudents = (id) => api.get(`/courses/${id}/students`);
export const addStudentToCourse = (id, studentId) => api.post(`/courses/${id}/students`, { studentId });
export const removeStudentFromCourse = (id, userId) => api.delete(`/courses/${id}/students/${userId}`);

// Registration
export const registerCourses = (data) => api.post("/register", data);
export const getMyRegistrations = () => api.get("/register/me");

export default api;
