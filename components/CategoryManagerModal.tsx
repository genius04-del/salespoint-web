"use client";

import { useState } from "react";
import { X, Plus, CircleAlert, Pencil, Check } from "lucide-react";
import type { Category } from "@/lib/types";
import { createCategory, updateCategory, deleteCategory } from "@/lib/api/products";
import { ApiError } from "@/lib/apiClient";

interface CategoryManagerModalProps {
  categories: Category[];
  onClose: () => void;
  onChanged: () => void; // caller re-fetches the category list after any change
}

export function CategoryManagerModal({ categories, onClose, onChanged }: CategoryManagerModalProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createCategory({ name: newName.trim() });
      setNewName("");
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add category.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    setError(null);
    try {
      await updateCategory(id, { name: editingName.trim() });
      setEditingId(null);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename category.");
    }
  }

  async function handleDeactivate(category: Category) {
    setError(null);
    try {
      // A category with products attached can't be hard-deleted on the
      // backend — try a real delete first, and fall back to deactivating
      // (isActive: false) if the backend rejects it for that reason.
      await deleteCategory(category.id);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        try {
          await updateCategory(category.id, { isActive: false });
          onChanged();
        } catch (err2) {
          setError(err2 instanceof ApiError ? err2.message : "Could not update category.");
        }
      } else {
        setError(err instanceof ApiError ? err.message : "Could not remove category.");
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary-navy">Categories</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category name"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus size={16} />
            Add
          </button>
        </form>

        <ul className="divide-y divide-gray-100">
          {categories.length === 0 && (
            <li className="py-6 text-center text-sm text-gray-400">No categories yet.</li>
          )}
          {categories.map((category) => (
            <li key={category.id} className="flex items-center justify-between py-2.5">
              {editingId === category.id ? (
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename(category.id)}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-orange"
                />
              ) : (
                <span className={`text-sm ${category.isActive ? "text-gray-800" : "text-gray-400 line-through"}`}>
                  {category.name}
                </span>
              )}

              <div className="flex items-center gap-1">
                {editingId === category.id ? (
                  <button
                    onClick={() => handleRename(category.id)}
                    className="rounded p-1.5 text-success hover:bg-success/10"
                    aria-label="Save"
                  >
                    <Check size={16} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                    }}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                )}
                {category.isActive && (
                  <button
                    onClick={() => handleDeactivate(category)}
                    className="rounded p-1.5 text-gray-400 hover:bg-danger/10 hover:text-danger"
                    aria-label="Remove"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
