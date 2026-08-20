export type PhotoInput = {
  name: string;
  dataUrl: string;
};

export type WritingLibraryFile = {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  bytes: number;
  charCount: number;
  createdAt: string;
};

export type ProjectSettings = {
  guidelines: string;
  thumbnailGuidelines: string;
  updatedAt: string | null;
};

export type GenerateRequest = {
  topic: string;
  notes: string;
  impressions: string;
  verifiedFacts: string;
  primaryKeyword: string;
  category: string;
  length: "short" | "standard" | "long";
  contentGoal: "experience" | "guide" | "review" | "recap";
  audience: string;
  tone: "balanced" | "warm" | "informative" | "lively";
  callToAction: string;
  photos: PhotoInput[];
};

export type Source = {
  title: string;
  url: string;
  domain: string;
  supportedClaim: string;
};

export type SectionPhoto = {
  photoIndex: number;
  photoCaption: string;
  photoAlt: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  photos: SectionPhoto[];
};

export type SeoCheck = {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

export type ThumbnailSpec = {
  eyebrow: string;
  headline: string;
  subtitle: string;
  keywords: string[];
  photoIndexes: number[];
  badgePosition: "left" | "right";
  fileName: string;
  photoSettings: ThumbnailPhotoSetting[];
};

export type ThumbnailPhotoSetting = {
  photoIndex: number;
  focusX: number;
  focusY: number;
  zoom: number;
  brightness: number;
};

export type GenerateResult = {
  title: string;
  metaDescription: string;
  authorLine: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  sections: BlogSection[];
  hashtags: string[];
  sources: Source[];
  factCheckNotes: string[];
  photoInsights: string[];
  thumbnail: ThumbnailSpec;
  seo: {
    score: number;
    checks: SeoCheck[];
    keywordUsage: { keyword: string; count: number }[];
  };
};

export type ReviseRequest = {
  instruction: string;
  category: string;
  photoCount: number;
  result: GenerateResult;
};

export type DraftBrief = Omit<GenerateRequest, "photos">;

export type SavedDraftSummary = {
  id: string;
  title: string;
  category: string;
  photoCount: number;
  bytes: number;
  createdAt: string;
  updatedAt: string;
};

export type SavedDraft = SavedDraftSummary & {
  brief: DraftBrief;
  result: GenerateResult;
  photos: PhotoInput[];
};
