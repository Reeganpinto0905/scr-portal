const User = require("../models/User");
const jwt = require("jsonwebtoken");

const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, name: user.name, role: user.role, studentId: user.studentId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

// POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const { name, username, password, role, studentId } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    if (role === "student" && !studentId) {
      return res.status(400).json({ message: "Student ID is required." });
    }
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(409).json({ message: "Username already taken." });

    if (studentId) {
      const idExists = await User.findOne({ studentId: studentId.toUpperCase() });
      if (idExists) return res.status(409).json({ message: "Student ID already exists." });
    }

    const user = await User.create({ name, username, password, role: role || "student", studentId });
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, username: user.username, role: user.role, studentId: user.studentId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required." });
    }
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials." });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, username: user.username, role: user.role, studentId: user.studentId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { signup, login };
