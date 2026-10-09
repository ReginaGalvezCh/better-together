// Exact handles supplied by the user, not inferred from TikTok or account names.
const suppliedInstagramHandles = [
  "coreaconvale", "ktopchile", "soylatabita", "btsfamily_chile", "kspam.cl",
  "karen.voncita", "park_jiminie__cl", "sugachile", "koreanbasic",
] as const;

export const instagramSourceCandidates = suppliedInstagramHandles.map((handle) => ({
  id: `instagram:${handle}`, handle,
  profileUrl: `https://www.instagram.com/${handle}/`,
  verification: "user-provided" as const,
  // Business/community/organizer identity requires editorial verification.
  sourceType: "unclassified" as const,
  monitoringEnabled: false as const,
}));

type InstagramPostSeed = {
  postUrl: string; referenceSlide?: number;
  observedAuthor?: string;
  captionStatus: "pending" | "read";
  reviewStatus: "pending";
  sourceCandidateId: null;
};

// Reading a caption does not confirm its claims, dates, organizer or conditions.
export const instagramPostSeeds: readonly InstagramPostSeed[] = [
  { postUrl: "https://www.instagram.com/reel/DeAoU_oORw5/", observedAuthor: "abby.p.c", captionStatus: "read", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DeAnaI6H-z-/", observedAuthor: "btschileprojects", captionStatus: "read", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DdXh4EcRZuC/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DeKwwrghsDP/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DeKr8vBBtEZ/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DeIJ_cZzzxj/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/Dc9NAbLpmVp/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DeNG5rdzdQo/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DePhngRAMxj/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DeMhlQSG2lf/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DeMfVjDyOdr/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/reel/DeNkJA8xEYJ/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DeNvlbWFgUG/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/Ddphlq2iR2Q/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/DeNegP0FH8g/", referenceSlide: 3, observedAuthor: "regionmusicall", captionStatus: "read", reviewStatus: "pending", sourceCandidateId: null },
  { postUrl: "https://www.instagram.com/p/Dd9-HY1mnd6/", captionStatus: "pending", reviewStatus: "pending", sourceCandidateId: null },
];

export function instagramReferenceUrl(seed: InstagramPostSeed) {
  const url = new URL(seed.postUrl);
  if (seed.referenceSlide !== undefined && Number.isInteger(seed.referenceSlide) && seed.referenceSlide >= 1 && seed.referenceSlide <= 20) {
    url.searchParams.set("img_index", String(seed.referenceSlide));
  }
  return url.toString();
}
