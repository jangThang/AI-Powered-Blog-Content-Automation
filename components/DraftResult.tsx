"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { GenerateResult, PhotoInput } from "@/lib/types";
import { CheckIcon, CopyIcon, DownloadIcon, EditIcon, ExternalIcon, ImageIcon, SaveIcon, SearchIcon, ShieldIcon, SparklesIcon } from "./icons";
import ThumbnailResult from "./ThumbnailResult";

type Props = {
  result: GenerateResult;
  photos: PhotoInput[];
  category: string;
  onSave: (draft: GenerateResult) => Promise<void>;
};

function articleText(result: GenerateResult) {
  const sections = result.sections.map((section) => {
    const photos = section.photos.map((photo) => [
      `[사진 ${photo.photoIndex + 1} 넣기]`,
      photo.photoCaption ? `사진 설명: ${photo.photoCaption}` : "",
    ].filter(Boolean).join("\n"));
    return [section.heading, ...photos, ...section.paragraphs].filter(Boolean).join("\n\n");
  }).join("\n\n");
  const hashtags = result.hashtags.map((tag) => `#${tag}`).join(" ");
  const sources = result.sources.map((source, index) => `[출처 ${index + 1}] ${source.title}\n${source.url}`).join("\n\n");
  return [result.title, result.authorLine, sections, hashtags, sources ? `참고 자료\n\n${sources}` : ""].filter(Boolean).join("\n\n");
}

export default function DraftResult({ result, photos, category, onSave }: Props) {
  const [draft, setDraft] = useState(result);
  const [tab, setTab] = useState<"draft" | "thumbnail" | "seo" | "sources">("draft");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [hashtagText, setHashtagText] = useState(result.hashtags.map((tag) => `#${tag}`).join(" "));
  const [revising, setRevising] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [revisionDone, setRevisionDone] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");
  const fullText = useMemo(() => articleText(draft), [draft]);

  useEffect(() => {
    setDraft(result);
    setEditing(false);
    setRevisionInstruction("");
    setHashtagText(result.hashtags.map((tag) => `#${tag}`).join(" "));
    setRevisionError("");
    setRevisionDone(false);
    setSaveStatus("idle");
    setSaveError("");
  }, [result]);

  function updateDraft(update: (current: GenerateResult) => GenerateResult) {
    setDraft(update);
    setSaveStatus("idle");
    setSaveError("");
  }

  async function save() {
    if (saveStatus === "saving") return;
    setSaveStatus("saving");
    setSaveError("");
    try {
      await onSave(draft);
      setSaveStatus("saved");
    } catch (error) {
      setSaveStatus("idle");
      setSaveError(error instanceof Error ? error.message : "초안을 저장하지 못했습니다.");
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadForNaver() {
    // UTF-8 BOM keeps Korean text intact in Windows Notepad and similar editors.
    const blob = new Blob(["\uFEFF", fullText, "\n"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 60) || "starlog-draft"}_네이버용.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateSection(sectionIndex: number, update: (section: GenerateResult["sections"][number]) => GenerateResult["sections"][number]) {
    updateDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index === sectionIndex ? update(section) : section),
    }));
    setRevisionDone(false);
  }

  async function revise(event: FormEvent) {
    event.preventDefault();
    const instruction = revisionInstruction.trim();
    if (instruction.length < 2 || revising) return;
    setRevising(true);
    setRevisionError("");
    setRevisionDone(false);
    try {
      const response = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, category, photoCount: photos.length, result: draft }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "수정 요청을 반영하지 못했습니다.");
      if (!data?.result) throw new Error("수정된 초안을 읽지 못했습니다.");
      updateDraft(() => data.result as GenerateResult);
      setHashtagText((data.result as GenerateResult).hashtags.map((tag) => `#${tag}`).join(" "));
      setRevisionInstruction("");
      setRevisionDone(true);
      setEditing(false);
      setTab("draft");
    } catch (error) {
      setRevisionError(error instanceof Error ? error.message : "수정 요청을 반영하지 못했습니다.");
    } finally {
      setRevising(false);
    }
  }

  return (
    <section className="result-card">
      <div className="result-topline">
        <div className="result-title-wrap">
          <span className="eyebrow"><SparklesIcon size={14} /> 초안 완성</span>
          {editing ? (
            <textarea className="draft-title-input" value={draft.title} onChange={(event) => updateDraft((current) => ({ ...current, title: event.target.value }))} aria-label="초안 제목 수정" rows={2} />
          ) : <h2>{draft.title}</h2>}
        </div>
        <div className="result-actions">
          <button className={`save-draft-button ${saveStatus === "saved" ? "saved" : ""}`} type="button" onClick={() => void save()} disabled={saveStatus === "saving"}>{saveStatus === "saved" ? <CheckIcon size={16} /> : <SaveIcon size={16} />}{saveStatus === "saving" ? "저장 중…" : saveStatus === "saved" ? "저장됨" : "초안 저장"}</button>
          <button className={`edit-button ${editing ? "active" : ""}`} type="button" onClick={() => setEditing((current) => !current)}><EditIcon size={16} />{editing ? "수정 완료" : "직접 수정"}</button>
          <button className="copy-button" type="button" onClick={downloadForNaver} title="메모장에서 열어 네이버 블로그 에디터에 붙여넣는 TXT 파일"><DownloadIcon size={16} />네이버용 저장</button>
          <button className="copy-button" type="button" onClick={copy}>{copied ? <CheckIcon size={17} /> : <CopyIcon size={17} />}{copied ? "복사됨" : "전체 복사"}</button>
        </div>
      </div>
      {saveError && <p className="result-save-error">{saveError}</p>}

      <div className="result-summary">
        <div><span>SEO 점수</span><strong>{draft.seo.score}</strong><small>/ 100</small></div>
        <div><span>핵심 키워드</span><strong className="keyword-chip">{draft.primaryKeyword}</strong></div>
        <div><span>확인한 출처</span><strong>{draft.sources.length}</strong><small>개</small></div>
      </div>

      <div className="tabs" role="tablist">
        <button className={tab === "draft" ? "active" : ""} onClick={() => setTab("draft")}>본문 초안</button>
        <button className={tab === "thumbnail" ? "active" : ""} onClick={() => setTab("thumbnail")}><ImageIcon size={13} /> 썸네일</button>
        <button className={tab === "seo" ? "active" : ""} onClick={() => setTab("seo")}>SEO 점검</button>
        <button className={tab === "sources" ? "active" : ""} onClick={() => setTab("sources")}>출처 · 팩트체크</button>
      </div>

      {tab === "draft" && (
        <>
          <article className={`article-preview ${editing ? "editing" : ""}`}>
            {editing ? (
              <input className="draft-author-input" value={draft.authorLine} onChange={(event) => updateDraft((current) => ({ ...current, authorLine: event.target.value }))} aria-label="작성자 표기 수정" />
            ) : <p className="author-line">{draft.authorLine}</p>}
            {draft.sections.map((section, sectionIndex) => (
              <div className="article-section" key={`section-${sectionIndex}`}>
                {editing ? (
                  <input className="draft-heading-input" value={section.heading} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, heading: event.target.value }))} placeholder="소제목 없음" aria-label={`${sectionIndex + 1}번째 소제목 수정`} />
                ) : section.heading ? <h3>{section.heading}</h3> : null}
                {section.photos.length > 0 && <div className="section-photos">{section.photos.map((photo, photoIndex) => photos[photo.photoIndex] && (
                  <figure key={photo.photoIndex}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photos[photo.photoIndex].dataUrl} alt={photo.photoAlt} loading="lazy" />
                    {editing ? (
                      <input className="draft-caption-input" value={photo.photoCaption} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, photos: current.photos.map((item, index) => index === photoIndex ? { ...item, photoCaption: event.target.value } : item) }))} aria-label={`${photo.photoIndex + 1}번 사진 설명 수정`} placeholder="사진 설명" />
                    ) : <figcaption>{photo.photoCaption}</figcaption>}
                  </figure>
                ))}</div>}
                {section.paragraphs.map((paragraph, paragraphIndex) => editing ? (
                  <textarea className="draft-paragraph-input" key={paragraphIndex} value={paragraph} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, paragraphs: current.paragraphs.map((item, index) => index === paragraphIndex ? event.target.value : item) }))} aria-label={`${sectionIndex + 1}번째 구역 ${paragraphIndex + 1}번째 문단 수정`} rows={Math.max(3, Math.min(10, paragraph.split("\n").length + Math.ceil(paragraph.length / 55)))} />
                ) : <p key={paragraphIndex}>{paragraph}</p>)}
                {editing && <button className="add-paragraph-button" type="button" onClick={() => updateSection(sectionIndex, (current) => ({ ...current, paragraphs: [...current.paragraphs, ""] }))}>+ 문단 추가</button>}
              </div>
            ))}
            {editing ? (
              <label className="draft-hashtag-field"><span>해시태그</span><input value={hashtagText} onChange={(event) => { const value = event.target.value; setHashtagText(value); updateDraft((current) => ({ ...current, hashtags: value.split(/\s+/).map((tag) => tag.replace(/^#+/, "").trim()).filter(Boolean).slice(0, 20) })); }} placeholder="#대전맛집 #국내여행" /></label>
            ) : <div className="hashtags">{draft.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
          </article>

          <form className="revision-composer" onSubmit={revise}>
            <div className="revision-heading"><span><SparklesIcon size={16} /></span><div><strong>원하는 방향으로 다시 다듬기</strong><p>직접 수정한 내용도 유지한 채 요청사항을 반영합니다.</p></div></div>
            <div className="revision-input-row">
              <textarea value={revisionInstruction} onChange={(event) => { setRevisionInstruction(event.target.value); setRevisionDone(false); }} placeholder="예: 운영 정보를 더 간결하게 정리하고, 평소 문체처럼 짧은 감상을 조금 더 넣어주세요." maxLength={4000} disabled={revising} rows={3} />
              <button type="submit" disabled={revising || revisionInstruction.trim().length < 2}>{revising ? <span className="spinner" /> : <SparklesIcon size={17} />}{revising ? "수정 중…" : "수정 반영"}</button>
            </div>
            <div className="revision-footer"><span>{revisionInstruction.length.toLocaleString()} / 4,000자</span>{revisionDone && <em><CheckIcon size={13} />요청을 반영했습니다.</em>}</div>
            {revisionError && <p className="revision-error">{revisionError}</p>}
          </form>
        </>
      )}

      {tab === "seo" && (
        <div className="audit-panel">
          <div className="score-ring" style={{ "--score": `${draft.seo.score * 3.6}deg` } as React.CSSProperties}><span><strong>{draft.seo.score}</strong><small>SEO</small></span></div>
          <div className="audit-list">
            {draft.seo.checks.map((check, index) => (
              <div className="audit-item" key={`${check.label}-${index}`}><span className={`status-dot ${check.status}`}>{check.status === "pass" ? <CheckIcon size={13} /> : "!"}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></div>
            ))}
          </div>
          <div className="keyword-usage"><h3><SearchIcon size={17} /> 키워드 사용</h3>{draft.seo.keywordUsage.map((item) => <span key={item.keyword}>{item.keyword}<strong>{item.count}회</strong></span>)}</div>
        </div>
      )}

      {tab === "thumbnail" && <ThumbnailResult title={draft.title} category={category} thumbnail={draft.thumbnail} photos={photos} onChange={(thumbnail) => updateDraft((current) => ({ ...current, thumbnail }))} />}

      {tab === "sources" && (
        <div className="sources-panel">
          <div className="trust-note"><ShieldIcon size={21} /><div><strong>출처를 한 번 더 확인해주세요</strong><p>AI가 공식·기관 자료를 우선 검색했지만, 운영시간과 가격은 게시 직전 바뀔 수 있습니다.</p></div></div>
          {draft.sources.length === 0 ? <p className="empty-copy">사용된 외부 출처가 없습니다.</p> : (
            <ol className="source-list">{draft.sources.map((source, index) => <li key={`${source.url}-${index}`}><span>{index + 1}</span><div><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ExternalIcon size={14} /></a><small>{source.domain}</small><p>{source.supportedClaim}</p></div></li>)}</ol>
          )}
          {draft.factCheckNotes.length > 0 && <div className="fact-notes"><h3>게시 전 확인</h3>{draft.factCheckNotes.map((note, index) => <p key={index}>• {note}</p>)}</div>}
          {draft.photoInsights.length > 0 && <div className="fact-notes photo-notes"><h3>사진에서 읽은 내용</h3>{draft.photoInsights.map((note, index) => <p key={index}>• {note}</p>)}</div>}
        </div>
      )}
    </section>
  );
}
