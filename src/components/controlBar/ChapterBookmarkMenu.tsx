import { useState, useRef, useEffect } from "react";
import { Bookmark, ListTree, Plus, Trash2 } from "lucide-react";
import { useThemeStore } from "../../stores/themeStore";
import { usePlayerStore } from "../../stores/playerStore";
import { activeBtnStyle, formatSeconds } from "./shared";

export function ChapterBookmarkMenu() {
  const { accentColor, accentGlow, accentText } = useThemeStore();
  const chapters = usePlayerStore((s) => s.chapters);
  const currentChapterIndex = usePlayerStore((s) => s.currentChapterIndex);
  const seekToChapter = usePlayerStore((s) => s.seekToChapter);
  const bookmarks = usePlayerStore((s) => s.bookmarks);
  const addBookmark = usePlayerStore((s) => s.addBookmark);
  const deleteBookmark = usePlayerStore((s) => s.deleteBookmark);
  const seek = usePlayerStore((s) => s.seek);
  const hasMedia = usePlayerStore((s) => Boolean(s.mediaMetadata?.filePath));

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener("mousedown", handleOutsideClick);
    }
    return () => window.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  if (!hasMedia) return null;

  const hasAny = chapters.length > 0 || bookmarks.length > 0;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen((p) => !p)}
        style={activeBtnStyle(isOpen || bookmarks.length > 0, accentColor, accentGlow)}
        className={`flex p-1.5 sm:p-2 rounded-lg border transition duration-150 cursor-pointer ${
          !isOpen && bookmarks.length === 0
            ? "bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10"
            : ""
        }`}
        title="Chapters & Scene Bookmarks (Ctrl+B to Bookmark)"
      >
        {chapters.length > 0 ? (
          <ListTree className="w-4 h-4" />
        ) : (
          <Bookmark className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-2 right-0 bg-neutral-900/98 backdrop-blur-2xl border border-white/15 rounded-xl p-2 shadow-2xl flex flex-col gap-2 w-72 max-h-80 overflow-y-auto z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between px-1.5 pb-1.5 border-b border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Chapters &amp; Bookmarks
            </span>
            <button
              onClick={() => void addBookmark()}
              style={{ backgroundColor: accentColor, color: accentText }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer hover:brightness-110 transition"
              title="Bookmark current timestamp (Ctrl+B)"
            >
              <Plus className="w-3 h-3" />
              <span>Bookmark</span>
            </button>
          </div>

          {!hasAny && (
            <div className="py-4 text-center text-neutral-500 text-[11px]">
              No chapters in this file. Press <kbd className="px-1 py-0.5 bg-white/10 rounded font-mono text-[10px]">Ctrl+B</kbd> to save a scene bookmark.
            </div>
          )}

          {bookmarks.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="px-1.5 text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider">
                Scene Bookmarks ({bookmarks.length})
              </div>
              {bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 transition group"
                >
                  <button
                    onClick={() => {
                      void seek(bm.timestamp_seconds);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <Bookmark className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate text-neutral-200">{bm.label}</span>
                  </button>
                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                    {formatSeconds(bm.timestamp_seconds)}
                  </span>
                  <button
                    onClick={() => void deleteBookmark(bm.id)}
                    className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {chapters.length > 0 && (
            <div className="flex flex-col gap-0.5">
              <div className="px-1.5 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Chapters ({chapters.length})
              </div>
              {chapters.map((ch) => {
                const active = ch.index === currentChapterIndex;
                return (
                  <button
                    key={ch.index}
                    onClick={() => {
                      void seekToChapter(ch.index);
                      setIsOpen(false);
                    }}
                    style={active ? { backgroundColor: accentColor, color: accentText } : undefined}
                    className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg text-left transition cursor-pointer ${
                      active ? "font-bold" : "text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="truncate">{ch.title}</span>
                    <span className="text-[10px] font-mono opacity-75 shrink-0">
                      {formatSeconds(ch.time)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
