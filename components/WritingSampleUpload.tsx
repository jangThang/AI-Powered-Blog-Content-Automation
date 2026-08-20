"use client";

import { useEffect, useRef, useState } from "react";
import type { WritingLibraryFile } from "@/lib/types";
import { FileTextIcon, TrashIcon } from "./icons";

const MAX_FILE_BYTES = 100_000_000;
const ALLOWED_EXTENSIONS = new Set(["pdf", "txt", "md", "markdown", "html", "htm"]);

function formatBytes(bytes: number) {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1_000)).toLocaleString()}KB`;
  return `${(bytes / 1_000_000).toFixed(1)}MB`;
}

export default function WritingSampleUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<WritingLibraryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [error, setError] = useState("");

  async function refresh() {
    const response = await fetch("/api/writing-library", { cache: "no-store" });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || "문체 자료실을 불러오지 못했습니다.");
    setFiles(data?.files || []);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err instanceof Error ? err.message : "문체 자료실을 불러오지 못했습니다.")).finally(() => setLoading(false));
  }, []);

  async function addFiles(selected: FileList) {
    if (busy || selected.length === 0) return;
    setError("");
    setBusy(true);
    setProgress(0);
    setProgressTotal(selected.length);
    const failures: string[] = [];

    try {
      for (const [index, file] of Array.from(selected).entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        if (!ALLOWED_EXTENSIONS.has(extension)) {
          failures.push(`${file.name}: 지원하지 않는 파일 형식입니다.`);
          setProgress(index + 1);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          failures.push(`${file.name}: 100MB를 초과했습니다.`);
          setProgress(index + 1);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/writing-library", { method: "POST", body: formData });
        const data = await response.json().catch(() => null);
        if (!response.ok) failures.push(`${file.name}: ${data?.error || "저장하지 못했습니다."}`);
        setProgress(index + 1);
      }
      await refresh();
      if (failures.length) setError(failures.join("\n"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "작성글을 저장하지 못했습니다.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(file: WritingLibraryFile) {
    if (!window.confirm(`'${file.name}'을 문체 자료실에서 삭제할까요?`)) return;
    setError("");
    try {
      const response = await fetch(`/api/writing-library?id=${encodeURIComponent(file.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "작성글을 삭제하지 못했습니다.");
      setFiles((current) => current.filter((item) => item.id !== file.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "작성글을 삭제하지 못했습니다.");
    }
  }

  const totalChars = files.reduce((sum, file) => sum + file.charCount, 0);
  const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

  return (
    <div>
      <button type="button" className="dropzone writing-dropzone" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}>
        <span className="dropzone-icon"><FileTextIcon size={22} /></span>
        <span><strong>{busy ? `프로젝트 자료실에 저장 중… ${progress} / ${progressTotal}` : "내가 쓴 글을 프로젝트에 추가하세요"}</strong><small>PDF · TXT · Markdown · HTML · 파일당 최대 100MB</small></span>
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.txt,.md,.markdown,.html,.htm,application/pdf,text/plain,text/markdown,text/html" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files); }} />
      <p className="upload-help">한 번 올린 글은 이 프로젝트에 계속 보관되며, 이후 모든 초안에서 문체와 글의 성향을 자동으로 참고합니다.</p>
      {error && <p className="field-error multiline-error">{error}</p>}

      {loading ? <p className="library-empty">문체 자료실을 불러오는 중…</p> : files.length === 0 ? (
        <p className="library-empty">아직 저장된 작성글이 없습니다. 파일을 올리면 다음 초안부터 자동으로 반영됩니다.</p>
      ) : (
        <div className="sample-list">
          <div className="upload-summary"><span>{files.length}개 · {totalChars.toLocaleString()}자 · {formatBytes(totalBytes)}</span><em>프로젝트에 저장됨</em></div>
          <div className="sample-grid">
            {files.map((file) => (
              <div className="sample-item" key={file.id}>
                <FileTextIcon size={18} />
                <div><strong title={file.name}>{file.name}</strong><small>{file.charCount.toLocaleString()}자 · {formatBytes(file.bytes)}</small><span>{file.extension.toUpperCase()}</span></div>
                <button type="button" aria-label={`${file.name} 삭제`} onClick={() => void remove(file)}><TrashIcon size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
