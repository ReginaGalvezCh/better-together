export type TikTokSourceCandidate = {
  id: string;
  // Keep the user's supplied name; never infer a TikTok handle or URL from it.
  suppliedName: string;
  platform: "tiktok";
  origin: "community";
  verification: "pending" | "user-provided";
  profileUrl: string | null;
  monitoringEnabled: false;
};

export const tikTokSourceCandidates: readonly TikTokSourceCandidate[] = [
  { id: "karen-voncita", suppliedName: "karen voncita", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "mary-prado", suppliedName: "mary prado", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "camkal", suppliedName: "camkal", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "cachaestaarmy", suppliedName: "cachaestaarmy", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "bts-chileprojects", suppliedName: "bts.chileprojects", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "catalipedema", suppliedName: "catalipedema", platform: "tiktok", origin: "community", verification: "user-provided", profileUrl: "https://www.tiktok.com/@catalipedema", monitoringEnabled: false },
  { id: "ladanipo", suppliedName: "ladanipo_", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "cataschulbe", suppliedName: "cataschulbe", platform: "tiktok", origin: "community", verification: "user-provided", profileUrl: "https://www.tiktok.com/@cataschulbe", monitoringEnabled: false },
  { id: "catahrsc", suppliedName: "catahrsc", platform: "tiktok", origin: "community", verification: "user-provided", profileUrl: "https://www.tiktok.com/@catahrsc", monitoringEnabled: false },
  { id: "bts-chileofficial", suppliedName: "bts.chileofficial", platform: "tiktok", origin: "community", verification: "user-provided", profileUrl: "https://www.tiktok.com/@bts.chileofficial", monitoringEnabled: false },
];

// Public redirects establish URLs only, not identity, relevance or video contents.
// Keep these out of the public feed until editorial review and identity matching.
export const tikTokPostSeeds = [
  { sharedUrl: "https://vt.tiktok.com/ZSbshWQ9E/", postUrl: "https://www.tiktok.com/@karen.voncita/video/7692199755501391125", sourceCandidateId: null, reviewStatus: "pending" },
  { sharedUrl: "https://vt.tiktok.com/ZSbshGjBW/", postUrl: "https://www.tiktok.com/@camila_kal/video/7692549254140759303", sourceCandidateId: null, reviewStatus: "pending" },
  { sharedUrl: "https://vt.tiktok.com/ZSbshWPQ9/", postUrl: "https://www.tiktok.com/@minsooft_/video/7693923915411819797", sourceCandidateId: null, reviewStatus: "pending" },
  { sharedUrl: "https://vt.tiktok.com/ZSbshnnKN/", postUrl: "https://www.tiktok.com/@marilyn_prdon/video/7694035710310976776", sourceCandidateId: null, reviewStatus: "pending" },
] as const;

// Search seeds, not evidence of current trends or an active TikTok connection.
export const proposedTikTokHashtags = ["BTSChile", "BTSChile2026", "ARMYChile", "BTSArirang", "ArirangTour"] as const;
