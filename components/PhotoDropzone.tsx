"use client";

import { useRef, useState } from "react";
import { compressPhoto } from "@/lib/image";
import type { PhotoInput } from "@/lib/types";
import { ImageIcon, TrashIcon } from "./icons";

const MAX_PHOTOS = 100;

type Props = {
  photos: PhotoInput[];
  onChange: (photos: PhotoInput[]) => void;
};

export default function PhotoDropzone({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [error, setError] = useState("");

  async function addFiles(files: FileList | File[]) {
    if (busy) return;
    setError("");
    const available = MAX_PHOTOS - photos.length;
    if (available <= 0) return setError("사진은 최대 100장까지 넣을 수 있습니다.");
    const selected = Array.from(files).slice(0, available);
    setBusy(true);
    setProgress(0);
    setProcessingTotal(selected.length);
    try {
      const next = [] as PhotoInput[];
      for (const [index, file] of selected.entries()) {
        next.push(await compressPhoto(file));
        setProgress(index + 1);
      }
      onChange([...photos, ...next]);
      if (Array.from(files).length > available) setError(`최대 100장까지만 추가했습니다. 나머지 ${Array.from(files).length - available}장은 제외했습니다.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <button
        type="button"
        className="dropzone"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => { event.preventDefault(); void addFiles(event.dataTransfer.files); }}
      >
        <span className="dropzone-icon"><ImageIcon size={22} /></span>
        <span><strong>{busy ? `사진을 변환하고 압축하는 중… ${progress} / ${processingTotal}` : "사진을 올려주세요"}</strong><small>클릭하거나 끌어놓기 · JPG/PNG/WebP/HEIC · 최대 100장</small></span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files); }} />
      {error && <p className="field-error">{error}</p>}
      {photos.length > 0 && (
        <>
          <div className="upload-summary"><span>{photos.length} / 100장</span><button type="button" onClick={() => onChange([])}>전체 삭제</button></div>
          <div className="photo-grid">
            {photos.map((photo, index) => (
              <div className="photo-thumb" key={`${photo.name}-${index}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt={`${index + 1}번째 업로드 미리보기`} loading="lazy" />
                <span>{index + 1}</span>
                <button type="button" aria-label={`${photo.name} 삭제`} onClick={() => onChange(photos.filter((_, photoIndex) => photoIndex !== index))}><TrashIcon size={15} /></button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
