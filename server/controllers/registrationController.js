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

// GET /api/register/me
const getMyRegistrations = async (req, res) => {
  try {
    const reg = await Registration.findOne({ student: req.user.id }).populate("courses");
    res.json(reg?.courses || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerCourses, getMyRegistrations };
