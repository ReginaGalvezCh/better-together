export type TikTokSourceCandidate = {
  id: string;
  // Keep the user's supplied name; never infer a TikTok handle or URL from it.
  suppliedName: string;
  platform: "tiktok";
  origin: "community";
  verification: "pending";
  profileUrl: null;
  monitoringEnabled: false;
};

export const tikTokSourceCandidates: readonly TikTokSourceCandidate[] = [
  { id: "karen-voncita", suppliedName: "karen voncita", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "mary-prado", suppliedName: "mary prado", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "camkal", suppliedName: "camkal", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "cachaestaarmy", suppliedName: "cachaestaarmy", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "bts-chileprojects", suppliedName: "bts.chileprojects", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "catalipedema", suppliedName: "catalipedema", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "ladanipo", suppliedName: "ladanipo_", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "cataschulbe", suppliedName: "cataschulbe", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
  { id: "catahrsc", suppliedName: "catahrsc", platform: "tiktok", origin: "community", verification: "pending", profileUrl: null, monitoringEnabled: false },
];

// Search seeds, not evidence of current trends or an active TikTok connection.
export const proposedTikTokHashtags = ["BTSChile", "BTSChile2026", "ARMYChile", "BTSArirang", "ArirangTour"] as const;
