"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PhotoInput, ThumbnailPhotoSetting, ThumbnailSpec } from "@/lib/types";
import { CheckIcon, DownloadIcon, EditIcon, RefreshIcon } from "./icons";

type Props = {
  title: string;
  category: string;
  thumbnail: ThumbnailSpec;
  photos: PhotoInput[];
  onChange: (thumbnail: ThumbnailSpec) => void;
};

const SIZE = 1080;
const PHOTO_HEIGHT = 740;
const PANEL_TOP = PHOTO_HEIGHT + 8;
const FONT_FAMILY = 'Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("썸네일에 사용할 사진을 읽지 못했습니다."));
    image.src = source;
  });
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.roundRect(x, y, width, height, safeRadius);
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, setting: ThumbnailPhotoSetting) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * setting.zoom;
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceWidth, setting.focusX * image.naturalWidth - sourceWidth / 2));
  const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceHeight, setting.focusY * image.naturalHeight - sourceHeight / 2));
  context.save();
  context.filter = `brightness(${Math.min(1.15, setting.brightness * 1.025)}) contrast(1.04) saturate(1.08)`;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

function drawStar(context: CanvasRenderingContext2D, centerX: number, centerY: number, outerRadius: number, innerRadius: number) {
  context.save();
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + point * Math.PI / 5;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = "#ffdf80";
  context.fill();
  context.restore();
}

function drawFittedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, startSize: number, minSize: number, weight = 800) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px ${FONT_FAMILY}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  } while (size > minSize);
  context.fillText(text, x, y);
}

function normalizeBadge(text: string) {
  const parts = text.replace(/\s*[|/•]\s*/g, " · ").split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(" · ");
  return `${parts.slice(0, -1).join(" ")} · ${parts.at(-1)}`;
}

function normalizeSubtitle(text: string) {
  return text.replace(/\s*[·•/]\s*/g, " | ").replace(/\s*\|\s*/g, " | ").replace(/\s{2,}/g, " ").trim();
}

export default function ThumbnailResult({ title, category, thumbnail, photos, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [editingText, setEditingText] = useState(false);

  const selectedIndexes = useMemo(() => {
    if (photos.length === 0) return [];
    const preferredIndexes = (Array.isArray(thumbnail.photoIndexes) ? thumbnail.photoIndexes : [])
      .filter((index, position, values) => index >= 0 && index < photos.length && values.indexOf(index) === position)
      .slice(0, 3);
    const candidates = [...preferredIndexes, ...photos.map((_, index) => index)]
      .filter((index, position, values) => index >= 0 && index < photos.length && values.indexOf(index) === position);
    // The reference design has only two stable formats: one hero photo or an asymmetric three-photo collage.
    const eventNeedsCollage = /세미나|박람회|페어|전시|축제|행사|컨퍼런스|강연|캠프/i.test(`${category} ${title} ${thumbnail.eyebrow}`);
    const count = candidates.length >= 3 && (preferredIndexes.length > 1 || eventNeedsCollage) ? 3 : 1;
    return candidates.slice(0, count);
  }, [category, photos, thumbnail.eyebrow, thumbnail.photoIndexes, title]);

  function defaultSetting(photoIndex: number): ThumbnailPhotoSetting {
    return { photoIndex, focusX: 0.5, focusY: 0.5, zoom: 1, brightness: 1 };
  }

  function changePhotoCombination() {
    if (photos.length < 2 || selectedIndexes.length === 0) return;
    const count = selectedIndexes.length;
    const nextStart = (selectedIndexes[0] + 1) % photos.length;
    const nextIndexes = Array.from({ length: count }, (_, offset) => (nextStart + offset) % photos.length);
    const configuredSettings = Array.isArray(thumbnail.photoSettings) ? thumbnail.photoSettings : [];
    onChange({
      ...thumbnail,
      photoIndexes: nextIndexes,
      photoSettings: nextIndexes.map((photoIndex) => configuredSettings.find((setting) => setting.photoIndex === photoIndex) || defaultSetting(photoIndex)),
    });
  }

  function updateText(patch: Partial<Pick<ThumbnailSpec, "eyebrow" | "headline" | "subtitle" | "keywords">>) {
    onChange({ ...thumbnail, ...patch });
  }

  function updateKeyword(index: number, value: string) {
    const keywords = [...(Array.isArray(thumbnail.keywords) ? thumbnail.keywords : [])].slice(0, 3);
    while (keywords.length < 3) keywords.push("");
    keywords[index] = value.slice(0, 12);
    updateText({ keywords });
  }

  function finishTextEditing() {
    updateText({
      eyebrow: thumbnail.eyebrow.trim().slice(0, 20),
      headline: thumbnail.headline.trim().slice(0, 10),
      subtitle: thumbnail.subtitle.trim().slice(0, 20),
      keywords: thumbnail.keywords.map((keyword) => keyword.trim()).filter(Boolean).slice(0, 3),
    });
    setEditingText(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function render() {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      setReady(false);
      setError("");
      try {
        await document.fonts?.ready;
        const images = await Promise.all(selectedIndexes.map((index) => loadImage(photos[index].dataUrl)));
        const configuredSettings = Array.isArray(thumbnail.photoSettings) ? thumbnail.photoSettings : [];
        const settings = selectedIndexes.map((photoIndex) => configuredSettings.find((setting) => setting.photoIndex === photoIndex) || {
          photoIndex, focusX: 0.5, focusY: 0.5, zoom: 1, brightness: 1,
        });
        if (cancelled) return;

        context.clearRect(0, 0, SIZE, SIZE);
        context.fillStyle = "#182044";
        context.fillRect(0, 0, SIZE, SIZE);

        if (images.length === 0) {
          const placeholder = context.createLinearGradient(0, 0, SIZE, PHOTO_HEIGHT);
          placeholder.addColorStop(0, "#385b57");
          placeholder.addColorStop(1, "#91715f");
          context.fillStyle = placeholder;
          context.fillRect(0, 0, SIZE, PHOTO_HEIGHT);
          context.fillStyle = "rgba(255,255,255,.16)";
          for (let index = 0; index < 8; index += 1) {
            context.beginPath();
            context.arc(120 + index * 125, 160 + (index % 3) * 120, 36 + (index % 2) * 18, 0, Math.PI * 2);
            context.fill();
          }
        } else if (images.length === 1) {
          drawCover(context, images[0], 0, 0, SIZE, PHOTO_HEIGHT, settings[0]);
        } else {
          drawCover(context, images[0], 0, 0, 540, PHOTO_HEIGHT, settings[0]);
          drawCover(context, images[1], 540, 0, 540, 370, settings[1]);
          drawCover(context, images[2], 540, 370, 540, 370, settings[2]);
          context.fillStyle = "#ffffff";
          context.fillRect(538.5, 0, 3, PHOTO_HEIGHT);
          context.fillRect(540, 368.5, 540, 3);
        }

        context.fillStyle = "#bcace0";
        context.fillRect(0, PHOTO_HEIGHT, SIZE, 8);
        const panel = context.createLinearGradient(0, PANEL_TOP, SIZE, SIZE);
        panel.addColorStop(0, "#182044");
        panel.addColorStop(1, "#4e3e78");
        context.fillStyle = panel;
        context.fillRect(0, PANEL_TOP, SIZE, SIZE - PANEL_TOP);

        // Deterministic night-sky dots mirror the reference design without obscuring text.
        let seed = 7319;
        for (let index = 0; index < 42; index += 1) {
          seed = (seed * 48271) % 2147483647;
          const x = seed % SIZE;
          seed = (seed * 48271) % 2147483647;
          const y = PANEL_TOP + 18 + (seed % (SIZE - PANEL_TOP - 34));
          const radius = index % 7 === 0 ? 2.2 : index % 3 === 0 ? 1.4 : 0.9;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fillStyle = `rgba(255,255,255,${index % 4 === 0 ? .68 : .38})`;
          context.fill();
        }

        context.fillStyle = "rgba(255,255,255,.78)";
        context.font = `700 33px ${FONT_FAMILY}`;
        const eyebrow = normalizeBadge(thumbnail.eyebrow || category).slice(0, 24);
        const eyebrowWidth = Math.min(720, context.measureText(eyebrow).width + 92);
        const badgeX = thumbnail.badgePosition === "right" ? SIZE - eyebrowWidth - 40 : 40;
        context.fillStyle = "rgba(40,46,92,.92)";
        roundedRect(context, badgeX, 36, eyebrowWidth, 68, 18);
        context.fill();
        context.strokeStyle = "#bcace0";
        context.lineWidth = 2;
        context.stroke();
        drawStar(context, badgeX + 31, 70, 14, 6);
        context.fillStyle = "#faf6f0";
        context.fillText(eyebrow, badgeX + 58, 81);

        context.fillStyle = "#faf6f0";
        drawFittedText(context, thumbnail.headline || title, 50, 858, 980, 72, 48, 900);

        context.fillStyle = "#cdc4e6";
        drawFittedText(context, normalizeSubtitle(thumbnail.subtitle || category), 52, 920, 950, 34, 25, 500);

        const keywordText = (Array.isArray(thumbnail.keywords) ? thumbnail.keywords : []).map((keyword) => keyword.trim()).filter(Boolean).slice(0, 3).join("  ·  ");
        context.fillStyle = "#ffdf80";
        drawFittedText(context, keywordText, 52, 987, 950, 43, 28, 800);

        context.font = `500 25px ${FONT_FAMILY}`;
        context.fillStyle = "#cdc4e6";
        const signature = "기록을 이야기로  ·  Starlog";
        const signatureWidth = context.measureText(signature).width;
        drawStar(context, 1025 - signatureWidth - 20, 1031, 11, 5);
        context.textAlign = "right";
        context.fillText(signature, 1025, 1039);
        context.textAlign = "left";
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "썸네일을 만들지 못했습니다.");
      }
    }
    void render();
    return () => { cancelled = true; };
  }, [category, photos, selectedIndexes, thumbnail, title]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const link = document.createElement("a");
    link.download = thumbnail.fileName || "starlog_thumbnail.jpg";
    link.href = canvas.toDataURL("image/jpeg", 0.94);
    link.click();
  }

  return (
    <div className="thumbnail-panel">
      <div className="thumbnail-intro"><div><strong>게시용 썸네일</strong><p>초안 제목과 대표 사진으로 1080 × 1080 JPG를 만들었습니다.</p></div><span>{selectedIndexes.length ? `사진 ${selectedIndexes.map((index) => index + 1).join(", ")}` : "사진 없이 생성"}</span></div>
      <div className="thumbnail-canvas-wrap"><canvas ref={canvasRef} width={SIZE} height={SIZE} aria-label="자동 생성된 블로그 썸네일" /></div>
      {error && <p className="thumbnail-error">{error}</p>}
      <div className="thumbnail-actions">
        <button type="button" onClick={changePhotoCombination} disabled={photos.length < 2}><RefreshIcon size={17} />다른 사진 조합</button>
        <button type="button" className={editingText ? "active" : ""} onClick={() => editingText ? finishTextEditing() : setEditingText(true)}>{editingText ? <CheckIcon size={17} /> : <EditIcon size={17} />}{editingText ? "수정 완료" : "텍스트 수정"}</button>
        <button type="button" className="primary" onClick={download} disabled={!ready}><DownloadIcon size={17} />JPG 저장</button>
      </div>
      {editingText && (
        <div className="thumbnail-text-editor">
          <div className="thumbnail-text-editor-heading"><div><strong>썸네일 문구 수정</strong><p>입력과 동시에 미리보기에 반영됩니다.</p></div><span>직접 수정</span></div>
          <div className="thumbnail-text-fields">
            <label className="wide"><span>상단 배지</span><input value={thumbnail.eyebrow} onChange={(event) => updateText({ eyebrow: event.target.value.slice(0, 20) })} maxLength={20} placeholder="서울 삼성동 · 세미나" /></label>
            <label><span>큰 제목</span><input value={thumbnail.headline} onChange={(event) => updateText({ headline: event.target.value.slice(0, 10) })} maxLength={10} placeholder={title.slice(0, 10)} /></label>
            <label><span>부제</span><input value={thumbnail.subtitle} onChange={(event) => updateText({ subtitle: event.target.value.slice(0, 20) })} maxLength={20} placeholder={`${category} | 방문 후기`} /></label>
          </div>
          <div className="thumbnail-keyword-fields"><span>핵심 키워드</span><div>{[0, 1, 2].map((index) => <input key={index} value={thumbnail.keywords[index] || ""} onChange={(event) => updateKeyword(index, event.target.value)} maxLength={12} placeholder={`키워드 ${index + 1}`} />)}</div></div>
        </div>
      )}
      <p className="thumbnail-note">사진 조합과 직접 수정한 문구는 초안 저장 시 함께 보관됩니다.</p>
    </div>
  );
}
