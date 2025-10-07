import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import productsRouter from "./routes/products.js";

const app = express();

app.use(cors({
  origin: (process.env.FRONTEND_ORIGIN?.split(",") || true),
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization","x-user-id","x-user-name"],
  credentials: true,
  optionsSuccessStatus: 204,
}));


app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/products", productsRouter);

const PORT = process.env.PORT || 4000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => app.listen(PORT, () => console.log(`API running at http://localhost:${PORT}`)))
  .catch(err => {
    console.error("MongoDB connection error:", err?.message || err);
    process.exit(1);
  });