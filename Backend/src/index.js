import express from "express";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./db/db.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import chapterRoutes from "./routes/chapter.routes.js";
import testRoutes from "./routes/test.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// ===== Routes =====
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve Google Client ID to frontend (safe — Client ID is public in OAuth)
app.get("/config/google-client-id", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(404).json({ error: "Google Client ID not configured" });
  }
  res.json({ clientId });
});

app.use(authRoutes);
app.use(chapterRoutes);
app.use(testRoutes);

// ===== Global Error Handler =====
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

// ===== Start Server (DB first, then listen) =====
const port = process.env.PORT || process.env.port || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server is live on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
