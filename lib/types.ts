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
