"use client";

import { useEffect, useState } from "react";
import WritingSampleUpload from "./WritingSampleUpload";
import { BookIcon, CheckIcon, CloseIcon, GuideIcon, ImageIcon, SettingsIcon } from "./icons";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Tab = "library" | "guidelines" | "thumbnail";

export default function SettingsPanel({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("library");
  const [guidelines, setGuidelines] = useState("");
  const [savedGuidelines, setSavedGuidelines] = useState("");
  const [thumbnailGuidelines, setThumbnailGuidelines] = useState("");
  const [savedThumbnailGuidelines, setSavedThumbnailGuidelines] = useState("");
  const [maxChars, setMaxChars] = useState(12_000);
  const [maxThumbnailChars, setMaxThumbnailChars] = useState(8_000);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if ((guidelines !== savedGuidelines || thumbnailGuidelines !== savedThumbnailGuidelines) && !window.confirm("저장하지 않은 설정이 있습니다. 설정을 닫을까요?")) return;
      onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose, guidelines, savedGuidelines, thumbnailGuidelines, savedThumbnailGuidelines]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch("/api/project-settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "설정을 불러오지 못했습니다.");
        const value = data?.settings?.guidelines || "";
        setGuidelines(value);
        setSavedGuidelines(value);
        const thumbnailValue = data?.settings?.thumbnailGuidelines || "";
        setThumbnailGuidelines(thumbnailValue);
        setSavedThumbnailGuidelines(thumbnailValue);
        if (typeof data?.maxGuidelinesChars === "number") setMaxChars(data.maxGuidelinesChars);
        if (typeof data?.maxThumbnailGuidelinesChars === "number") setMaxThumbnailChars(data.maxThumbnailGuidelinesChars);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [open]);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/project-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guidelines, thumbnailGuidelines }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "초안 작성 지침을 저장하지 못했습니다.");
      const value = data?.settings?.guidelines || "";
      setGuidelines(value);
      setSavedGuidelines(value);
      const thumbnailValue = data?.settings?.thumbnailGuidelines || "";
      setThumbnailGuidelines(thumbnailValue);
      setSavedThumbnailGuidelines(thumbnailValue);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if ((guidelines !== savedGuidelines || thumbnailGuidelines !== savedThumbnailGuidelines) && !window.confirm("저장하지 않은 설정이 있습니다. 설정을 닫을까요?")) return;
    onClose();
  }

  if (!open) return null;

  return (
    <div className="settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}>
      <section className="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-header">
          <div><span><SettingsIcon size={20} /></span><div><h2 id="settings-title">설정</h2><p>작성글, 초안 지침과 썸네일 규칙을 프로젝트에 저장합니다.</p></div></div>
          <button type="button" className="settings-close" onClick={requestClose} aria-label="설정 닫기"><CloseIcon size={21} /></button>
        </header>

        <div className="settings-layout">
          <nav className="settings-nav" aria-label="설정 항목">
            <button type="button" className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}><BookIcon size={19} /><span><strong>작성글 자료실</strong><small>내가 쓴 글 관리</small></span></button>
            <button type="button" className={tab === "guidelines" ? "active" : ""} onClick={() => setTab("guidelines")}><GuideIcon size={19} /><span><strong>초안 작성 지침</strong><small>항상 지킬 규칙</small></span></button>
            <button type="button" className={tab === "thumbnail" ? "active" : ""} onClick={() => setTab("thumbnail")}><ImageIcon size={19} /><span><strong>썸네일 지침</strong><small>이미지 구성 규칙</small></span></button>
          </nav>

          <div className="settings-content">
            {tab === "library" ? (
              <div className="settings-section">
                <div className="settings-section-heading"><span>작성글 자료실</span><h3>내가 쓴 글을 모아두세요</h3><p>같은 카테고리 글을 우선 분석해 문체뿐 아니라 제목, 정보 블록, 사진과 문단 배치 형식까지 이후 초안에 반영합니다.</p></div>
                <WritingSampleUpload />
              </div>
            ) : tab === "guidelines" ? (
              <div className="settings-section">
                <div className="settings-section-heading"><span>초안 작성 지침</span><h3>초안마다 지켜야 할 규칙을 적어주세요</h3><p>문체 자료보다 우선해서 적용됩니다. 현재 글의 사실 메모는 초안 작성 화면에 적어주세요.</p></div>

                <div className="guideline-examples">
                  <strong>이렇게 적어보세요</strong>
                  <span>• 도입은 두 문단 이내로 작성하기</span>
                  <span>• 가격과 주차 정보는 표처럼 한눈에 정리하기</span>
                  <span>• 부정적인 평가는 단정하지 말고 이유를 함께 쓰기</span>
                </div>

                <label className="guideline-field">
                  <span>프로젝트 공통 지침</span>
                  <textarea
                    value={guidelines}
                    onChange={(event) => { setGuidelines(event.target.value); setSaved(false); }}
                    placeholder={"예:\n- 제목에 지역명을 반드시 포함해주세요.\n- 도입은 짧게, 방문 정보는 앞부분에 배치해주세요.\n- 이모지와 느낌표는 사용하지 마세요."}
                    maxLength={maxChars}
                    disabled={loading}
                  />
                  <small>{guidelines.length.toLocaleString()} / {maxChars.toLocaleString()}자</small>
                </label>

                {error && <p className="settings-error">{error}</p>}
                <div className="settings-save-row">
                  <span>{guidelines === savedGuidelines ? "저장된 지침이 이후 모든 초안에 자동 적용됩니다." : "변경사항이 아직 저장되지 않았습니다."}</span>
                  <button type="button" onClick={() => void saveSettings()} disabled={loading || saving || (guidelines === savedGuidelines && thumbnailGuidelines === savedThumbnailGuidelines)}>{saved ? <CheckIcon size={17} /> : null}{saving ? "저장 중…" : saved ? "저장됨" : "지침 저장"}</button>
                </div>
              </div>
            ) : (
              <div className="settings-section">
                <div className="settings-section-heading"><span>썸네일 지침</span><h3>일관된 썸네일 제작 규칙을 정하세요</h3><p>초안 제목과 대표 사진을 바탕으로 만들 문구, 사진 배치와 디자인 원칙을 적어주세요.</p></div>

                <div className="guideline-examples thumbnail-guide-preview">
                  <strong>기본 디자인</strong>
                  <span>사진 1~3장 콜라주 + 짙은 남보라색 제목 영역</span>
                  <span>짧은 장소·대상명 + 핵심 키워드 2~4개</span>
                  <span>모든 썸네일에 같은 여백, 색상과 브랜드 표기 유지</span>
                </div>

                <label className="guideline-field">
                  <span>프로젝트 공통 썸네일 지침</span>
                  <textarea
                    value={thumbnailGuidelines}
                    onChange={(event) => { setThumbnailGuidelines(event.target.value); setSaved(false); }}
                    placeholder={"예:\n- 상단에는 대표 사진 3장을 콜라주로 배치해주세요.\n- 하단은 짙은 남보라색을 사용해주세요.\n- 장소명을 가장 크게 표시해주세요."}
                    maxLength={maxThumbnailChars}
                    disabled={loading}
                  />
                  <small>{thumbnailGuidelines.length.toLocaleString()} / {maxThumbnailChars.toLocaleString()}자</small>
                </label>

                {error && <p className="settings-error">{error}</p>}
                <div className="settings-save-row">
                  <span>{thumbnailGuidelines === savedThumbnailGuidelines ? "저장된 규칙이 이후 모든 썸네일에 자동 적용됩니다." : "변경사항이 아직 저장되지 않았습니다."}</span>
                  <button type="button" onClick={() => void saveSettings()} disabled={loading || saving || (guidelines === savedGuidelines && thumbnailGuidelines === savedThumbnailGuidelines)}>{saved ? <CheckIcon size={17} /> : null}{saving ? "저장 중…" : saved ? "저장됨" : "지침 저장"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
