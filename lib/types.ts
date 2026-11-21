export type ElementType =
  | "text"
  | "shape"
  | "image"
  | "icon"
  | "draw"
  | "table"
  | "chart"
  | "qrcode";

export type ShapeKind =
  | "rect"
  | "circle"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "star"
  | "arrow"
  | "pill"
  | "bubble"
  | "blob"
  | "line";

export type FrameMask =
  | "none"
  | "circle"
  | "rounded"
  | "arch"
  | "hexagon"
  | "star"
  | "blob"
  | "phone"
  | "laptop";

export type FilterPreset =
  | "none"
  | "vivid"
  | "warm"
  | "cool"
  | "bw"
  | "vintage"
  | "drama"
  | "fade";

export type ImageFilters = {
  preset: FilterPreset;
  brightness: number; // 0-200, default 100
  contrast: number; // 0-200, default 100
  saturation: number; // 0-200, default 100
  blur: number; // 0-20, default 0
  hue: number; // -180 to 180, default 0
  vignette: number; // 0-100, default 0
};

export type ImageCrop = {
  x: number; // 0-100 %
  y: number; // 0-100 %
  width: number; // 1-100 %
  height: number; // 1-100 %
};

export type ChartKind = "bar" | "line" | "pie" | "donut";

export type ChartDataPoint = {
  label: string;
  value: number;
  color?: string;
};

export type BaseElement = {
  id: string;
  type: ElementType;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  flipX?: boolean;
  flipY?: boolean;
};

export type TextElement = BaseElement & {
  type: "text";
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  strokeColor?: string;
  strokeWidth?: number;
  curve?: number; // -100 to 100
};

export type ShapeElement = BaseElement & {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  gradientTo?: string;
  gradientAngle?: number;
  stroke: string;
  strokeWidth: number;
  strokeDash?: "solid" | "dashed" | "dotted";
  borderRadius?: number;
};

export type ImageElement = BaseElement & {
  type: "image";
  src: string;
  originalSrc?: string;
  fit: "cover" | "contain";
  borderRadius: number;
  mask: FrameMask;
  filters: ImageFilters;
  crop?: ImageCrop;
  cropZoom?: number; // 1-3, default 1
  cropOffsetX?: number; // -50 to 50 (% of frame width)
  cropOffsetY?: number; // -50 to 50 (% of frame height)
  stroke?: string;
  strokeWidth?: number;
};

export type IconElement = BaseElement & {
  type: "icon";
  iconId: string;
  color: string;
  strokeWidth: number;
  fillColor?: string;
};

export type DrawElement = BaseElement & {
  type: "draw";
  points: { x: number; y: number }[];
  color: string;
  strokeWidth: number;
  brush: "pen" | "marker" | "highlighter";
};

export type TableElement = BaseElement & {
  type: "table";
  rows: string[][];
  headerBg: string;
  headerColor: string;
  cellBg: string;
  cellColor: string;
  borderColor: string;
  fontSize: number;
  fontFamily: string;
};

export type ChartElement = BaseElement & {
  type: "chart";
  chartKind: ChartKind;
  title?: string;
  data: ChartDataPoint[];
  accentColor: string;
  textColor: string;
  showValues?: boolean;
};

export type QrCodeElement = BaseElement & {
  type: "qrcode";
  value: string;
  fgColor: string;
  bgColor: string;
};

export type CanvasElement =
  | TextElement
  | ShapeElement
  | ImageElement
  | IconElement
  | DrawElement
  | TableElement
  | ChartElement
  | QrCodeElement;

export type PageTransition = "none" | "fade" | "slide" | "zoom";

export type DesignPage = {
  id: string;
  name: string;
  background: string;
  backgroundGradientTo?: string;
  backgroundGradientAngle?: number;
  backgroundImage?: string;
  notes?: string;
  transition?: PageTransition;
  elements: CanvasElement[];
};

export type DesignComment = {
  id: string;
  pageId: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  authorName: string;
  authorEmail: string;
  text: string;
  resolved?: boolean;
  createdAt: number;
  replies: {
    id: string;
    authorName: string;
    authorEmail: string;
    text: string;
    createdAt: number;
  }[];
};

export type DesignVersion = {
  id: string;
  label: string;
  createdAt: number;
  createdBy: string;
  pages: DesignPage[];
  width: number;
  height: number;
};

export type AccessLevel = "off" | "view" | "comment" | "edit" | "template";

export type SharePerson = {
  email: string;
  access: "view" | "comment" | "edit" | "full";
};

export type ShareConfig = {
  linkAccess: AccessLevel;
  people: SharePerson[];
};

export type DesignCategory =
  | "presentation"
  | "social"
  | "marketing"
  | "document"
  | "logo"
  | "photo"
  | "custom";

export type DesignSummary = {
  id: string;
  title: string;
  category: DesignCategory;
  folderId: string | null;
  starred: boolean;
  trashed: boolean;
  width: number;
  height: number;
  pageCount: number;
  thumbnail: string;
  shareConfig: ShareConfig;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
};

export type DesignRecord = DesignSummary & {
  pages: DesignPage[];
  comments: DesignComment[];
  versions: DesignVersion[];
};

export type FolderRecord = {
  id: string;
  name: string;
  createdAt: number;
};

export type BrandLogoItem = {
  id: string;
  name: string;
  variant: "primary" | "dark" | "icon";
  dataUrl: string;
  width?: number;
  height?: number;
  createdAt: number;
};

export type CustomFontItem = {
  id: string;
  name: string;
  source: "upload" | "google";
  dataUrl?: string;
  format?: string;
  createdAt: number;
};

export type BrandKit = {
  name: string;
  logos: BrandLogoItem[];
  colors: string[];
  fonts: {
    heading: string;
    subheading: string;
    body: string;
  };
  customFonts?: CustomFontItem[];
  updatedAt: number;
};

export type MediaAsset = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: number;
};

export type TemplateRecord = {
  id: string;
  title: string;
  category: DesignCategory;
  tags: string[];
  width: number;
  height: number;
  thumbnail?: string;
  isCustom?: boolean;
  pages: DesignPage[];
};

export type AuthUserInfo = {
  authenticated: boolean;
  bi_id: string;
  person_key: string;
  display_name: string;
  email: string;
  entity_type: "user" | "agent";
  mauth_enabled: boolean;
};

export const DEFAULT_IMAGE_FILTERS: ImageFilters = {
  preset: "none",
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  hue: 0,
  vignette: 0,
};

export const DEFAULT_BRAND_KIT: BrandKit = {
  name: "My Brand",
  logos: [],
  colors: ["#141417", "#2563EB", "#52525B", "#E4E4E7", "#FAFAFA"],
  fonts: {
    heading: "Plus Jakarta Sans",
    subheading: "Inter",
    body: "Inter",
  },
  updatedAt: 0,
};
