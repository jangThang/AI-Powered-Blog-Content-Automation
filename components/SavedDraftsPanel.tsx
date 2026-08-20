"use client";

import { useEffect } from "react";
import type { SavedDraftSummary } from "@/lib/types";
import { ArrowIcon, CloseIcon, FileTextIcon, ImageIcon, TrashIcon } from "./icons";

type Props = {
  open: boolean;
  drafts: SavedDraftSummary[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => void;
  onOpen: (id: string) => void;
  onDelete: (draft: SavedDraftSummary) => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))}KB`;
  return `${(bytes / 1_000_000).toFixed(1)}MB`;
}

export default function SavedDraftsPanel({ open, drafts, loading, error, onClose, onRefresh, onOpen, onDelete }: Props) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="draft-library-panel" role="dialog" aria-modal="true" aria-labelledby="draft-library-title">
        <header className="draft-library-header">
          <div><span><FileTextIcon size={18} /></span><div><h2 id="draft-library-title">저장된 초안</h2><p>본문, 사진, 썸네일과 검토 결과를 다시 불러옵니다.</p></div></div>
          <button type="button" onClick={onClose} aria-label="저장된 초안 닫기"><CloseIcon size={20} /></button>
        </header>
        <div className="draft-library-body">
          <div className="draft-library-toolbar"><span>총 <strong>{drafts.length}</strong>개</span><button type="button" onClick={onRefresh} disabled={loading}>{loading ? "불러오는 중…" : "목록 새로고침"}</button></div>
          {error && <p className="draft-library-error">{error}</p>}
          {loading && drafts.length === 0 ? <div className="draft-library-empty">저장된 초안을 확인하고 있습니다.</div> : drafts.length === 0 ? (
            <div className="draft-library-empty"><span><FileTextIcon size={29} /></span><strong>아직 저장된 초안이 없습니다</strong><p>초안을 생성한 뒤 상단의 ‘초안 저장’을 눌러 보관할 수 있습니다.</p></div>
          ) : (
            <div className="draft-library-list">
              {drafts.map((draft) => (
                <article key={draft.id}>
                  <button className="draft-library-open" type="button" onClick={() => onOpen(draft.id)}>
                    <span className="draft-library-category">{draft.category}</span>
                    <strong>{draft.title}</strong>
                    <small>{formatDate(draft.updatedAt)}<em><ImageIcon size={12} /> 사진 {draft.photoCount}장 · {formatBytes(draft.bytes)}</em></small>
                    <ArrowIcon size={18} />
                  </button>
                  <button className="draft-library-delete" type="button" onClick={() => onDelete(draft)} aria-label={`${draft.title} 삭제`}><TrashIcon size={17} /></button>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
