"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import DraftResult from "@/components/DraftResult";
import PhotoDropzone from "@/components/PhotoDropzone";
import SavedDraftsPanel from "@/components/SavedDraftsPanel";
import SettingsPanel from "@/components/SettingsPanel";
import { ArrowIcon, CheckIcon, ClockIcon, FileTextIcon, SearchIcon, SettingsIcon, ShieldIcon, SparklesIcon } from "@/components/icons";
import { createDemoPhotos, DEMO_BRIEF, DEMO_RESULT } from "@/lib/demo";
import type { GenerateRequest, GenerateResult, PhotoInput, SavedDraft, SavedDraftSummary } from "@/lib/types";

type FormState = Omit<GenerateRequest, "photos">;

const AUTOSAVE_KEY = "starlog:brief:v2";

const initialForm: FormState = {
  topic: "", notes: "", impressions: "", verifiedFacts: "", primaryKeyword: "", category: "국내여행",
  length: "standard", contentGoal: "experience", audience: "처음 방문하는 독자", tone: "balanced", callToAction: "",
};

const stages = ["사진의 장면과 순서 분석", "공식·신뢰 출처 검색", "문체와 정보 흐름 구성", "SEO·사실 표현 최종 점검"];

function briefScore(form: FormState, photoCount: number) {
  let score = form.topic.trim().length >= 5 ? 15 : form.topic.trim().length >= 2 ? 8 : 0;
  score += form.notes.trim().length >= 120 ? 30 : form.notes.trim().length >= 40 ? 22 : form.notes.trim().length >= 10 ? 12 : 0;
  score += photoCount >= 5 ? 20 : photoCount > 0 ? 12 : 0;
  if (form.impressions.trim().length >= 20) score += 10;
  if (form.verifiedFacts.trim().length >= 10) score += 10;
  if (form.primaryKeyword.trim()) score += 10;
  if (form.audience.trim()) score += 5;
  return Math.min(score, 100);
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [resultPhotos, setResultPhotos] = useState<PhotoInput[]>([]);
  const [resultCategory, setResultCategory] = useState(initialForm.category);
  const [resultBrief, setResultBrief] = useState<FormState>(initialForm);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraftSummary[]>([]);
  const [savedDraftsOpen, setSavedDraftsOpen] = useState(false);
  const [savedDraftsLoading, setSavedDraftsLoading] = useState(false);
  const [savedDraftsError, setSavedDraftsError] = useState("");
  const [currentSavedDraftId, setCurrentSavedDraftId] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [codexStatus, setCodexStatus] = useState<"checking" | "ready" | "login">("checking");
  const score = useMemo(() => briefScore(form, photos.length), [form, photos.length]);

  const loadSavedDrafts = useCallback(async () => {
    setSavedDraftsLoading(true);
    setSavedDraftsError("");
    try {
      const response = await fetch("/api/drafts", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "저장된 초안 목록을 불러오지 못했습니다.");
      setSavedDrafts(Array.isArray(data?.drafts) ? data.drafts : []);
    } catch (error) {
      setSavedDraftsError(error instanceof Error ? error.message : "저장된 초안 목록을 불러오지 못했습니다.");
    } finally {
      setSavedDraftsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/status", { cache: "no-store" }).then((response) => response.json()).then((data) => setCodexStatus(data.ready ? "ready" : "login")).catch(() => setCodexStatus("login"));
    void loadSavedDrafts();
    try {
      const savedBrief = window.localStorage.getItem(AUTOSAVE_KEY);
      if (savedBrief) setForm({ ...initialForm, ...JSON.parse(savedBrief) });
    } catch {
      window.localStorage.removeItem(AUTOSAVE_KEY);
    } finally { setHydrated(true); }
  }, [loadSavedDrafts]);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => { window.localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(form)); setSaveState("saved"); }, 450);
    return () => window.clearTimeout(timer);
  }, [form, hydrated]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function saveCurrentDraft(draft: GenerateResult) {
    const query = currentSavedDraftId ? `?id=${encodeURIComponent(currentSavedDraftId)}` : "";
    const response = await fetch(`/api/drafts${query}`, {
      method: currentSavedDraftId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: draft, photos: resultPhotos, category: resultCategory, brief: resultBrief }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.draft) throw new Error(data?.error || "초안을 저장하지 못했습니다.");
    const summary = data.draft as SavedDraftSummary;
    setCurrentSavedDraftId(summary.id);
    setSavedDrafts((current) => [summary, ...current.filter((item) => item.id !== summary.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }

  async function openSavedDraft(id: string) {
    if (result && id !== currentSavedDraftId && !window.confirm("현재 화면의 초안 대신 저장된 초안을 불러올까요?\n저장하지 않은 수정 내용은 사라질 수 있습니다.")) return;
    setSavedDraftsLoading(true);
    setSavedDraftsError("");
    try {
      const response = await fetch(`/api/drafts?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.draft) throw new Error(data?.error || "저장된 초안을 불러오지 못했습니다.");
      const saved = data.draft as SavedDraft;
      const brief = { ...initialForm, ...saved.brief, category: saved.category };
      setForm(brief);
      setPhotos(saved.photos);
      setResult(saved.result);
      setResultPhotos(saved.photos);
      setResultCategory(saved.category);
      setResultBrief(brief);
      setCurrentSavedDraftId(saved.id);
      setError("");
      setSavedDraftsOpen(false);
      window.setTimeout(() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (error) {
      setSavedDraftsError(error instanceof Error ? error.message : "저장된 초안을 불러오지 못했습니다.");
    } finally {
      setSavedDraftsLoading(false);
    }
  }

  async function deleteSavedDraft(draft: SavedDraftSummary) {
    if (!window.confirm(`‘${draft.title}’ 초안을 삭제할까요?\n삭제한 초안은 복구할 수 없습니다.`)) return;
    setSavedDraftsError("");
    try {
      const response = await fetch(`/api/drafts?id=${encodeURIComponent(draft.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "저장된 초안을 삭제하지 못했습니다.");
      setSavedDrafts((current) => current.filter((item) => item.id !== draft.id));
      if (currentSavedDraftId === draft.id) setCurrentSavedDraftId("");
    } catch (error) {
      setSavedDraftsError(error instanceof Error ? error.message : "저장된 초안을 삭제하지 못했습니다.");
    }
  }

  function resetWorkspace() {
    if (!window.confirm("현재 작성 중인 입력과 사진을 비우고 새 기록을 시작할까요?")) return;
    setForm(initialForm); setPhotos([]); setResult(null); setResultPhotos([]); setResultBrief(initialForm); setCurrentSavedDraftId(""); setError(""); window.localStorage.removeItem(AUTOSAVE_KEY);
  }

  function loadDemoExample() {
    const hasCurrentWork = Boolean(form.topic.trim() || form.notes.trim() || photos.length || result);
    if (hasCurrentWork && !window.confirm("현재 입력 대신 공개 데모 예시를 불러올까요?\n저장하지 않은 내용은 화면에서 사라질 수 있습니다.")) return;
    const demoPhotos = createDemoPhotos();
    const demoBrief = { ...DEMO_BRIEF };
    setForm(demoBrief);
    setPhotos(demoPhotos);
    setResult(structuredClone(DEMO_RESULT));
    setResultPhotos(demoPhotos);
    setResultCategory(demoBrief.category);
    setResultBrief(demoBrief);
    setCurrentSavedDraftId("");
    setError("");
    window.setTimeout(() => document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!form.topic.trim() || form.notes.trim().length < 10) { setError("주제와 내용을 조금 더 구체적으로 적어주세요."); return; }
    setLoading(true); setResult(null); setStage(0);
    const submittedPhotos = photos;
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 3600);
    try {
      const response = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, photos: submittedPhotos }) });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || (response.status === 413 ? "사진 전체 용량이 너무 큽니다. 일부 사진을 줄여주세요." : "초안을 만들지 못했습니다."));
      if (!data?.result) throw new Error("초안 결과를 읽지 못했습니다.");
      const nextResult = data.result as GenerateResult;
      setResult(nextResult); setResultPhotos(submittedPhotos); setResultCategory(form.category); setResultBrief({ ...form }); setCurrentSavedDraftId("");
    } catch (err) { setError(err instanceof Error ? err.message : "초안을 만들지 못했습니다."); }
    finally { window.clearInterval(timer); setLoading(false); }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Starlog 스튜디오 홈"><span><SparklesIcon size={19} /></span><strong>Starlog</strong><em>STUDIO</em></a>
        <nav><a href="#studio">새 글 쓰기</a><a href="#principles">제작 원칙</a><span className={`status ${codexStatus}`}><i />{codexStatus === "ready" ? "작성 준비 완료" : codexStatus === "login" ? "로그인 필요" : "연결 확인 중"}</span><button type="button" className="header-settings" onClick={() => setSettingsOpen(true)} aria-label="프로젝트 설정"><SettingsIcon size={17} /></button></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy"><span className="eyebrow"><span /> 사진에서 게시 준비까지</span><h1>사진 속 순간을<br /><em>읽히는 이야기</em>로.</h1><p>흩어진 사진과 짧은 메모만 남겨주세요.<br />경험의 결은 살리고, 필요한 정보는 확인해 내 문체의 블로그 초안으로 완성합니다.</p><div className="hero-trust"><span><CheckIcon size={14} /> 초안 자동 저장</span><span><CheckIcon size={14} /> 출처 함께 확인</span><span><CheckIcon size={14} /> 썸네일까지 완성</span></div></div>
        <div className="hero-card" aria-label="Starlog 주요 기능"><span className="hero-card-label">하나의 흐름으로 완성</span><div><strong>01</strong><span>사진과 메모에서<br />핵심 장면 정리</span></div><div><strong>02</strong><span>공식 출처로<br />필요한 정보 확인</span></div><div><strong>03</strong><span>글·SEO·썸네일까지<br />게시 준비</span></div></div>
      </section>

      <section className="workspace-shell" id="studio">
        <div className="workspace-toolbar"><div><span className="live-dot" /> 새 글 만들기 <small>사진과 메모를 게시용 초안으로</small></div><div className="toolbar-actions"><span className="autosave-state"><CheckIcon size={13} />{saveState === "saved" ? "입력 자동 저장됨" : "저장 중…"}</span><button type="button" className="demo-load-button" onClick={loadDemoExample}><SparklesIcon size={14} />예시 불러오기</button><button type="button" onClick={() => { setSavedDraftsOpen(true); void loadSavedDrafts(); }}><FileTextIcon size={14} />저장된 초안{savedDrafts.length > 0 ? ` ${savedDrafts.length}` : ""}</button><button type="button" onClick={resetWorkspace}>+ 새 글</button></div></div>

        <div className="workspace-grid">
          <form className="composer" onSubmit={submit}>
            <div className="panel-heading brief-heading"><div><span>01</span><div><h2>글감 정리</h2><p>기억나는 장면부터 편하게 적어주세요.</p></div></div><div className={`brief-score ${score >= 70 ? "good" : ""}`} style={{ "--brief-score": score } as React.CSSProperties}><strong>{score}</strong><span>준비도</span></div></div>
            <div className="brief-diagnostics" aria-label="초안 준비 상태"><span className={form.notes.length >= 40 ? "done" : ""}><CheckIcon size={12} /> 구체적 메모</span><span className={photos.length > 0 ? "done" : ""}><CheckIcon size={12} /> 현장 사진</span><span className={form.impressions.length >= 20 ? "done" : ""}><CheckIcon size={12} /> 개인 감상</span><span className={form.verifiedFacts.length >= 10 ? "done" : ""}><CheckIcon size={12} /> 직접 확인 정보</span></div>

            <label className="field"><span>글의 주제 *</span><input value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="예: 청주 옛청주역사 전시관 방문 후기" maxLength={120} /></label>
            <div className="field-row field-row-3"><label className="field"><span>카테고리</span><select value={form.category} onChange={(event) => update("category", event.target.value)}><option>국내여행</option><option>해외여행</option><option>전시/관람</option><option>Festival/Camp</option><option>강연/기고</option><option>에세이</option><option>맛집/카페</option></select></label><label className="field"><span>콘텐츠 목적</span><select value={form.contentGoal} onChange={(event) => update("contentGoal", event.target.value as GenerateRequest["contentGoal"])}><option value="experience">방문 경험</option><option value="guide">정보 가이드</option><option value="review">솔직 리뷰</option><option value="recap">행사 기록</option></select></label><label className="field"><span>글 길이</span><select value={form.length} onChange={(event) => update("length", event.target.value as GenerateRequest["length"])}><option value="short">짧게</option><option value="standard">표준</option><option value="long">상세하게</option></select></label></div>
            <label className="field"><span>주제와 내용 *</span><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="어디를 갔는지, 무엇을 했는지, 메뉴·동선·기억할 정보를 실제 순서대로 적어주세요." rows={6} maxLength={8000} /><small>{form.notes.length.toLocaleString()} / 8,000</small></label>
            <div className="field-row"><label className="field"><span>핵심 독자</span><input value={form.audience} onChange={(event) => update("audience", event.target.value)} placeholder="예: 아이와 처음 방문하는 가족" maxLength={120} /></label><label className="field"><span>표현 톤</span><select value={form.tone} onChange={(event) => update("tone", event.target.value as GenerateRequest["tone"])}><option value="balanced">담백하고 균형 있게</option><option value="warm">따뜻하고 개인적으로</option><option value="informative">정보 밀도 높게</option><option value="lively">현장감 있게</option></select></label></div>
            <label className="field"><span>개인적인 감상</span><textarea value={form.impressions} onChange={(event) => update("impressions", event.target.value)} placeholder="좋았던 점, 아쉬웠던 점, 예상과 달랐던 점을 내 말투로 적어주세요." rows={3} maxLength={4000} /></label>

            <div className="divider"><span>사진과 검증 자료</span></div><div className="field"><span>사진</span><PhotoDropzone photos={photos} onChange={setPhotos} /></div>
            <details className="advanced-brief" open={Boolean(form.primaryKeyword || form.verifiedFacts || form.callToAction)}><summary><span><SettingsIcon size={15} /> 검색·전환 상세 설정</span><small>키워드, 확인 정보, 행동 유도</small></summary><div className="advanced-brief-content"><label className="field"><span>희망 핵심키워드</span><div className="input-with-icon"><SearchIcon size={17} /><input value={form.primaryKeyword} onChange={(event) => update("primaryKeyword", event.target.value)} placeholder="비워두면 검색 후 자연스럽게 선정합니다" maxLength={80} /></div></label><label className="field"><span>직접 확인한 정보</span><textarea value={form.verifiedFacts} onChange={(event) => update("verifiedFacts", event.target.value)} placeholder="현장 안내문에서 본 운영시간, 실제 결제 가격, 주차 정보 등" rows={3} maxLength={4000} /></label><label className="field"><span>원하는 마무리 행동</span><input value={form.callToAction} onChange={(event) => update("callToAction", event.target.value)} placeholder="예: 방문 전 공식 예약 페이지 확인을 권해주세요" maxLength={500} /></label></div></details>
            <button type="button" className="project-settings-note" onClick={() => setSettingsOpen(true)}><SettingsIcon size={17} /><span><strong>내 문체와 작성 규칙 자동 적용</strong><small>작성글 자료실, 공통 초안 지침과 썸네일 규칙을 관리합니다.</small></span><em>설정 열기</em></button>
            {error && <div className="form-error">{error}</div>}
            <button className="generate-button" type="submit" disabled={loading}><span>{loading ? "자료를 읽고 있습니다" : "검증된 초안 만들기"}</span>{loading ? <span className="spinner" /> : <ArrowIcon size={19} />}</button>
            <p className="submit-note"><ShieldIcon size={14} /> 임시 사진 파일은 생성 후 삭제되며, 초안을 저장하면 압축 사진이 프로젝트에 함께 보관됩니다.</p>
          </form>

          <div className="preview-pane">
            {loading ? <div className="loading-card"><div className="orbit"><SparklesIcon size={25} /></div><span className="eyebrow">AGENT IS WORKING</span><h2>{stages[stage]}</h2><p>{photos.length > 30 ? "사진이 많아 몇 분 정도 걸릴 수 있습니다." : "브리프, 사진과 프로젝트 문체를 중심으로 필요한 정보만 확인하고 있습니다."}</p><div className="stage-list">{stages.map((item, index) => <div className={index < stage ? "done" : index === stage ? "active" : ""} key={item}><span>{index < stage ? <CheckIcon size={13} /> : index + 1}</span>{item}</div>)}</div></div> : result ? <DraftResult result={result} photos={resultPhotos} category={resultCategory} onSave={saveCurrentDraft} /> : (
              <div className="empty-state"><div className="empty-visual"><span><FileTextIcon size={30} /></span><i /><i /><b><SparklesIcon size={16} /></b></div><span className="eyebrow">READY FOR YOUR STORY</span><h2>글감이 초안이 되는 자리</h2><p>왼쪽에 경험을 적으면 문체·사진·최신 출처를 연결해<br />게시 전에 검토하기 좋은 형태로 정리합니다.</p><button type="button" className="empty-demo-button" onClick={loadDemoExample}><SparklesIcon size={16} />완성된 예시 먼저 보기<ArrowIcon size={16} /></button><div className="empty-features"><span><ClockIcon size={16} /> 1–8분</span><span><ShieldIcon size={16} /> 출처 확인</span><span><SearchIcon size={16} /> SEO 진단</span></div>{savedDrafts.length > 0 && <div className="recent-drafts"><div className="recent-heading"><strong>저장된 초안</strong><button type="button" onClick={() => setSavedDraftsOpen(true)}>전체 보기</button></div>{savedDrafts.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => void openSavedDraft(item.id)}><span>{item.category}</span><strong>{item.title}</strong><small>{new Date(item.updatedAt).toLocaleDateString("ko-KR")}</small><ArrowIcon size={15} /></button>)}</div>}</div>
            )}
          </div>
        </div>
      </section>

      <section className="principles" id="principles" aria-label="Starlog 제작 원칙"><div><span>01</span><strong>경험이 먼저</strong><p>검색 정보로 사용자의 경험을 덮어쓰지 않습니다.</p></div><div><span>02</span><strong>출처가 보이게</strong><p>변동 정보와 외부 사실은 확인한 근거를 남깁니다.</p></div><div><span>03</span><strong>게시 전 사람이 검토</strong><p>자동 게시보다 마지막 판단과 수정 권한을 우선합니다.</p></div></section>
      <footer><span>Starlog AI</span><p>경험은 사용자에게, 정보는 검증된 출처에게서.</p><small>초안은 게시 전 반드시 직접 검토하세요.</small></footer>
      <button type="button" className="settings-launcher" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog"><SettingsIcon size={18} /><span>프로젝트 설정</span></button>
      <SavedDraftsPanel open={savedDraftsOpen} drafts={savedDrafts} loading={savedDraftsLoading} error={savedDraftsError} onClose={() => setSavedDraftsOpen(false)} onRefresh={() => void loadSavedDrafts()} onOpen={(id) => void openSavedDraft(id)} onDelete={(draft) => void deleteSavedDraft(draft)} />
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>
  );
}
