import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectSettings } from "./types";

const DATA_ROOT = path.join(process.cwd(), ".starlog-data");
const SETTINGS_PATH = path.join(DATA_ROOT, "settings.json");
const TEMP_SETTINGS_PATH = path.join(DATA_ROOT, "settings.tmp.json");
export const MAX_GUIDELINES_CHARS = 12_000;
export const MAX_THUMBNAIL_GUIDELINES_CHARS = 8_000;

export const DEFAULT_THUMBNAIL_GUIDELINES = `- 정사각형 썸네일로 제작합니다.
- 1080×1080 캔버스의 상단 740px에는 글을 대표하는 사진 1~3장을 배치합니다.
- 하단 340px에는 네이비에서 퍼플로 이어지는 정보 영역을 두고 크림색 제목을 크게 표시합니다.
- 제목은 원래 제목에서 장소나 대상을 중심으로 2~10자의 짧은 문구로 줄입니다.
- 제목 아래에는 위치·지점 한 줄과 핵심 키워드 2~3개를 금색으로 표시합니다.
- 상단 왼쪽에는 지역과 카테고리를 라벤더 테두리의 작은 라벨로 표시합니다.
- 우하단에는 금색 5각별과 '기록을 이야기로 · Starlog' 서명을 각각 그려 고정합니다.
- 매 썸네일에서 색상, 여백, 글꼴 크기와 브랜드 표기를 일관되게 유지합니다.`;

const THUMBNAIL_GUIDELINE_SUPPLEMENT = `[프로젝트 썸네일 보완 규칙]
- 배지는 '[지역·동네] · [카테고리]' 형식으로 작성합니다.
- 음식점·분식·국밥은 맛집, 카페·커피 전문점은 카페, 베이커리는 빵지순례, 소품샵·편집숍은 소품샵, 디저트 전문점은 디저트 맛집으로 분류합니다.
- 전시·박물관은 가볼만한 곳 또는 전시관람, 체험은 원데이클래스, 축제·템플스테이·국내여행은 가볼만한 곳, 해외여행은 해외여행, 강연은 세미나, 자동차 DIY는 셀프 수리로 분류합니다.
- 배지는 기본 좌상단에 두고, 주요 피사체가 좌상단에 있으면 우상단으로 옮깁니다.
- 음식·제품이 중앙에 오도록 사진별 중심점을 정하고, 얼굴·포크·컵·영수증 같은 잡요소는 프레임 밖이나 밴드 뒤로 보냅니다.
- 제품 클로즈업은 1.15~1.22배 확대하고 상단을 살립니다. 야간 사진은 밝기를 1.08~1.12로 보정합니다.
- 한 장만으로 핵심 대상이 분명하면 대표 사진 1장을 화면 가득 사용합니다. 사진 수가 많다는 이유만으로 콜라주를 만들지 않습니다.
- 서로 다른 장면 3장을 함께 보여줄 가치가 있을 때만 좌측 540×740 메인, 우측 540×370 두 장의 3분할 콜라주를 사용하고 흰색 3px 구분선을 넣습니다.
- 사진 영역에는 전체를 어둡게 만드는 오버레이나 그라데이션을 넣지 않고 원본의 밝기와 음식·전시의 색감을 살립니다.
- 제목은 상호명·장소명·행사명을 사용하고, 긴 경우 자동으로 글자 크기를 줄입니다. 영문 브랜드명은 부제에 병기할 수 있습니다.
- 제목은 2~6자를 우선하고 정보 영역 위쪽에 붙이지 않으며, 부제는 '위치 | 지점·콘텐츠 성격' 형식으로 정리합니다.
- 음식점과 빵집은 대표 메뉴 2~3개, 카페는 시그니처 음료와 분위기, 전시는 전시명·체험·무료입장·지역 나들이, 클래스는 만든 것과 체험, 축제는 주요 행사와 지역, 자동차는 수리 부위·DIY·셀프 수리를 키워드로 고릅니다. 화면에는 가장 구체적인 키워드 3개만 표시합니다.
- 가격이 핵심 장점이면 '9,900원 무한리필'처럼 가격을 직접 표시할 수 있습니다.
- 간판·가격표가 중요하면 크롭에 포함하고, 사람 얼굴은 중심을 이동해 프레임 밖으로 처리합니다.
- 배지와 서명의 별은 텍스트 문자가 아니라 금색 5각별로 별도 렌더링합니다.
- 출력 파일명은 소문자 ASCII snake_case로 만들고 '_thumbnail.jpg'로 끝냅니다.
- 팔레트는 NAVY #182044, PURPLE #4e3e78, LAV #bcace0, STAR #ffdf80, CREAM #faf6f0, SUB #cdc4e6을 사용합니다.`;

function withThumbnailSupplement(value: string) {
  const base = value.trim() || DEFAULT_THUMBNAIL_GUIDELINES;
  if (base.includes("[프로젝트 썸네일 보완 규칙]")) {
    return base.slice(0, MAX_THUMBNAIL_GUIDELINES_CHARS);
  }
  return `${base}\n\n${THUMBNAIL_GUIDELINE_SUPPLEMENT}`.slice(0, MAX_THUMBNAIL_GUIDELINES_CHARS);
}

const DEFAULT_SETTINGS: ProjectSettings = {
  guidelines: "",
  thumbnailGuidelines: withThumbnailSupplement(DEFAULT_THUMBNAIL_GUIDELINES),
  updatedAt: null,
};

export async function readProjectSettings(): Promise<ProjectSettings> {
  await mkdir(DATA_ROOT, { recursive: true });
  try {
    const parsed = JSON.parse(await readFile(SETTINGS_PATH, "utf8")) as Partial<ProjectSettings>;
    const savedGuidelines = typeof parsed.guidelines === "string" ? parsed.guidelines : "";
    const thumbnailMarker = savedGuidelines.search(/\[썸네일\s*표준/i);
    const migratedThumbnailGuidelines = thumbnailMarker >= 0 ? savedGuidelines.slice(thumbnailMarker).trim() : "";
    const articleGuidelines = thumbnailMarker >= 0 ? savedGuidelines.slice(0, thumbnailMarker).trim() : savedGuidelines;
    return {
      guidelines: articleGuidelines.slice(0, MAX_GUIDELINES_CHARS),
      thumbnailGuidelines: withThumbnailSupplement(
        typeof parsed.thumbnailGuidelines === "string"
          ? parsed.thumbnailGuidelines
          : migratedThumbnailGuidelines,
      ),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_SETTINGS;
    throw new Error("프로젝트 설정을 읽지 못했습니다.");
  }
}

export async function saveProjectSettings(guidelines: string, thumbnailGuidelines: string): Promise<ProjectSettings> {
  const normalized = guidelines.replace(/\r\n?/g, "\n").trim();
  const normalizedThumbnailGuidelines = thumbnailGuidelines.replace(/\r\n?/g, "\n").trim();
  if (normalized.length > MAX_GUIDELINES_CHARS) {
    throw new Error(`초안 작성 지침은 ${MAX_GUIDELINES_CHARS.toLocaleString()}자 이하여야 합니다.`);
  }
  if (normalizedThumbnailGuidelines.length > MAX_THUMBNAIL_GUIDELINES_CHARS) {
    throw new Error(`썸네일 지침은 ${MAX_THUMBNAIL_GUIDELINES_CHARS.toLocaleString()}자 이하여야 합니다.`);
  }

  await mkdir(DATA_ROOT, { recursive: true });
  const settings: ProjectSettings = {
    guidelines: normalized,
    thumbnailGuidelines: withThumbnailSupplement(normalizedThumbnailGuidelines),
    updatedAt: new Date().toISOString(),
  };
  await writeFile(TEMP_SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf8");
  await rename(TEMP_SETTINGS_PATH, SETTINGS_PATH);
  return settings;
}
