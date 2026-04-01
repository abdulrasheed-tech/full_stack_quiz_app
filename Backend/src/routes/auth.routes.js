import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/user.model.js";

const router = Router();

// ===== SIGNUP =====
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Input validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    // Duplicate check
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword });

    res.status(201).json({
      message: "Signup successful",
      _id: user._id,
      name: user.name,
    });
  } catch (err) {
    next(err);
  }
});

// ===== LOGIN =====
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // If user signed up with Google, they don't have a password
    if (user.authProvider === "google" && !user.password) {
      return res.status(401).json({ error: "This account uses Google Sign-In. Please sign in with Google." });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.json({
      message: "Login success",
      _id: user._id,
      name: user.name,
    });
  } catch (err) {
    next(err);
  }
});

// ===== GOOGLE AUTH =====
router.post("/auth/google", async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: "Google credential is required" });
    }

    // Verify the Google ID token using Google's tokeninfo endpoint
    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!verifyRes.ok) {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    const payload = await verifyRes.json();

    // Validate the token
    if (!payload.email || !payload.sub) {
      return res.status(401).json({ error: "Invalid Google token payload" });
    }

    const { email, name, sub: googleId } = payload;

    // Upsert user: find by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      // Link Google ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = "google";
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
        googleId,
        authProvider: "google",
      });
    }

    res.json({
      message: "Google auth success",
      _id: user._id,
      name: user.name,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
