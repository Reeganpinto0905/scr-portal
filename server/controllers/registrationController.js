const Course = require("../models/Course");
const Registration = require("../models/Registration");

/**
 * Convert "HH:MM" to total minutes for easy comparison
 */
const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Check if two schedule slots overlap on the same day
 */
const slotsClash = (a, b) => {
  if (a.day !== b.day) return false;
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  // Overlap when one starts before the other ends
  return aStart < bEnd && bStart < aEnd;
};

/**
 * Detect clashes across a list of courses.
 * Returns array of human-readable clash descriptions.
 */
const detectClashes = (courses) => {
  const clashes = [];
  for (let i = 0; i < courses.length; i++) {
    for (let j = i + 1; j < courses.length; j++) {
      const a = courses[i];
      const b = courses[j];
      for (const sa of a.schedule) {
        for (const sb of b.schedule) {
          if (slotsClash(sa, sb)) {
            clashes.push(
              `"${a.name}" (${sa.day} ${sa.startTime}–${sa.endTime}) clashes with "${b.name}" (${sb.day} ${sb.startTime}–${sb.endTime})`
            );
          }
        }
      }
    }
  }
  return clashes;
};

// POST /api/register
const registerCourses = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseIds } = req.body;

    if (!courseIds || courseIds.length === 0) {
      return res.status(400).json({ message: "Select at least one course." });
    }

    // Fetch all requested courses
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (courses.length !== courseIds.length) {
      return res.status(400).json({ message: "One or more course IDs are invalid." });
    }

    // Check seat availability
    const full = courses.filter((c) => c.enrolledSeats >= c.totalSeats);
    if (full.length > 0) {
      return res.status(400).json({
        message: `No seats available in: ${full.map((c) => c.name).join(", ")}`,
      });
    }

    // Clash detection
    const clashes = detectClashes(courses);
    if (clashes.length > 0) {
      return res.status(400).json({ message: "Schedule clashes detected.", clashes });
    }

    // Check if student already has a registration
    const existing = await Registration.findOne({ student: studentId }).populate("courses");
    if (existing) {
      // Check for already-registered courses
      const duplicates = courses.filter((c) =>
        existing.courses.some((ec) => ec._id.equals(c._id))
      );
      if (duplicates.length > 0) {
        return res.status(400).json({
          message: `You are already registered for: ${duplicates.map((c) => c.name).join(", ")}`,
        });
      }

      // Merge with already-registered courses for clash check
      const merged = [...existing.courses, ...courses];
      const mergedClashes = detectClashes(merged);
      if (mergedClashes.length > 0) {
        return res.status(400).json({
          message: "New courses clash with already-registered courses.",
          clashes: mergedClashes,
        });
      }
      // Append new courses
      existing.courses.push(...courseIds);
      await existing.save();
    } else {
      await Registration.create({ student: studentId, courses: courseIds });
    }

    // Increment enrolled seats
    await Course.updateMany(
      { _id: { $in: courseIds } },
      { $inc: { enrolledSeats: 1 } }
    );

    res.status(201).json({ message: "Registration successful." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /api/courses/:id/students (Teacher only)
 * Get all students registered for a course
 */
const getStudentsInCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const registrations = await Registration.find({ courses: courseId }).populate("student", "name username studentId");
    const students = registrations.map((r) => r.student);
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * POST /api/courses/:id/students (Teacher only)
 * Add a student to a course by their studentId
 */
const addStudentToCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const { studentId } = req.body; // Explicit Student ID (e.g. STU001)

    if (!studentId) return res.status(400).json({ message: "Student ID required." });

    const student = await User.findOne({ studentId: studentId.toUpperCase(), role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found." });

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found." });

    if (course.enrolledSeats >= course.totalSeats) {
      return res.status(400).json({ message: "Course is already full." });
    }

    let registration = await Registration.findOne({ student: student._id }).populate("courses");
    if (registration) {
      if (registration.courses.some((c) => c._id.equals(courseId))) {
        return res.status(400).json({ message: "Student is already registered for this course." });
      }
      
      // Check for clashes
      const merged = [...registration.courses, course];
      const clashes = detectClashes(merged);
      if (clashes.length > 0) {
        return res.status(400).json({ message: "Student have a schedule clash with this course.", clashes });
      }

      registration.courses.push(courseId);
      await registration.save();
    } else {
      await Registration.create({ student: student._id, courses: [courseId] });
    }

    course.enrolledSeats += 1;
    await course.save();

    res.json({ message: "Student added successfully.", student: { _id: student._id, name: student.name, studentId: student.studentId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * DELETE /api/courses/:id/students/:userId (Teacher only)
 * Remove a student from a course
 */
const removeStudentFromCourse = async (req, res) => {
  try {
    const { id: courseId, userId } = req.params;

    const registration = await Registration.findOne({ student: userId });
    if (!registration || !registration.courses.includes(courseId)) {
      return res.status(404).json({ message: "Student is not registered for this course." });
    }

    registration.courses = registration.courses.filter((c) => c.toString() !== courseId);
    await registration.save();

    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledSeats: -1 } });

    res.json({ message: "Student removed successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerCourses, getMyRegistrations, getStudentsInCourse, addStudentToCourse, removeStudentFromCourse };
