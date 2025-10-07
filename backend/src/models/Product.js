import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, default: "" },
    category: { type: String, default: "" },
    brand: { type: String, default: "" },
    stock: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["In Stock", "Out of Stock"], default: "In Stock" },
    image: { type: String, default: "" }
  },
  { timestamps: true }
);

ProductSchema.pre("save", function (next) {
  this.status = this.stock > 0 ? "In Stock" : "Out of Stock";
  next();
});

export default mongoose.model("Product", ProductSchema);