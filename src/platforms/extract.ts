import { emptyMetrics, type ItemKind, type Metrics } from "../lib/score";

export interface ExtractedItem {
  id: string;
  creatorId: string | null;
  metrics: Metrics;
  kind: ItemKind;
  // True when the page already says the viewer follows this creator. Null when it does not say.
  followed?: boolean | null;
}

// TikTok puts the viewer's relationship on author.relation of the item the page already loaded.
// 0 none, 1 the viewer follows, 2 the author follows the viewer, 3 both. Anything else is unknown.
function followedFromRelation(value: unknown): boolean | null {
  const relation = typeof value === "number" && Number.isFinite(value) ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null;
  if (relation == null) return null;
  if (relation === 1 || relation === 3) return true;
  if (relation === 0 || relation === 2) return false;
  return null;
}

const SKIP_KEYS = new Set(["adPlacements", "playerAds", "adSlots"]);

export function parseCount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

export function walk(value: unknown, visit: (key: string, val: unknown, parent: Record<string, unknown>) => void, maxNodes = 20000): void {
  const seen = new Set<object>();
  const stack: unknown[] = [value];
  let nodes = 0;
  while (stack.length > 0 && nodes < maxNodes) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    nodes += 1;
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) stack.push(current[index]);
      continue;
    }
    const record = current as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      const child = record[key];
      visit(key, child, record);
      if (SKIP_KEYS.has(key)) continue;
      if (child && typeof child === "object") stack.push(child);
    }
  }
}

export function extractYouTube(player: unknown): ExtractedItem | null {
  if (!player || typeof player !== "object") return null;
  const details = (player as { videoDetails?: Record<string, unknown> }).videoDetails;
  const id = typeof details?.videoId === "string" ? details.videoId : "";
  if (!id) return null;
  const metrics = emptyMetrics();
  const views: number[] = [];
  const likes: number[] = [];
  const comments: number[] = [];
  const detailViews = parseCount(details?.viewCount);
  if (detailViews != null) views.push(detailViews);
  walk(player, (key, val) => {
    const count = parseCount(val);
    if (count == null) return;
    if (key === "viewCount") views.push(count);
    if (key === "likeCount") likes.push(count);
    if (key === "commentCount" || key === "commentsCount") comments.push(count);
  });
  metrics.views = views[0] ?? null;
  metrics.likes = likes[0] ?? null;
  metrics.comments = comments[0] ?? null;
  const creatorId = typeof details?.channelId === "string" ? details.channelId : null;
  return { id, creatorId, metrics, kind: "video" };
}

export function extractTikTok(root: unknown): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();
  walk(root, (key, val, parent) => {
    if ((key !== "stats" && key !== "statsV2") || !val || typeof val !== "object") return;
    const stats = val as Record<string, unknown>;
    if (!("diggCount" in stats) && !("playCount" in stats)) return;
    const rawId = parent.id ?? parent.aweme_id ?? parent.itemId;
    const id = typeof rawId === "string" || typeof rawId === "number" ? String(rawId) : "";
    if (!id || seen.has(id)) return;
    seen.add(id);
    const author = (parent.author ?? parent.authorInfo) as Record<string, unknown> | undefined;
    const unique = typeof author?.uniqueId === "string" ? author.uniqueId.replace(/^@/, "") : null;
    items.push({
      id,
      creatorId: unique,
      kind: parent.isAd === true || parent.is_ad === true ? "ad" : parent.imagePost != null ? "carousel" : "video",
      followed: followedFromRelation(author?.relation),
      metrics: {
        views: parseCount(stats.playCount),
        likes: parseCount(stats.diggCount),
        comments: parseCount(stats.commentCount),
        shares: parseCount(stats.shareCount),
        saves: parseCount(stats.collectCount),
      },
    });
  });
  return items;
}

export function extractInstagram(root: unknown): ExtractedItem[] {
  const items: ExtractedItem[] = [];
  const seen = new Set<string>();
  walk(root, (_key, _val, parent) => {
    const code = parent.code ?? parent.shortcode;
    const id = typeof code === "string" ? code : "";
    if (!id || seen.has(id)) return;
    const likes = parseCount(parent.like_count ?? parent.likeCount);
    const comments = parseCount(parent.comment_count ?? parent.commentCount);
    const views = parseCount(parent.play_count ?? parent.ig_play_count ?? parent.video_play_count ?? parent.video_view_count ?? parent.view_count);
    if (likes == null && comments == null && views == null) return;
    seen.add(id);
    const user = (parent.user ?? parent.owner) as Record<string, unknown> | undefined;
    const username = typeof user?.username === "string" ? user.username : null;
    const carousel = parent.product_type === "carousel_container" || parent.media_type === "carousel_container" || parent.carousel_media != null;
    items.push({
      id,
      creatorId: username,
      kind: parent.is_ad === true || parent.isAd === true ? "ad" : carousel ? "carousel" : "video",
      metrics: { views, likes, comments, shares: null, saves: null },
    });
  });
  return items;
}
