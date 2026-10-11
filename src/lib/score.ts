import { stepValue, LADDER } from "./numbers";

export type Platform = "youtube" | "tiktok" | "instagram";
export type Surface = "player" | "grid";
export type ItemKind = "video" | "ad" | "carousel" | "unknown";

export interface Metrics {
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

export type Metric = "likes" | "comments" | "views";
export const METRICS: Metric[] = ["likes", "comments", "views"];
export const PLATFORMS: Platform[] = ["youtube", "tiktok", "instagram"];

export const COVERAGE: Record<Metric, Platform[]> = {
  likes: ["youtube", "tiktok", "instagram"],
  comments: ["tiktok", "instagram"],
  views: ["youtube", "tiktok", "instagram"],
};

export interface Condition {
  on: boolean;
  min: number;
}

export type Rule = Record<Metric, Condition>;
export type PresetName = "lenient" | "balanced" | "strict";
export const PRESETS: PresetName[] = ["lenient", "balanced", "strict"];

export const PRESET_LIKES: Record<PresetName, number> = {
  lenient: 1000,
  balanced: 5000,
  strict: 20000,
};

const SPARE_MIN: Record<"comments" | "views", number> = { comments: 100, views: 100000 };

export interface AllowEntry {
  platform: Platform;
  id: string;
}

export interface Settings {
  enabled: boolean;
  rule: Rule;
  platforms: Record<Platform, boolean>;
  filterGrids: boolean;
  showSkipChip: boolean;
  skipAds: boolean;
  allowlist: AllowEntry[];
}

export const REPO_URL = "https://github.com/jeongjin0/scrollplus";
export const STORAGE_SETTINGS = "settings";
export const STORAGE_DAILY = "dailySkips";

export function presetRule(name: PresetName, base?: Rule): Rule {
  return {
    likes: { on: true, min: PRESET_LIKES[name] },
    comments: { on: false, min: base?.comments.min ?? SPARE_MIN.comments },
    views: { on: false, min: base?.views.min ?? SPARE_MIN.views },
  };
}

export function activePreset(rule: Rule): PresetName | null {
  if (!rule.likes.on || rule.comments.on || rule.views.on) return null;
  return PRESETS.find((name) => PRESET_LIKES[name] === rule.likes.min) ?? null;
}

export function lowerRule(rule: Rule): Rule | null {
  const floor = LADDER[0];
  let changed = false;
  const next = { ...rule };
  for (const metric of METRICS) {
    const condition = rule[metric];
    if (!condition.on || condition.min <= floor) continue;
    next[metric] = { on: true, min: stepValue(condition.min, -1) };
    changed = true;
  }
  return changed ? next : null;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  rule: presetRule("balanced"),
  platforms: { youtube: true, tiktok: true, instagram: true },
  filterGrids: false,
  showSkipChip: true,
  skipAds: false,
  allowlist: [],
};

export interface DailySkips {
  day: string;
  count: number;
}

export function localDay(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeId(platform: Platform, id: string): string {
  const trimmed = id.trim();
  if (platform === "instagram") return trimmed.toLowerCase();
  return trimmed.replace(/^@/, "");
}

export function isAllowlisted(settings: Settings, platform: Platform, creatorId: string | null): boolean {
  if (!creatorId) return false;
  const id = normalizeId(platform, creatorId);
  return settings.allowlist.some((entry) => entry.platform === platform && normalizeId(entry.platform, entry.id) === id);
}

export interface DecideInput {
  settings: Settings;
  platform: Platform;
  surface: Surface;
  creatorId: string | null;
  metrics: Metrics | null;
  kind: ItemKind;
}

export type KeepReason =
  | "disabled"
  | "allowlist"
  | "ad"
  | "carousel"
  | "no-metrics"
  | "grid-off"
  | "unscored"
  | "passes";

export type Decision =
  | { action: "keep"; reason: KeepReason }
  | { action: "skip"; reason: "below"; metric: Metric; value: number; min: number }
  | { action: "skip"; reason: "ad" };

export function decide(input: DecideInput): Decision {
  const { settings, platform, surface, creatorId, metrics, kind } = input;
  if (!settings.enabled || !settings.platforms[platform]) return { action: "keep", reason: "disabled" };
  if (isAllowlisted(settings, platform, creatorId)) return { action: "keep", reason: "allowlist" };
  // Ads are kept unless the user turned Skip ads on. Only the active player is skipped; ad cards in lists stay.
  if (kind === "ad") return settings.skipAds && surface === "player" ? { action: "skip", reason: "ad" } : { action: "keep", reason: "ad" };
  if (kind === "carousel") return { action: "keep", reason: "carousel" };
  if (!metrics) return { action: "keep", reason: "no-metrics" };
  if (surface === "grid" && !settings.filterGrids) return { action: "keep", reason: "grid-off" };
  let checked = 0;
  for (const metric of METRICS) {
    const condition = settings.rule[metric];
    if (!condition.on) continue;
    const value = metrics[metric];
    if (!finite(value)) continue;
    checked += 1;
    if (value < condition.min) return { action: "skip", reason: "below", metric, value, min: condition.min };
  }
  return { action: "keep", reason: checked > 0 ? "passes" : "unscored" };
}

function isPlatform(value: unknown): value is Platform {
  return value === "youtube" || value === "tiktok" || value === "instagram";
}

function parseCondition(value: unknown, fallback: Condition): Condition {
  if (!value || typeof value !== "object") return { ...fallback };
  const raw = value as Partial<Condition>;
  const min = finite(raw.min) && raw.min > 0 ? Math.round(raw.min) : fallback.min;
  return { on: typeof raw.on === "boolean" ? raw.on : fallback.on, min };
}

function parseRule(value: unknown, legacy: unknown): Rule {
  const base = presetRule("balanced");
  if (value && typeof value === "object") {
    const raw = value as Partial<Record<Metric, unknown>>;
    return {
      likes: parseCondition(raw.likes, base.likes),
      comments: parseCondition(raw.comments, base.comments),
      views: parseCondition(raw.views, base.views),
    };
  }
  if (legacy === "lenient" || legacy === "strict" || legacy === "balanced") return presetRule(legacy);
  return base;
}

export function normalizeSettings(value: unknown): Settings {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const platforms = raw.platforms && typeof raw.platforms === "object" ? (raw.platforms as Partial<Record<Platform, unknown>>) : {};
  const allowlist = Array.isArray(raw.allowlist)
    ? raw.allowlist.filter((entry): entry is AllowEntry => {
        if (!entry || typeof entry !== "object") return false;
        const candidate = entry as AllowEntry;
        return isPlatform(candidate.platform) && typeof candidate.id === "string" && candidate.id.trim().length > 0;
      })
    : [];
  return {
    enabled: raw.enabled !== false,
    rule: parseRule(raw.rule, raw.sensitivity),
    platforms: {
      youtube: platforms.youtube !== false,
      tiktok: platforms.tiktok !== false,
      instagram: platforms.instagram !== false,
    },
    filterGrids: raw.filterGrids === true,
    showSkipChip: raw.showSkipChip !== false,
    skipAds: raw.skipAds === true,
    allowlist,
  };
}

export function emptyMetrics(): Metrics {
  return { views: null, likes: null, comments: null, shares: null, saves: null };
}
