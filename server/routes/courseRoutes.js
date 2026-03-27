const express = require("express");
const { getCourses, createCourse } = require("../controllers/courseController");
const { getStudentsInCourse, addStudentToCourse, removeStudentFromCourse } = require("../controllers/registrationController");
const { auth, requireRole } = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, getCourses);
router.post("/", auth, requireRole("teacher"), createCourse);

// Student management (Teacher only)
router.get("/:id/students", auth, requireRole("teacher"), getStudentsInCourse);
router.post("/:id/students", auth, requireRole("teacher"), addStudentToCourse);
router.delete("/:id/students/:userId", auth, requireRole("teacher"), removeStudentFromCourse);

module.exports = router;
