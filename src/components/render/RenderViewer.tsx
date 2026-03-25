"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft, Eye, MapPin, List, X, Send, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type CommentStatus = "NEW" | "IN_PROGRESS" | "DONE";

interface Reply {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface Comment {
  id: string;
  title?: string | null;
  content: string;
  posX: number;
  posY: number;
  status: CommentStatus;
  author: string;
  createdAt: string;
  replies: Reply[];
}

interface RoomRender {
  id: string;
  name: string;
  fileUrl: string;
}

type RenderStatus = "REVIEW" | "ACCEPTED";

interface RenderViewerProps {
  renderId: string;
  renderName?: string;
  projectId?: string;
  projectTitle?: string;
  roomId?: string;
  imageUrl: string;
  initialComments: Comment[];
  authorName: string;
  isDesigner?: boolean;
  roomRenders?: RoomRender[];
  roomName?: string;
  initialRenderStatus?: RenderStatus;
  onRenderStatusChange?: (status: RenderStatus) => Promise<void>;
  onStatusRequest?: () => Promise<void>;
  onBack?: () => void;
}

const STATUS_PIN_COLOR: Record<CommentStatus, string> = {
  NEW: "bg-red-500",
  IN_PROGRESS: "bg-yellow-500",
  DONE: "bg-green-500",
};

const STATUS_BADGE: Record<CommentStatus, string> = {
  NEW: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  DONE: "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<CommentStatus, string> = {
  NEW: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Done",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function popupPosition(x: number, y: number) {
  return {
    left: x > 55 ? `calc(${x}% - 284px)` : `calc(${x}% + 24px)`,
    top: y > 60 ? `calc(${y}% - 220px)` : `calc(${y}% + 10px)`,
  };
}

export default function RenderViewer({
  renderId,
  renderName,
  projectId,
  projectTitle,
  roomId,
  imageUrl,
  initialComments,
  authorName,
  isDesigner = false,
  roomRenders = [],
  roomName,
  initialRenderStatus = "REVIEW",
  onRenderStatusChange,
  onStatusRequest,
  onBack,
}: RenderViewerProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [replying, setReplying] = useState(false);
  const [renderStatus, setRenderStatus] = useState<RenderStatus>(initialRenderStatus);
  const [mode, setMode] = useState<"view" | "pin">("view");
  const [showComments, setShowComments] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = pusherClient.subscribe(`render-${renderId}`);
    channel.unbind_all();

    channel.bind("new-comment", (comment: Comment) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, { ...comment, replies: [] }];
      });
    });
    channel.bind("comment-updated", (updated: Comment) => {
      setComments((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...updated, replies: c.replies } : c))
      );
    });
    channel.bind("comment-deleted", ({ id }: { id: string }) => {
      setComments((prev) => prev.filter((c) => c.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
    });
    channel.bind("comment-reply", ({ commentId, reply }: { commentId: string; reply: Reply }) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c;
          if (c.replies.some((r) => r.id === reply.id)) return c;
          return { ...c, replies: [...c.replies, reply] };
        })
      );
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`render-${renderId}`);
    };
  }, [renderId]);

  function openLightbox() {
    setZoom(1);
    setLightboxOpen(true);
  }

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (mode !== "pin") {
      openLightbox();
      return;
    }
    if (pending) return;
    const rect = imgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPending({ x, y });
    setNewTitle("");
    setNewContent("");
    setSelectedId(null);
  }

  function cancelPending() {
    setPending(null);
    setNewTitle("");
    setNewContent("");
  }

  async function submitComment() {
    if (!pending || !newContent.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renderId,
          title: newTitle.trim() || null,
          content: newContent.trim(),
          posX: pending.x,
          posY: pending.y,
          author: authorName,
        }),
      });
      if (!res.ok) throw new Error();
      cancelPending();
      toast.success("Komentarz dodany");
    } catch {
      toast.error("Błąd dodawania komentarza");
    } finally {
      setAdding(false);
    }
  }

  async function submitReply() {
    if (!selectedId || !replyContent.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/comments/${selectedId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent.trim(), author: authorName }),
      });
      if (!res.ok) throw new Error();
      setReplyContent("");
    } catch {
      toast.error("Błąd dodawania odpowiedzi");
    } finally {
      setReplying(false);
    }
  }

  async function updateRenderStatus(status: RenderStatus) {
    try {
      if (onRenderStatusChange) {
        await onRenderStatusChange(status);
      } else {
        const res = await fetch(`/api/renders/${renderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      }
      setRenderStatus(status);
      toast.success(status === "ACCEPTED" ? "Plik zaakceptowany" : "Status zmieniony na: Do weryfikacji");
    } catch {
      toast.error("Błąd zmiany statusu");
    }
  }

  async function updateStatus(id: string, status: CommentStatus) {
    await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteComment(id: string) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setSelectedId(null);
    toast.success("Komentarz usunięty");
  }

  const todoCount = comments.filter((c) => c.status === "NEW").length;
  const inProgressCount = comments.filter((c) => c.status === "IN_PROGRESS").length;
  const doneCount = comments.filter((c) => c.status === "DONE").length;

  const selectedComment = selectedId ? comments.find((c) => c.id === selectedId) ?? null : null;
  const selectedIndex = selectedId ? comments.findIndex((c) => c.id === selectedId) : -1;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-white flex-shrink-0">
        {(projectId || onBack) ? (
          <>
            {onBack ? (
              <button
                onClick={onBack}
                className="flex items-center gap-0.5 text-sm text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={15} /> Wróć
              </button>
            ) : (
              <Link
                href={roomId ? `/projects/${projectId}/rooms/${roomId}` : `/projects/${projectId}`}
                className="flex items-center gap-0.5 text-sm text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0"
              >
                <ChevronLeft size={15} /> Wróć
              </Link>
            )}
            <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
          </>
        ) : null}

        <div className="min-w-0">
          {roomName && (
            <p className="text-sm font-semibold text-gray-900 truncate">{roomName}</p>
          )}
          {renderName && (
            <p className="text-xs text-gray-400 leading-none mt-0.5 truncate">{renderName}</p>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {todoCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-md">
              {todoCount} to do
            </span>
          )}
          {inProgressCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-md">
              {inProgressCount} in progress
            </span>
          )}
          {doneCount > 0 && (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-md">
              {doneCount} done
            </span>
          )}

          <div className="w-px h-4 bg-gray-200 mx-1" />

          {isDesigner ? (
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => updateRenderStatus("REVIEW")}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                  renderStatus === "REVIEW"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Do weryfikacji
              </button>
              <button
                onClick={() => updateRenderStatus("ACCEPTED")}
                className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                  renderStatus === "ACCEPTED"
                    ? "bg-green-500 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Zaakceptowany
              </button>
            </div>
          ) : renderStatus === "ACCEPTED" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-100 text-green-700">
                Zaakceptowany
              </span>
              {onStatusRequest && (
                <button
                  onClick={onStatusRequest}
                  className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
                >
                  Poproś o zmianę
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => updateRenderStatus("ACCEPTED")}
              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Zaakceptuj
            </button>
          )}

          <div className="w-px h-4 bg-gray-200 mx-1" />

          <button
            onClick={openLightbox}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
              lightboxOpen
                ? "bg-gray-900 text-white border-gray-900"
                : "border-transparent text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Eye size={14} /> Podgląd
          </button>
          <button
            onClick={() => setMode(mode === "pin" ? "view" : "pin")}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
              mode === "pin"
                ? "bg-gray-900 text-white border-gray-900"
                : "border-transparent text-gray-500 hover:bg-gray-100"
            }`}
          >
            <MapPin size={14} /> Dodaj pin
          </button>
          <button
            onClick={() => setShowComments((v) => !v)}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border transition-colors ${
              showComments
                ? "bg-gray-900 text-white border-gray-900"
                : "border-transparent text-gray-500 hover:bg-gray-100"
            }`}
          >
            <List size={14} /> Lista
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Thumbnails sidebar */}
        {roomRenders.length > 1 && (
          <div className="w-44 border-r bg-white flex flex-col flex-shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pliki ({roomRenders.length})
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {roomRenders.map((r) => (
                <Link
                  key={r.id}
                  href={`/projects/${projectId}/renders/${r.id}`}
                  className={`block rounded-lg overflow-hidden border-2 transition-colors ${
                    r.id === renderId
                      ? "border-blue-500"
                      : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.fileUrl}
                      alt={r.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className={`text-xs px-1.5 py-1 truncate ${
                    r.id === renderId ? "text-blue-600 font-semibold" : "text-gray-600"
                  }`}>
                    {r.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Image area */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-start justify-center p-6">
          <div
            ref={imgRef}
            className={`relative select-none ${mode === "pin" ? "cursor-crosshair" : "cursor-default"}`}
            style={{ maxWidth: "100%" }}
            onClick={handleImageClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Render"
              className="block rounded-lg shadow-sm"
              style={{ maxWidth: "100%", maxHeight: "calc(100vh - 180px)" }}
              draggable={false}
            />

            {/* Comment pins */}
            {comments.map((c, i) => (
              <button
                key={c.id}
                className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 transition-transform hover:scale-110 ${STATUS_PIN_COLOR[c.status]} ${
                  selectedId === c.id ? "scale-125 ring-2 ring-white ring-offset-1" : ""
                }`}
                style={{
                  left: `calc(${c.posX}% - 14px)`,
                  top: `calc(${c.posY}% - 14px)`,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(c.id === selectedId ? null : c.id);
                  cancelPending();
                  setReplyContent("");
                }}
              >
                {i + 1}
              </button>
            ))}

            {/* Pending pin */}
            {pending && (
              <div
                className="absolute w-7 h-7 rounded-full bg-blue-500 border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg z-10 animate-pulse pointer-events-none"
                style={{
                  left: `calc(${pending.x}% - 14px)`,
                  top: `calc(${pending.y}% - 14px)`,
                }}
              >
                +
              </div>
            )}

            {/* New comment popup */}
            {pending && (
              <div
                className="absolute z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 w-64"
                style={popupPosition(pending.x, pending.y)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">New Comment</h3>
                  <button onClick={cancelPending} className="text-gray-400 hover:text-gray-700">
                    <X size={14} />
                  </button>
                </div>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Brief title (optional)"
                  className="mb-2 text-sm"
                  onKeyDown={(e) => { if (e.key === "Escape") cancelPending(); }}
                />
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Describe what needs to be changed..."
                  className="mb-3 text-sm resize-none"
                  rows={3}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.ctrlKey) submitComment();
                    if (e.key === "Escape") cancelPending();
                  }}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={cancelPending}>Cancel</Button>
                  <Button size="sm" onClick={submitComment} disabled={adding || !newContent.trim()}>
                    {adding ? "Adding..." : "Add Pin"}
                  </Button>
                </div>
              </div>
            )}

            {/* Thread popup for existing pin */}
            {selectedComment && (
              <div
                className="absolute z-20 bg-white rounded-xl shadow-xl border border-gray-200 w-72 flex flex-col"
                style={{
                  ...popupPosition(selectedComment.posX, selectedComment.posY),
                  maxHeight: "360px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Thread header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0">
                  <span
                    className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${STATUS_PIN_COLOR[selectedComment.status]}`}
                  >
                    {selectedIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                    {selectedComment.title || `Pin #${selectedIndex + 1}`}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGE[selectedComment.status]}`}>
                    {STATUS_LABEL[selectedComment.status]}
                  </span>
                  <button
                    onClick={() => { setSelectedId(null); setReplyContent(""); }}
                    className="text-gray-400 hover:text-gray-700 flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Thread messages */}
                <div className="flex-1 overflow-y-auto divide-y divide-gray-100 min-h-0">
                  {/* Original comment */}
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">{selectedComment.author}</span>
                      <span className="text-[10px] text-gray-400">{formatDate(selectedComment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{selectedComment.content}</p>
                  </div>

                  {/* Replies */}
                  {selectedComment.replies.map((r) => (
                    <div key={r.id} className="px-4 py-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-800">{r.author}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(r.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{r.content}</p>
                    </div>
                  ))}
                </div>

                {/* Status buttons (designer only) */}
                {isDesigner && (
                  <div className="px-4 py-2 border-t flex gap-1 flex-wrap flex-shrink-0">
                    {(["NEW", "IN_PROGRESS", "DONE"] as CommentStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(selectedComment.id, s)}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                          selectedComment.status === s
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-200 text-gray-600 hover:border-gray-400"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteComment(selectedComment.id)}
                      className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-500 hover:bg-red-50 ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                )}

                {/* Reply input */}
                <div className="px-4 py-3 border-t flex-shrink-0">
                  <div className="flex gap-2">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Dodaj odpowiedź..."
                      className="text-sm resize-none flex-1"
                      rows={2}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.ctrlKey) submitReply();
                        if (e.key === "Escape") { setSelectedId(null); setReplyContent(""); }
                      }}
                    />
                    <Button
                      size="sm"
                      className="self-end flex-shrink-0"
                      onClick={submitReply}
                      disabled={replying || !replyContent.trim()}
                    >
                      <Send size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        {showComments && <div className="w-72 border-l bg-white flex flex-col flex-shrink-0">
          <div className="px-4 py-3 border-b flex-shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">
              All Comments ({comments.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {comments.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">
                {mode === "pin" ? "Click on the image to add a pin" : "No comments yet"}
              </p>
            )}
            {comments.map((c, i) => {
              const isSelected = selectedId === c.id;
              const displayTitle = c.title || `Pin #${i + 1}`;
              const totalReplies = c.replies.length;
              return (
                <div
                  key={c.id}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedId(c.id === selectedId ? null : c.id);
                    cancelPending();
                    setReplyContent("");
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${STATUS_PIN_COLOR[c.status]}`}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-gray-900 truncate">{displayTitle}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[c.status]}`}>
                          {STATUS_LABEL[c.status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {c.author} · {formatDate(c.createdAt)}
                        {totalReplies > 0 && (
                          <span className="ml-1 text-blue-500">{totalReplies} {totalReplies === 1 ? "reply" : "replies"}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* Lightbox header */}
          <div className="flex items-center justify-between px-5 py-3 flex-shrink-0 border-b border-white/10">
            <div className="min-w-0">
              {roomName && (
                <p className="text-sm font-semibold text-white truncate">{roomName}</p>
              )}
              {renderName && (
                <p className="text-xs text-white/50 mt-0.5 truncate">{renderName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  setLightboxOpen(false);
                  setMode("pin");
                }}
                className="flex items-center gap-1.5 text-sm bg-white text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-md font-medium transition-colors"
              >
                <MapPin size={14} /> Dodaj pin
              </button>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Lightbox image area */}
          <div
            className="flex-1 overflow-auto flex items-start justify-center p-8"
            onWheel={(e) => {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.12 : 0.12;
              setZoom((z) => Math.max(0.25, Math.min(5, z + delta)));
            }}
          >
            <div
              className="relative flex-shrink-0"
              style={{ width: `${Math.max(60, 75 * zoom)}vw` }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Render"
                className="w-full h-auto block rounded-lg"
                draggable={false}
              />
              {/* Pins overlay */}
              {comments.map((c, i) => (
                <div
                  key={c.id}
                  className={`absolute w-7 h-7 rounded-full border-2 border-white text-white text-xs font-bold flex items-center justify-center shadow-lg ${STATUS_PIN_COLOR[c.status]}`}
                  style={{
                    left: `calc(${c.posX}% - 14px)`,
                    top: `calc(${c.posY}% - 14px)`,
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center justify-center gap-3 py-4 flex-shrink-0 border-t border-white/10">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-xs text-white/60 hover:text-white w-14 text-center transition-colors"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
