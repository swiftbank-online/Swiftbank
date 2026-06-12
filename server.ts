import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middlewares
  app.use(express.json());

  // Cloudinary upload endpoint
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const stream = cloudinary.uploader.upload_stream(
        { folder: "swiftbank_profiles" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary error:", error);
            return res.status(500).json({ error: error.message || "Cloudinary upload failed" });
          }
          return res.json({ url: result?.secure_url });
        }
      );

      stream.end(req.file.buffer);
    } catch (err: any) {
      console.error("Server upload exception:", err);
      return res.status(500).json({ error: err.message || "Internal server upload exception" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
