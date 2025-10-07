import { Router } from "express";
import multer from "multer";
import {
  getProducts,
  getCategories,
  createProduct,
  updateProduct,
  getHistory,
  importCsv,
  exportCsv,
  deleteProduct, // make sure this exists in your controller
} from "../controllers/productsController.js";

const router = Router();               // <-- define router FIRST
const upload = multer({ dest: "uploads/" });

// List + filters + pagination
router.get("/", getProducts);
router.get("/categories", getCategories);

// CRUD
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);

// History
router.get("/:id/history", getHistory);

// Import/Export
router.post("/import", upload.single("file"), importCsv);
router.get("/export", exportCsv);

// backend/src/routes/products.js
router.get("/", getProducts);
router.get("/search", getProducts); // alias to match spec wording

export default router;