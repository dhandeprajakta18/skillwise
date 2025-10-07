import Product from "../models/Product.js";
import InventoryLog from "../models/InventoryLog.js";
import { parseCsvStream, writeCsvStream } from "../utils/csv.js";

export const getProducts = async (req, res) => {
  try {
    const {
      page = 1, limit = 10,
      sortBy = "createdAt", sortOrder = "desc",
      name = "", category = ""
    } = req.query;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip).limit(Number(limit)),
      Product.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getCategories = async (_req, res) => {
  const cats = await Product.distinct("category");
  res.json(cats.filter(Boolean).sort());
};

export const createProduct = async (req, res) => {
  try {
    const body = req.body;
    if (!body.name) return res.status(400).json({ message: "Name is required" });

    const exists = await Product.findOne({ name: body.name.trim() });
    if (exists) return res.status(409).json({ message: "Duplicate product name" });

    const product = await Product.create(body);
    res.status(201).json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (body.name) {
      const dup = await Product.findOne({ name: body.name.trim(), _id: { $ne: id } });
      if (dup) return res.status(409).json({ message: "Name must be unique" });
    }
    if (body.stock != null && isNaN(Number(body.stock))) {
      return res.status(400).json({ message: "Stock must be numeric" });
    }

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Not found" });

    const oldQty = product.stock;

    Object.assign(product, body);
    product.status = product.stock > 0 ? "In Stock" : "Out of Stock";
    await product.save();

    if (body.stock != null && Number(body.stock) !== oldQty) {
      await InventoryLog.create({
        product: product._id,
        oldQuantity: oldQty,
        newQuantity: Number(body.stock),
        user: { id: req.headers["x-user-id"] || "", name: req.headers["x-user-name"] || "" }
      });
    }

    res.json(product);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const getHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await InventoryLog.find({ product: id }).sort({ date: -1 }).limit(200);
    res.json(logs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const importCsv = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const rows = await parseCsvStream(req.file.path);
    let added = 0;
    const duplicates = [];

    for (const r of rows) {
      const item = {
        name: r.name?.trim(),
        unit: r.unit || "",
        category: r.category || "",
        brand: r.brand || "",
        stock: Number(r.stock || 0),
        status: r.status || undefined,
        image: r.image || ""
      };
      if (!item.name) continue;

      const exists = await Product.findOne({ name: item.name });
      if (exists) {
        duplicates.push({ id: exists._id, name: exists.name });
        continue;
      }
      await Product.create(item);
      added++;
    }

    res.json({ added, skipped: duplicates.length, duplicates });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const exportCsv = async (_req, res) => {
  try {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="products.csv"');

    const cursor = Product.find().cursor();
    await writeCsvStream(res, cursor);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await Product.findByIdAndDelete(id);
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};