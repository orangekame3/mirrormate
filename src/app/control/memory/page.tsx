"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Memory {
  id: string;
  kind: "profile" | "episode" | "knowledge";
  title: string;
  content: string;
  tags: string[];
  importance: number;
  status: "active" | "archived" | "deleted";
  source: "manual" | "extracted";
  createdAt: string;
  updatedAt: string;
}

type FilterKind = "all" | "profile" | "episode" | "knowledge";
type FilterStatus = "active" | "archived";

const KIND_LABELS: Record<string, string> = {
  profile: "Profile",
  episode: "Episode",
  knowledge: "Knowledge",
};

const KIND_COLORS: Record<string, string> = {
  profile: "bg-purple-500/20 text-purple-400",
  episode: "bg-blue-500/20 text-blue-400",
  knowledge: "bg-green-500/20 text-green-400",
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("active");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterKind !== "all") {
        params.set("kind", filterKind);
      }
      params.set("status", filterStatus);

      const res = await fetch(`/api/memories?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setMemories(data.memories);
    } catch (err) {
      setError("Failed to load memories");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [filterKind, filterStatus]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDelete = async (id: string, hard = false) => {
    if (!confirm(hard ? "Permanently delete this memory?" : "Archive this memory?")) {
      return;
    }

    try {
      const res = await fetch(`/api/memories/${id}?hard=${hard}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      fetchMemories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete memory");
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const res = await fetch(`/api/memories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      if (!res.ok) throw new Error("Failed to restore");
      fetchMemories();
    } catch (err) {
      console.error(err);
      alert("Failed to restore memory");
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white/80 text-sm tracking-widest uppercase">Memory Manager</h1>
            <p className="text-white/40 text-xs mt-1">
              <Link href="/control" className="hover:text-white/60 transition-colors">
                ← Back to Control
              </Link>
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">New Memory</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b border-zinc-800 px-6 py-3 flex gap-4">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Kind:</span>
          <div className="flex gap-1">
            {(["all", "profile", "episode", "knowledge"] as FilterKind[]).map((kind) => (
              <button
                key={kind}
                onClick={() => setFilterKind(kind)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  filterKind === kind
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-white/50 hover:text-white/70"
                }`}
              >
                {kind === "all" ? "All" : KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-xs">Status:</span>
          <div className="flex gap-1">
            {(["active", "archived"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  filterStatus === status
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-white/50 hover:text-white/70"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-12 text-white/40">Loading...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-400">{error}</div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12 text-white/40">
            No memories found.
            <button
              onClick={() => setShowCreateModal(true)}
              className="block mx-auto mt-4 text-white/60 hover:text-white underline"
            >
              Create your first memory
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${KIND_COLORS[memory.kind]}`}>
                        {KIND_LABELS[memory.kind]}
                      </span>
                      {memory.source === "extracted" && (
                        <span className="px-2 py-0.5 rounded text-xs bg-zinc-700 text-zinc-400">
                          Auto
                        </span>
                      )}
                      <span className="text-white/30 text-xs">
                        {(memory.importance * 100).toFixed(0)}% importance
                      </span>
                    </div>
                    <h3 className="text-white/90 font-medium truncate">{memory.title}</h3>
                    <p className="text-white/50 text-sm mt-1 line-clamp-2">{memory.content}</p>
                    {memory.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {memory.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-white/40"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingMemory(memory)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white/70"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {filterStatus === "active" ? (
                      <button
                        onClick={() => handleDelete(memory.id, false)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/40 hover:text-red-400"
                        title="Archive"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRestore(memory.id)}
                          className="p-2 rounded-lg hover:bg-green-500/20 transition-colors text-white/40 hover:text-green-400"
                          title="Restore"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(memory.id, true)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/40 hover:text-red-400"
                          title="Delete permanently"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingMemory) && (
        <MemoryModal
          memory={editingMemory}
          onClose={() => {
            setShowCreateModal(false);
            setEditingMemory(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingMemory(null);
            fetchMemories();
          }}
        />
      )}
    </main>
  );
}

interface MemoryModalProps {
  memory: Memory | null;
  onClose: () => void;
  onSave: () => void;
}

function MemoryModal({ memory, onClose, onSave }: MemoryModalProps) {
  const isEditing = !!memory;
  const [kind, setKind] = useState<"profile" | "episode" | "knowledge">(memory?.kind || "knowledge");
  const [title, setTitle] = useState(memory?.title || "");
  const [content, setContent] = useState(memory?.content || "");
  const [tags, setTags] = useState(memory?.tags.join(", ") || "");
  const [importance, setImportance] = useState(memory?.importance || 0.5);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSaving(true);
    try {
      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (isEditing) {
        const res = await fetch(`/api/memories/${memory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, tags: tagsArray, importance }),
        });
        if (!res.ok) throw new Error("Failed to update");
      } else {
        const res = await fetch("/api/memories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, title, content, tags: tagsArray, importance }),
        });
        if (!res.ok) throw new Error("Failed to create");
      }
      onSave();
    } catch (err) {
      console.error(err);
      alert("Failed to save memory");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-zinc-800">
            <h2 className="text-lg font-medium text-white/90">
              {isEditing ? "Edit Memory" : "New Memory"}
            </h2>
          </div>

          <div className="p-6 space-y-4">
            {/* Kind */}
            {!isEditing && (
              <div>
                <label className="block text-white/50 text-xs mb-2">Kind</label>
                <div className="flex gap-2">
                  {(["profile", "episode", "knowledge"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        kind === k
                          ? KIND_COLORS[k]
                          : "bg-zinc-800 text-white/50 hover:text-white/70"
                      }`}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-white/50 text-xs mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-zinc-500"
                required
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-white/50 text-xs mb-2">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter content..."
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-zinc-500 resize-none"
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-white/50 text-xs mb-2">Tags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="tag1, tag2, tag3"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white/90 placeholder:text-white/30 focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Importance */}
            <div>
              <label className="block text-white/50 text-xs mb-2">
                Importance: {(importance * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={importance}
                onChange={(e) => setImportance(parseFloat(e.target.value))}
                className="w-full accent-white/60"
              />
            </div>
          </div>

          <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-white/60 hover:text-white/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !content.trim()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
