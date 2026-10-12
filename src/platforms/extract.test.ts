import { describe, expect, it } from "vitest";
import { extractInstagram, extractTikTok, extractYouTube } from "./extract";
import { followedFromFollowLabel } from "./instagram-player";
import { followedFromSubscribeLabel } from "./youtube-player";

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

  it("reads a YouTube subscription from the entity on the same video, and ignores a signed-out button", () => {
    const subscribed = extractYouTube({
      videoDetails: { videoId: "abc", viewCount: "10", channelId: "UC1" },
      frameworkUpdates: { entityBatchUpdate: { mutations: [{ entityKey: "key-1", payload: { subscriptionStateEntity: { key: "key-1", subscribed: true } } }] } },
      subscribeStateEntityStoreKey: "key-1",
    });
    expect(subscribed?.followed).toBe(true);
    const notSubscribed = extractYouTube({
      videoDetails: { videoId: "abc", channelId: "UC1" },
      subscribeButtonRenderer: { subscribed: false },
    });
    expect(notSubscribed?.followed).toBe(false);
    const signedOut = extractYouTube({
      videoDetails: { videoId: "abc", channelId: "UC1", viewCount: "10" },
      overlay: { subscribeButtonViewModel: { buttonViewModel: { title: "구독" } } },
    });
    expect(signedOut?.followed).toBeNull();
    const many = extractYouTube({
      videoDetails: { videoId: "abc", channelId: "UC1" },
      other: { videoId: "other" },
      frameworkUpdates: { entityBatchUpdate: { mutations: [{ entityKey: "key-1", payload: { subscriptionStateEntity: { subscribed: true } } }] } },
    });
    expect(many?.followed).toBeNull();
  });

  it("reads whether the viewer follows an Instagram creator", () => {
    const item = (following: unknown) => extractInstagram({
      media: { code: "ABC", like_count: 10, user: { username: "creator", friendship_status: { following } } },
    })[0]?.followed;
    expect(item(true)).toBe(true);
    expect(item(false)).toBe(false);
    expect(extractInstagram({ media: { code: "ABC", like_count: 10, user: { username: "creator" } } })[0]?.followed).toBeNull();
  });

  it("reads the subscribe and follow buttons in English and Korean", () => {
    expect(followedFromSubscribeLabel("구독")).toBe(false);
    expect(followedFromSubscribeLabel("구독중")).toBe(true);
    expect(followedFromSubscribeLabel("Subscribe")).toBe(false);
    expect(followedFromSubscribeLabel("Subscribed")).toBe(true);
    expect(followedFromSubscribeLabel("Unsubscribe from 땡초")).toBe(true);
    expect(followedFromSubscribeLabel("Subscribe to 땡초")).toBe(false);
    expect(followedFromSubscribeLabel("이 영상은 구독하면 좋아요")).toBeNull();
    expect(followedFromSubscribeLabel("Subscribed to 땡초상영관")).toBe(true);
    expect(followedFromSubscribeLabel("땡초상영관 구독중")).toBe(true);
    expect(followedFromSubscribeLabel("subscribers")).toBeNull();
    expect(followedFromFollowLabel("팔로우")).toBe(false);
    expect(followedFromFollowLabel("팔로잉")).toBe(true);
    expect(followedFromFollowLabel("Follow")).toBe(false);
    expect(followedFromFollowLabel("Following")).toBe(true);
    expect(followedFromFollowLabel("Followers")).toBeNull();
    expect(followedFromFollowLabel("Following creator")).toBe(true);
    expect(followedFromFollowLabel("Unfollow")).toBe(true);
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
