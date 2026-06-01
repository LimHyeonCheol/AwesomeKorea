import type { CategorySlug } from "@awesomekorea/shared";

const SEARCH_HINT_BY_CATEGORY: Record<CategorySlug, string> = {
  movie: "korean movie",
  drama: "kdrama",
  webtoon: "webtoon",
  music: "song",
};

const DEFAULT_SEARCH_HINT = "korean content";

const CONTEXT_TERMS_BY_CATEGORY: Record<CategorySlug, string[]> = {
  movie: ["movie", "film", "korean movie", "kmovie", "k movie"],
  drama: ["kdrama", "k drama", "korean drama", "gong yoo", "kim go eun"],
  webtoon: ["webtoon", "manhwa", "korean", "adaptation", "anime"],
  music: ["song", "music", "mv", "performance", "ost", "lyrics", "cover"],
};

const DEFAULT_CONTEXT_TERMS = ["korean", "reaction", "review", "content"];

const REFERENCE_NOISE_PHRASES = [
  "first time watching",
  "first time watch",
  "ending explained",
  "해외 반응",
  "해외반응",
  "reactions",
  "reaction",
  "reacts",
  "review",
  "reviews",
  "analysis",
  "리액션",
];

const SEASON_PATTERNS = [
  /\bseason\s+(\d+)\b/g,
  /\bpart\s+(\d+)\b/g,
  /\bs(\d+)\b/g,
  /시즌\s*(\d+)/g,
];

const normalizeSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

const uniqueValues = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (!normalized || seen.has(normalized.toLowerCase())) {
      continue;
    }

    seen.add(normalized.toLowerCase());
    result.push(normalized);
  }

  return result;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const containsKoreanCharacters = (value: string) => /[가-힣]/.test(value);

export const normalizeText = (value: string) =>
  normalizeSpaces(
    value
      .normalize("NFC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, " "),
  );

const stripReferenceNoise = (value: string) => {
  let normalized = ` ${normalizeText(value)} `;

  for (const phrase of REFERENCE_NOISE_PHRASES) {
    const normalizedPhrase = normalizeText(phrase);

    if (!normalizedPhrase) {
      continue;
    }

    normalized = normalized.replace(
      new RegExp(`(^| )${escapeRegExp(normalizedPhrase)}(?= |$)`, "g"),
      " ",
    );
  }

  return normalizeSpaces(normalized);
};

const extractSeasonNumbers = (value: string) => {
  const seasonNumbers = new Set<number>();

  for (const pattern of SEASON_PATTERNS) {
    for (const match of value.matchAll(pattern)) {
      const parsed = Number(match[1]);

      if (Number.isFinite(parsed)) {
        seasonNumbers.add(parsed);
      }
    }
  }

  return [...seasonNumbers].sort((left, right) => left - right);
};

const removeSeasonMarkers = (value: string) =>
  normalizeSpaces(
    value
      .replace(/\bseason\s+\d+\b/g, " ")
      .replace(/\bpart\s+\d+\b/g, " ")
      .replace(/\bs\d+\b/g, " ")
      .replace(/시즌\s*\d+/g, " "),
  );

const hasCategoryContext = (normalizedTitle: string, categorySlug: CategorySlug) =>
  (CONTEXT_TERMS_BY_CATEGORY[categorySlug] ?? DEFAULT_CONTEXT_TERMS).some((term) =>
    normalizedTitle.includes(term),
  );

const matchesBasePhraseWithSeason = (
  normalizedTitle: string,
  phraseWithoutSeason: string,
  seasonNumbers: number[],
) =>
  seasonNumbers.every((seasonNumber) =>
    [
      new RegExp(
        `(?:^| )${escapeRegExp(phraseWithoutSeason)} (?:season ${seasonNumber}|part ${seasonNumber}|s${seasonNumber}|시즌 ?${seasonNumber}|${seasonNumber}x\\d{1,2})(?: |$)`,
      ),
    ].some((pattern) => pattern.test(normalizedTitle)),
  );

interface ReactionReferenceAnchor {
  phrase: string;
  phraseWithoutSeason: string | null;
  requiresContext: boolean;
  seasonNumbers: number[];
}

export interface ReactionMatcherContent {
  aliases: string[];
  categorySlug: CategorySlug;
  titleEn: string | null;
  titleKo: string;
}

const buildReferenceAnchors = (content: ReactionMatcherContent): ReactionReferenceAnchor[] => {
  const primaryKoreanAnchor = stripReferenceNoise(content.titleKo);
  const primaryEnglishAnchor = stripReferenceNoise(content.titleEn ?? "");
  const primaryTokens = new Set(
    uniqueValues([primaryKoreanAnchor, primaryEnglishAnchor])
      .flatMap((value) => value.split(" "))
      .filter((token) => token.length > 0),
  );
  const primaryEnglishTokenCount = primaryEnglishAnchor
    ? primaryEnglishAnchor.split(" ").filter((token) => token.length > 0).length
    : 0;

  const dedupedAnchors = new Map<string, ReactionReferenceAnchor>();
  const candidates: Array<{ source: "titleKo" | "titleEn" | "alias"; value: string }> = [
    { source: "titleKo", value: content.titleKo },
    { source: "titleEn", value: content.titleEn ?? "" },
    ...content.aliases.map((value) => ({ source: "alias" as const, value })),
  ];

  for (const candidate of candidates) {
    const phrase = stripReferenceNoise(candidate.value);

    if (!phrase) {
      continue;
    }

    const phraseTokens = phrase.split(" ").filter((token) => token.length > 0);
    const tokenCount = phraseTokens.length;
    const overlapCount = phraseTokens.filter((token) => primaryTokens.has(token)).length;
    const isLooseDescriptorAlias =
      candidate.source === "alias" && tokenCount > 1 && overlapCount === 0;

    if (isLooseDescriptorAlias) {
      continue;
    }

    const requiresContext =
      candidate.source === "alias" &&
      tokenCount > 0 &&
      (tokenCount === 1 || (primaryEnglishTokenCount > 0 && tokenCount < primaryEnglishTokenCount));
    const seasonNumbers = extractSeasonNumbers(phrase);
    const phraseWithoutSeason = seasonNumbers.length > 0 ? removeSeasonMarkers(phrase) : null;

    if (!dedupedAnchors.has(phrase)) {
      dedupedAnchors.set(phrase, {
        phrase,
        phraseWithoutSeason:
          phraseWithoutSeason && phraseWithoutSeason !== phrase ? phraseWithoutSeason : null,
        requiresContext,
        seasonNumbers,
      });
      continue;
    }

    const existing = dedupedAnchors.get(phrase);

    if (!existing) {
      continue;
    }

    existing.requiresContext = existing.requiresContext && requiresContext;
  }

  return [...dedupedAnchors.values()].sort((left, right) => right.phrase.length - left.phrase.length);
};

const matchesReferenceAnchor = (
  normalizedTitle: string,
  content: ReactionMatcherContent,
  anchor: ReactionReferenceAnchor,
) => {
  const titleContainsAnchor =
    normalizedTitle.includes(anchor.phrase) ||
    (anchor.phraseWithoutSeason !== null &&
      matchesBasePhraseWithSeason(
        normalizedTitle,
        anchor.phraseWithoutSeason,
        anchor.seasonNumbers,
      ));

  if (!titleContainsAnchor) {
    return false;
  }

  if (!anchor.requiresContext) {
    return true;
  }

  return hasCategoryContext(normalizedTitle, content.categorySlug);
};

export const buildSearchKeywords = (content: ReactionMatcherContent) => {
  const anchors = buildReferenceAnchors(content);
  const categoryHint = SEARCH_HINT_BY_CATEGORY[content.categorySlug] ?? DEFAULT_SEARCH_HINT;
  const queries: string[] = [];

  for (const anchor of anchors) {
    if (containsKoreanCharacters(anchor.phrase)) {
      queries.push(`${anchor.phrase} reaction`);
      queries.push(`${anchor.phrase} 해외반응`);
      continue;
    }

    const quotedPhrase = `"${anchor.phrase}"`;
    const contextSuffix = categoryHint ? ` ${categoryHint}` : "";
    queries.push(`${quotedPhrase} reaction${contextSuffix}`);
    queries.push(`${quotedPhrase} first time watching${contextSuffix}`);
  }

  return uniqueValues(queries).slice(0, 8);
};

export const matchesContentReference = (
  content: ReactionMatcherContent,
  videoTitle: string,
) => {
  const normalizedTitle = normalizeText(videoTitle);

  if (!normalizedTitle) {
    return false;
  }

  return buildReferenceAnchors(content).some((anchor) =>
    matchesReferenceAnchor(normalizedTitle, content, anchor),
  );
};
