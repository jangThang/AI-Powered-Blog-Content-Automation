import type { DraftBrief, GenerateResult, PhotoInput } from "@/lib/types";

export const DEMO_BRIEF: DraftBrief = {
  topic: "초여름 호수공원 산책 후기",
  notes: "오후 5시쯤 공원에 도착해 나무 데크를 따라 천천히 걸었습니다. 햇빛이 강하지 않았고 호수 쪽으로 바람이 불어 걷기 편했습니다. 전망 쉼터에서 잠시 쉬고, 해가 낮아질 때 물가 풍경을 사진으로 남겼습니다. 붐비는 구간을 지나 안쪽 산책로로 들어가니 훨씬 조용했습니다.",
  impressions: "화려한 볼거리보다 천천히 걷는 시간이 좋았습니다. 노을빛이 물에 번지는 순간이 가장 기억에 남고, 다음에는 간단한 음료를 챙겨 조금 더 오래 머물고 싶습니다.",
  verifiedFacts: "공개 데모를 위한 가상 기록입니다. 실제 장소의 운영시간·주차·요금 정보가 아닙니다.",
  primaryKeyword: "호수공원 산책",
  category: "국내여행",
  length: "standard",
  contentGoal: "experience",
  audience: "조용한 산책 장소를 찾는 독자",
  tone: "balanced",
  callToAction: "방문 전 실제 공원 공식 안내를 확인하도록 안내해주세요.",
};

export const DEMO_RESULT: GenerateResult = {
  title: "초여름 호수공원 산책, 노을이 좋았던 조용한 오후",
  metaDescription: "초여름 오후 호수공원을 천천히 걸으며 만난 산책로와 노을 풍경을 담은 가상 데모 후기입니다.",
  authorLine: "기록 · Starlog 공개 데모",
  primaryKeyword: "호수공원 산책",
  secondaryKeywords: ["초여름 산책", "노을 산책", "도심 근교 나들이"],
  sections: [
    {
      heading: "바람이 가벼웠던 산책의 시작",
      paragraphs: [
        "오후 5시 무렵 공원에 도착했습니다. 햇빛은 한결 부드러워졌고 호수에서 불어오는 바람 덕분에 첫걸음부터 여유가 느껴졌어요.",
        "입구에서 바로 보이는 넓은 길보다 나무 데크를 따라 걷기로 했습니다. 빠르게 둘러보기보다 눈에 들어오는 장면마다 잠시 멈추는 쪽이 이날의 분위기와 잘 맞았습니다.",
      ],
      photos: [{ photoIndex: 0, photoCaption: "초여름 빛이 내려앉은 호수 산책로", photoAlt: "나무와 호수가 보이는 초여름 공원 산책로" }],
    },
    {
      heading: "조금 안쪽으로 들어가니 달라진 풍경",
      paragraphs: [
        "사람이 모이는 전망 구간을 지나 안쪽 길로 들어가니 주변이 금세 조용해졌습니다. 나무 사이로 이어지는 길과 잔잔한 수면을 번갈아 보며 천천히 걸었어요.",
        "특별한 프로그램이 없어도 걷는 속도를 늦추는 것만으로 충분했습니다. 이런 곳은 많은 일정을 넣기보다 한두 시간 비워두고 찾는 편이 더 잘 어울립니다.",
      ],
      photos: [{ photoIndex: 1, photoCaption: "나무 그늘이 이어지는 안쪽 산책길", photoAlt: "초록 나무 사이로 이어지는 조용한 산책길" }],
    },
    {
      heading: "노을까지 보고 돌아온 이유",
      paragraphs: [
        "해가 낮아지자 호수의 색이 천천히 바뀌었습니다. 가장 인상 깊었던 순간은 노을빛이 물 위로 길게 번질 때였어요.",
        "다음에는 가벼운 음료와 얇은 겉옷을 챙겨 조금 더 오래 머물 생각입니다. 이 글은 화면 구성을 보여주기 위한 가상 예시이므로 실제 방문 전에는 해당 장소의 공식 안내를 확인해주세요.",
      ],
      photos: [{ photoIndex: 2, photoCaption: "물 위로 번지는 저녁 노을", photoAlt: "호수 수면에 비친 주황빛 저녁 노을" }],
    },
  ],
  hashtags: ["호수공원산책", "초여름산책", "노을산책", "도심근교나들이"],
  sources: [],
  factCheckNotes: ["공개 데모를 위해 만든 가상의 장소와 경험입니다.", "실제 게시물 작성 시 운영시간·주차·요금 등 변동 정보는 공식 출처로 다시 확인해야 합니다."],
  photoInsights: ["사진 1은 산책의 시작을 보여주는 넓은 풍경입니다.", "사진 2는 조용한 안쪽 산책로의 분위기를 전달합니다.", "사진 3은 글의 인상적인 마무리가 되는 노을 장면입니다."],
  thumbnail: {
    eyebrow: "도심 근교 · 산책",
    headline: "호수공원 산책",
    subtitle: "초여름 | 노을이 좋았던 오후",
    keywords: ["나무 데크", "호수 풍경", "노을 산책"],
    photoIndexes: [0, 1, 2],
    badgePosition: "left",
    fileName: "호수공원-산책-썸네일.jpg",
    photoSettings: [0, 1, 2].map((photoIndex) => ({ photoIndex, focusX: 0.5, focusY: 0.5, zoom: 1, brightness: 1 })),
  },
  seo: {
    score: 88,
    checks: [
      { label: "제목과 핵심 키워드", status: "pass", detail: "핵심 키워드가 제목에 자연스럽게 포함되어 있습니다." },
      { label: "경험의 구체성", status: "pass", detail: "시간대, 동선과 인상적인 장면이 구체적으로 드러납니다." },
      { label: "변동 정보 확인", status: "warn", detail: "실제 게시 전 공식 운영 정보를 추가로 확인하세요." },
    ],
    keywordUsage: [
      { keyword: "호수공원 산책", count: 3 },
      { keyword: "초여름 산책", count: 2 },
      { keyword: "노을 산책", count: 2 },
    ],
  },
};

type Scene = {
  name: string;
  sky: [string, string];
  sun: string;
  water: string;
  land: string;
  accent: string;
};

const SCENES: Scene[] = [
  { name: "demo-lake-01.jpg", sky: ["#c9e9ea", "#f6e5b9"], sun: "#ffd37b", water: "#70a9ae", land: "#496d50", accent: "#d5b36b" },
  { name: "demo-trail-02.jpg", sky: ["#bad9cf", "#e7ead1"], sun: "#f6d28a", water: "#789fa0", land: "#355b43", accent: "#b98d56" },
  { name: "demo-sunset-03.jpg", sky: ["#8ba7c6", "#f0a36f"], sun: "#ffe1a2", water: "#755f87", land: "#293c3a", accent: "#da8b61" },
];

function drawScene(scene: Scene, index: number): PhotoInput {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("데모 이미지를 만들 수 없습니다.");

  const sky = context.createLinearGradient(0, 0, 0, 590);
  sky.addColorStop(0, scene.sky[0]);
  sky.addColorStop(1, scene.sky[1]);
  context.fillStyle = sky;
  context.fillRect(0, 0, 1200, 900);

  context.fillStyle = scene.sun;
  context.beginPath();
  context.arc(index === 2 ? 825 : 910, index === 2 ? 255 : 185, index === 2 ? 78 : 55, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = scene.land;
  context.beginPath();
  context.moveTo(0, 430);
  for (let x = 0; x <= 1200; x += 120) {
    context.lineTo(x, 390 + Math.sin(x / 105) * 48 + (index === 1 ? Math.cos(x / 72) * 35 : 0));
  }
  context.lineTo(1200, 650);
  context.lineTo(0, 650);
  context.closePath();
  context.fill();

  const water = context.createLinearGradient(0, 460, 0, 900);
  water.addColorStop(0, scene.water);
  water.addColorStop(1, index === 2 ? "#413d63" : "#557f7e");
  context.fillStyle = water;
  context.fillRect(0, 500, 1200, 400);

  context.globalAlpha = 0.38;
  context.fillStyle = scene.sun;
  context.beginPath();
  context.moveTo(index === 2 ? 745 : 850, 500);
  context.lineTo(index === 2 ? 905 : 970, 500);
  context.lineTo(index === 2 ? 1035 : 1070, 900);
  context.lineTo(index === 2 ? 600 : 700, 900);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;

  context.strokeStyle = scene.accent;
  context.lineWidth = 34;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(index === 1 ? 50 : 80, 840);
  context.bezierCurveTo(340, 740, 440, 690, index === 1 ? 720 : 580, 540);
  context.stroke();

  context.fillStyle = "rgba(255,255,255,.88)";
  context.font = "700 22px Arial, sans-serif";
  context.fillText(`STARLOG PUBLIC DEMO  ·  0${index + 1}`, 38, 52);

  return { name: scene.name, dataUrl: canvas.toDataURL("image/jpeg", 0.9) };
}

export function createDemoPhotos(): PhotoInput[] {
  return SCENES.map(drawScene);
}
