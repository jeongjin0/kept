import { describe, expect, it } from "vitest";
import { extractInstagram, extractTikTok, extractYouTube } from "./extract";

describe("extractors", () => {
  it("reads youtube player counts and ignores ad branches", () => {
    const item = extractYouTube({
      videoDetails: { videoId: "abc", viewCount: "4000", channelId: "UC1" },
      adPlacements: [{ likeCount: 1 }],
      overlay: { likeCount: 20, commentCount: "4" },
    });
    expect(item).toMatchObject({
      id: "abc",
      creatorId: "UC1",
      metrics: { views: 4000, likes: 20, comments: 4, shares: null, saves: null },
    });
  });

  it("reads tiktok stats", () => {
    const items = extractTikTok({
      item: { id: "99", author: { uniqueId: "@creator" }, stats: { playCount: 5000, diggCount: 100, commentCount: 2, shareCount: 1, collectCount: 3 } },
    });
    expect(items[0]).toMatchObject({ id: "99", creatorId: "creator", metrics: { views: 5000, likes: 100, comments: 2, shares: 1, saves: 3 } });
    expect(items[0]?.followed).toBeNull();
  });

  it("reads whether the viewer follows a TikTok creator", () => {
    const followed = (relation: unknown, authorKey: "author" | "authorInfo" = "author") => extractTikTok({
      item: { id: "1", [authorKey]: { uniqueId: "a", relation }, stats: { diggCount: 1, playCount: 2 } },
    })[0]?.followed;
    expect(followed(0)).toBe(false);
    expect(followed(1)).toBe(true);
    expect(followed(2)).toBe(false);
    expect(followed(3)).toBe(true);
    expect(followed(undefined)).toBeNull();
    expect(followed("1")).toBe(true);
    expect(followed(9)).toBeNull();
    expect(followed(1, "authorInfo")).toBe(true);
  });

  it("retains zero views and does not discard an independently known like count", () => {
    expect(extractYouTube({ videoDetails: { videoId: "zero", viewCount: "0" }, likeCount: 1 })?.metrics).toMatchObject({ views: 0, likes: 1 });
  });

  it("marks TikTok and Instagram ads so the rule always keeps them", () => {
    expect(extractTikTok({ item: { id: "ad", isAd: true, stats: { diggCount: 0, playCount: 100 } } })[0]?.kind).toBe("ad");
    expect(extractInstagram({ media: { code: "ad", is_ad: true, like_count: 0 } })[0]?.kind).toBe("ad");
  });

  it("reads instagram reel counts", () => {
    const items = extractInstagram({
      media: { code: "ABC", like_count: 10, comment_count: 1, play_count: 2500, user: { username: "Creator" } },
    });
    expect(items[0]).toMatchObject({ id: "ABC", creatorId: "Creator", metrics: { views: 2500, likes: 10, comments: 1 } });
  });

  it('reads counts from the microformat when video details omit them', () => {
    const item = extractYouTube({
      videoDetails: { videoId: 'abc', channelId: 'UC1' },
      microformat: { playerMicroformatRenderer: { viewCount: '4000', likeCount: '20' } },
    });
    expect(item?.metrics).toMatchObject({ views: 4000, likes: 20 });
  });
});
