import mongoose from "mongoose";

const InventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    user: { id: { type: String, default: "" }, name: { type: String, default: "" } },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("InventoryLog", InventoryLogSchema);