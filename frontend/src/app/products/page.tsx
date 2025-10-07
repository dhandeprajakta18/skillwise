"use client";

import { useMemo, useRef, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Upload, Download, Search as SearchIcon, Edit3, Trash2, X, History } from "lucide-react";

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");

// -------- Types --------
type Product = {
  _id: string;
  name: string;
  unit: string;
  category: string;
  brand: string;
  stock: number;
  status: "In Stock" | "Out of Stock";
  image: string;
};
type HistoryItem = {
  _id: string;
  oldQuantity: number;
  newQuantity: number;
  date: string;
  user?: { id?: string; name?: string };
};

// -------- Helpers --------
const safeImage = (url?: string) => {
  const u = (url || "").trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : "";
};

// -------- Add Modal --------
function AddProductModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (body: Partial<Product>) => void;
}) {
  const [form, setForm] = useState<Partial<Product>>({
    name: "",
    unit: "pcs",
    category: "",
    brand: "",
    stock: 0,
    image: "",
  });

  const canSave = (form.name || "").trim().length > 0;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center" onClick={onClose}>
      <div
        className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-6 w-full max-w-lg relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="absolute right-3 top-3 text-gray-500 hover:text-gray-800" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-bold mb-6 text-indigo-600">➕ Add New Product</h3>

        <div className="grid grid-cols-2 gap-4">
          <input
            className="input col-span-2"
            placeholder="Product Name *"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input className="input" placeholder="Unit" value={form.unit || ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          <input className="input" placeholder="Category" value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <input className="input" placeholder="Brand" value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          <input
            className="input"
            type="number"
            min={0}
            placeholder="Stock"
            value={form.stock ?? 0}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value || 0) })}
          />
          <input
            className="input col-span-2"
            placeholder="Image URL (https://...)"
            value={form.image || ""}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-muted" onClick={onClose}>
            Cancel
          </button>
          <button
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 disabled:opacity-50"
            disabled={!canSave}
            onClick={() =>
              onCreate({
                name: (form.name || "").trim(),
                unit: (form.unit || "pcs").trim(),
                category: (form.category || "").trim(),
                brand: (form.brand || "").trim(),
                stock: Number(form.stock ?? 0),
                image: (form.image || "").trim(),
              })
            }
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// -------- Mobile Card (responsive) --------
function ProductCard({
  p,
  isEditing,
  editing,
  onChange,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onHistory,
}: {
  p: Product;
  isEditing: boolean;
  editing: Partial<Product>;
  onChange: (patch: Partial<Product>) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onHistory: () => void;
}) {
  const img = safeImage(p.image);
  return (
    <div className="md:hidden rounded-xl border bg-white shadow-sm p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-16 w-16 rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">
          {img ? (
            <img
              src={img}
              alt={p.name}
              className="h-full w-full object-cover"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <span className="text-[10px] text-gray-400">No img</span>
          )}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <input className="input w-full mb-1" value={editing.name ?? ""} onChange={(e) => onChange({ name: e.target.value })} />
          ) : (
            <div className="font-semibold">{p.name}</div>
          )}
          <div className="text-xs text-gray-500">{p.brand} • {p.category}</div>
          <div className="text-xs text-gray-500">Unit: {isEditing ? (
            <input className="input w-24 inline-block ml-1" value={editing.unit ?? ""} onChange={(e) => onChange({ unit: e.target.value })} />
          ) : p.unit}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm">Stock: {isEditing ? (
            <input type="number" className="input w-24 inline-block ml-1" value={editing.stock ?? 0} onChange={(e) => onChange({ stock: Number(e.target.value) })} />
          ) : p.stock}</div>
          <div className="mt-1">
            {p.status === "In Stock" ? (
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1">
                <span className="h-2 w-2 bg-green-600 rounded-full" />
                In Stock
              </span>
            ) : (
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1">
                <span className="h-2 w-2 bg-red-600 rounded-full" />
                Out of Stock
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={onSave} className="bg-indigo-500 text-white px-3 py-1 rounded-md">Save</button>
              <button onClick={onCancel} className="bg-gray-400 text-white px-3 py-1 rounded-md">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="btn-dark flex items-center gap-1 px-3 py-1">
                <Edit3 className="w-4 h-4" /> Edit
              </button>
              <button onClick={onDelete} className="bg-red-500 text-white px-3 py-1 rounded-md flex items-center gap-1">
                <Trash2 className="w-4 h-4" /> Del
              </button>
              <button onClick={onHistory} className="bg-emerald-500 text-white px-3 py-1 rounded-md flex items-center gap-1">
                <History className="w-4 h-4" /> Log
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -------- Main --------
export default function ProductsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Partial<Product>>({});
  const [selected, setSelected] = useState<Product | null>(null);

  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // ----- Queries -----
  const productsQ = useQuery({
    queryKey: ["products", { search, category, page, limit }],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/products`, { params: { name: search, category, page, limit } });
      if (Array.isArray(data)) {
        return { items: data as Product[], total: (data as Product[]).length, page: 1, limit: (data as Product[]).length || 10 };
      }
      return {
        items: Array.isArray(data.items) ? (data.items as Product[]) : [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 10,
      };
    },
    keepPreviousData: true,
  });

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/products/categories`);
      return Array.isArray(data) ? (data as string[]) : (data?.categories ?? []);
    },
  });

  const historyQ = useQuery({
    queryKey: ["history", selected?._id],
    enabled: !!selected?._id,
    queryFn: async () => (await axios.get(`${API}/products/${selected!._id}/history`)).data as HistoryItem[],
  });

  // ----- Mutations -----
  const createMut = useMutation({
    mutationFn: async (body: Partial<Product>) => (await axios.post(`${API}/products`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const updateMut = useMutation({
    mutationFn: async (input: Partial<Product> & { _id: string }) => {
      const { _id, ...body } = input;
      const { data } = await axios.put(`${API}/products/${_id}`, body, {
        headers: { "x-user-id": "demo", "x-user-name": "Prajakta" },
      });
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API}/products/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  const importMut = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await axios.post(`${API}/products/import`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data as { added: number; skipped: number; duplicates: Array<{ id: string; name: string }> };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });

  // ----- Handlers -----
  const exportCsv = () => window.open(`${API}/products/export`, "_blank");

  const addNew = async (body: Partial<Product>) => {
    await createMut.mutateAsync(body);
    setAddOpen(false);
  };

  const startEdit = (p: Product) => {
    setEditingId(p._id);
    setEditing(p);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateMut.mutateAsync({ ...(editing as Product), _id: editingId });
    setEditingId(null);
  };

  const chooseFile = () => fileRef.current?.click();

  const doImport = async () => {
    if (!file) return alert("Choose a CSV file first.");
    try {
      const res = await importMut.mutateAsync(file);
      alert(`Import complete.\nAdded: ${res.added}\nSkipped: ${res.skipped}`);
    } catch (e) {
      console.error(e);
      alert("Import failed. Check CSV headers and try again.");
    } finally {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const totalPages = useMemo(() => {
    if (!productsQ.data) return 1;
    return Math.max(1, Math.ceil(productsQ.data.total / productsQ.data.limit));
  }, [productsQ.data]);

  // ----- UI -----
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            📦 Products
          </h1>
          <div className="flex flex-wrap gap-2 md:gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button onClick={chooseFile} className="btn-muted flex items-center gap-2">
              <Upload className="w-4 h-4" /> Choose CSV
            </button>
            <button onClick={doImport} disabled={!file || importMut.isPending} className="btn-muted disabled:opacity-50">
              {importMut.isPending ? "Uploading…" : "Import"}
            </button>
            <button
              onClick={exportCsv}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => setAddOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:opacity-90 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Product
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-lg p-3 md:p-4 rounded-2xl shadow flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-full md:w-80">
            <SearchIcon className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search products…"
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="border rounded-lg px-3 py-2 shadow-sm w-full md:w-auto"
          >
            <option value="">All categories</option>
            {(categoriesQ.data ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 md:hidden">
          {(productsQ.data?.items ?? []).map((p) => {
            const isEditing = editingId === p._id;
            return (
              <ProductCard
                key={p._id}
                p={p}
                isEditing={isEditing}
                editing={isEditing ? editing : {}}
                onChange={(patch) => setEditing((s) => ({ ...s, ...patch }))}
                onEdit={() => {
                  setEditingId(p._id);
                  setEditing(p);
                }}
                onSave={saveEdit}
                onCancel={() => setEditingId(null)}
                onDelete={() => {
                  if (confirm("Delete this product?")) deleteMut.mutate(p._id);
                }}
                onHistory={() => setSelected(p)}
              />
            );
          })}
        </div>

        {/* Desktop table (with horizontal scroll) */}
        <div className="hidden md:block bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl overflow-x-auto">
          <table className="text-sm min-w-[1100px] w-full">
            <thead className="bg-indigo-50">
              <tr>
                {["Image", "Name", "Unit", "Category", "Brand", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-indigo-700 uppercase whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(productsQ.data?.items ?? []).map((p) => {
                const isEditing = editingId === p._id;
                const img = safeImage(p.image);

                return (
                  <tr key={p._id} className="hover:bg-indigo-50/50 transition">
                    {/* Image */}
                    <td className="px-6 py-3">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          className="h-12 w-12 rounded-xl border object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            const ph = document.createElement("div");
                            ph.className = "h-12 w-12 grid place-items-center rounded-xl border bg-gray-100 text-[10px] text-gray-400";
                            ph.textContent = "No img";
                            e.currentTarget.parentElement?.appendChild(ph);
                          }}
                        />
                      ) : (
                        <div className="h-12 w-12 grid place-items-center rounded-xl border bg-gray-100 text-[10px] text-gray-400">
                          No img
                        </div>
                      )}
                    </td>

                    {/* Name (history on click) */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input className="input w-40" value={editing.name ?? ""} onChange={(e) => setEditing((s) => ({ ...s, name: e.target.value }))} />
                      ) : (
                        <button className="text-indigo-600 hover:underline" onClick={() => setSelected(p)} title="View history">
                          {p.name}
                        </button>
                      )}
                    </td>

                    {/* Unit */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input className="input w-24" value={editing.unit ?? ""} onChange={(e) => setEditing((s) => ({ ...s, unit: e.target.value }))} />
                      ) : (
                        p.unit
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input className="input w-32" value={editing.category ?? ""} onChange={(e) => setEditing((s) => ({ ...s, category: e.target.value }))} />
                      ) : (
                        p.category
                      )}
                    </td>

                    {/* Brand */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input className="input w-32" value={editing.brand ?? ""} onChange={(e) => setEditing((s) => ({ ...s, brand: e.target.value }))} />
                      ) : (
                        p.brand
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-3">
                      {isEditing ? (
                        <input
                          type="number"
                          className="input w-24"
                          value={editing.stock ?? 0}
                          onChange={(e) => setEditing((s) => ({ ...s, stock: Number(e.target.value) }))}
                        />
                      ) : (
                        p.stock
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3 whitespace-nowrap">
                      {p.status === "In Stock" ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-2">
                          <span className="h-2 w-2 bg-green-600 rounded-full" />
                          In Stock
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-2">
                          <span className="h-2 w-2 bg-red-600 rounded-full" />
                          Out of Stock
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button onClick={saveEdit} className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600">
                            Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="bg-gray-400 text-white px-3 py-1 rounded-md hover:bg-gray-500">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(p)} className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600 flex items-center gap-1">
                            <Edit3 className="w-4 h-4" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Delete this product?")) deleteMut.mutate(p._id);
                            }}
                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Inventory History Sidebar */}
        {selected && (
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setSelected(null)} aria-hidden>
            <aside
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white/95 backdrop-blur-xl shadow-2xl p-6 rounded-l-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Inventory History"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">History — {selected.name}</h2>
                <button className="btn-muted" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>

              {historyQ.isLoading ? (
                <p className="text-sm text-gray-600">Loading…</p>
              ) : historyQ.data?.length ? (
                <ul className="space-y-3 overflow-y-auto pr-1 max-h-[80vh]">
                  {historyQ.data.map((h) => (
                    <li key={h._id} className="border p-3 rounded-xl bg-white">
                      <div className="text-sm">
                        {new Date(h.date).toLocaleString()} — {h.oldQuantity} → {h.newQuantity}
                      </div>
                      {h.user?.name && <div className="text-xs text-gray-600">by {h.user.name}</div>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-600">No history yet.</p>
              )}
            </aside>
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Total: {productsQ.data?.total ?? 0}</span>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Prev
            </button>
            <span>
              Page {page} / {totalPages}
            </span>
            <button className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} onCreate={addNew} />
    </div>
  );
}