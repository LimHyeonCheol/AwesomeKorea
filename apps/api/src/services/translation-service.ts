type ProviderName = "papago" | "deepl" | "google";

export interface TranslationGlossaryEntry {
  source: string;
  target: string;
}

export interface TranslationContext {
  categoryName?: string | null;
  channelName?: string | null;
  contentTitleEn?: string | null;
  contentTitleKo?: string | null;
  description?: string | null;
}

interface TranslationEnv {
  DEEPL_API_KEY?: string;
  DEEPL_API_URL?: string;
  GOOGLE_TRANSLATE_API_KEY?: string;
  PAPAGO_CLIENT_ID?: string;
  PAPAGO_CLIENT_SECRET?: string;
  TRANSLATION_PROVIDER?: string;
}

interface TranslationRequest {
  context?: TranslationContext;
  glossary?: TranslationGlossaryEntry[];
  sourceLanguage?: string | null;
  text: string;
}

interface MachineTranslationResult {
  provider: ProviderName;
  translatedText: string;
}

const DEEPL_TRANSLATE_URL = "https://api-free.deepl.com/v2/translate";
const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const PAPAGO_TRANSLATE_URL = "https://openapi.naver.com/v1/papago/n2mt";
const GLOSSARY_TOKEN_PREFIX = "__AK_GLOSSARY_";
const HANGUL_CHARACTER_PATTERN = /[\u3131-\u318E\uAC00-\uD7A3]/;
const HANGUL_CHARACTER_GLOBAL_PATTERN = /[\u3131-\u318E\uAC00-\uD7A3]/g;
const LATIN_CHARACTER_GLOBAL_PATTERN = /[A-Za-z]/g;

const STATIC_TRANSLATION_GLOSSARY: TranslationGlossaryEntry[] = [
  {
    source: "Call of Duty",
    target: "콜 오브 듀티",
  },
  {
    source: "Modern Warfare",
    target: "모던 워페어",
  },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value: string | null | undefined) => value?.trim() ?? "";

const countPatternMatches = (value: string, pattern: RegExp) => value.match(pattern)?.length ?? 0;

const isPredominantlyKorean = (value: string) => {
  const hangulCount = countPatternMatches(value, HANGUL_CHARACTER_GLOBAL_PATTERN);

  if (hangulCount === 0) {
    return false;
  }

  const latinCount = countPatternMatches(value, LATIN_CHARACTER_GLOBAL_PATTERN);

  if (latinCount === 0) {
    return HANGUL_CHARACTER_PATTERN.test(value);
  }

  // Mixed-language copy still benefits from translation when English is dominant.
  return hangulCount >= latinCount * 2;
};

const buildProviderOrder = (env: TranslationEnv): ProviderName[] => {
  const requestedProvider = env.TRANSLATION_PROVIDER?.trim().toLowerCase();
  const availableProviders: ProviderName[] = [];

  if (env.PAPAGO_CLIENT_ID && env.PAPAGO_CLIENT_SECRET) {
    availableProviders.push("papago");
  }

  if (env.DEEPL_API_KEY) {
    availableProviders.push("deepl");
  }

  if (env.GOOGLE_TRANSLATE_API_KEY) {
    availableProviders.push("google");
  }

  if (
    requestedProvider === "papago" ||
    requestedProvider === "deepl" ||
    requestedProvider === "google"
  ) {
    if (availableProviders.includes(requestedProvider)) {
      return [
        requestedProvider,
        ...availableProviders.filter((provider) => provider !== requestedProvider),
      ];
    }
  }

  return availableProviders;
};

const protectGlossaryTerms = (
  text: string,
  glossary: TranslationGlossaryEntry[],
) => {
  const sortedGlossary = [...glossary]
    .map((entry) => ({
      source: normalizeText(entry.source),
      target: normalizeText(entry.target),
    }))
    .filter((entry) => entry.source.length > 0 && entry.target.length > 0)
    .sort((left, right) => right.source.length - left.source.length);

  let protectedText = text;
  const replacements: Array<{ replacement: string; token: string }> = [];
  let replacementIndex = 0;

  for (const entry of sortedGlossary) {
    const pattern = new RegExp(escapeRegExp(entry.source), "gi");

    protectedText = protectedText.replace(pattern, () => {
      const token = `${GLOSSARY_TOKEN_PREFIX}${replacementIndex}__`;
      replacementIndex += 1;
      replacements.push({
        token,
        replacement: entry.target,
      });
      return token;
    });
  }

  return {
    protectedText,
    replacements,
  };
};

const restoreGlossaryTerms = (
  text: string,
  replacements: Array<{ replacement: string; token: string }>,
) => {
  let restoredText = text;

  for (const replacement of replacements) {
    restoredText = restoredText.split(replacement.token).join(replacement.replacement);
  }

  return restoredText;
};

const normalizePapagoSourceLanguage = (value: string | null | undefined) => {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.startsWith("en")) {
    return "en";
  }

  if (normalized.startsWith("ja")) {
    return "ja";
  }

  if (normalized.startsWith("zh-cn") || normalized === "zh-hans") {
    return "zh-CN";
  }

  if (normalized.startsWith("zh-tw") || normalized === "zh-hant") {
    return "zh-TW";
  }

  if (normalized.startsWith("es")) {
    return "es";
  }

  if (normalized.startsWith("fr")) {
    return "fr";
  }

  if (normalized.startsWith("de")) {
    return "de";
  }

  if (normalized.startsWith("ru")) {
    return "ru";
  }

  if (normalized.startsWith("it")) {
    return "it";
  }

  if (normalized.startsWith("th")) {
    return "th";
  }

  if (normalized.startsWith("vi")) {
    return "vi";
  }

  if (normalized.startsWith("id")) {
    return "id";
  }

  if (normalized.startsWith("ko")) {
    return "ko";
  }

  return "auto";
};

const normalizeDeepLSourceLanguage = (value: string | null | undefined) => {
  const normalized = value?.trim().toUpperCase() ?? "";

  if (normalized.startsWith("EN")) {
    return "EN";
  }

  if (normalized.startsWith("PT")) {
    return "PT";
  }

  if (normalized.startsWith("DE")) {
    return "DE";
  }

  if (normalized.startsWith("FR")) {
    return "FR";
  }

  if (normalized.startsWith("ES")) {
    return "ES";
  }

  if (normalized.startsWith("IT")) {
    return "IT";
  }

  if (normalized.startsWith("JA")) {
    return "JA";
  }

  if (normalized.startsWith("ZH")) {
    return "ZH";
  }

  if (normalized.startsWith("RU")) {
    return "RU";
  }

  return null;
};

const createContextSnippet = (context: TranslationContext | undefined) => {
  if (!context) {
    return null;
  }

  const fragments = [
    normalizeText(context.contentTitleKo),
    normalizeText(context.contentTitleEn),
    normalizeText(context.channelName),
    normalizeText(context.categoryName),
    normalizeText(context.description),
  ].filter((value) => value.length > 0);

  if (fragments.length === 0) {
    return null;
  }

  return fragments.join(" | ").slice(0, 400);
};

const translateWithPapago = async (
  env: TranslationEnv,
  request: TranslationRequest,
): Promise<MachineTranslationResult | null> => {
  if (!env.PAPAGO_CLIENT_ID || !env.PAPAGO_CLIENT_SECRET) {
    return null;
  }

  const body = new URLSearchParams({
    source: normalizePapagoSourceLanguage(request.sourceLanguage),
    target: "ko",
    text: request.text,
  });

  const response = await fetch(PAPAGO_TRANSLATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Naver-Client-Id": env.PAPAGO_CLIENT_ID,
      "X-Naver-Client-Secret": env.PAPAGO_CLIENT_SECRET,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Papago translation failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    message?: {
      result?: {
        translatedText?: string;
      };
    };
  };
  const translatedText = normalizeText(payload.message?.result?.translatedText);

  if (!translatedText) {
    return null;
  }

  return {
    provider: "papago",
    translatedText,
  };
};

const translateWithDeepL = async (
  env: TranslationEnv,
  request: TranslationRequest,
): Promise<MachineTranslationResult | null> => {
  if (!env.DEEPL_API_KEY) {
    return null;
  }

  const body = new URLSearchParams({
    text: request.text,
    target_lang: "KO",
  });
  const sourceLanguage = normalizeDeepLSourceLanguage(request.sourceLanguage);
  const contextSnippet = createContextSnippet(request.context);

  if (sourceLanguage) {
    body.set("source_lang", sourceLanguage);
  }

  if (contextSnippet) {
    body.set("context", contextSnippet);
  }

  const response = await fetch(env.DEEPL_API_URL?.trim() || DEEPL_TRANSLATE_URL, {
    method: "POST",
    headers: {
      "Authorization": `DeepL-Auth-Key ${env.DEEPL_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`DeepL translation failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    translations?: Array<{
      text?: string;
    }>;
  };
  const translatedText = normalizeText(payload.translations?.[0]?.text);

  if (!translatedText) {
    return null;
  }

  return {
    provider: "deepl",
    translatedText,
  };
};

const translateWithGoogle = async (
  env: TranslationEnv,
  request: TranslationRequest,
): Promise<MachineTranslationResult | null> => {
  if (!env.GOOGLE_TRANSLATE_API_KEY) {
    return null;
  }

  const body = {
    q: request.text,
    target: "ko",
    format: "text",
    ...(request.sourceLanguage ? { source: request.sourceLanguage } : {}),
  };

  const response = await fetch(`${GOOGLE_TRANSLATE_URL}?key=${env.GOOGLE_TRANSLATE_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Google translation failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      translations?: Array<{
        translatedText?: string;
      }>;
    };
  };
  const translatedText = normalizeText(payload.data?.translations?.[0]?.translatedText);

  if (!translatedText) {
    return null;
  }

  return {
    provider: "google",
    translatedText,
  };
};

const translateWithProvider = async (
  provider: ProviderName,
  env: TranslationEnv,
  request: TranslationRequest,
) => {
  if (provider === "papago") {
    return await translateWithPapago(env, request);
  }

  if (provider === "deepl") {
    return await translateWithDeepL(env, request);
  }

  return await translateWithGoogle(env, request);
};

export const pickFirstSentence = (value: string | null | undefined) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return "";
  }

  const sentenceMatch = normalized.match(/^(.+?[.!?])(?:\s|$)/);
  return (sentenceMatch?.[1] ?? normalized).slice(0, 220);
};

export const buildReactionTranslationGlossary = (input: {
  aliases?: string[];
  channelName?: string | null;
  contentTitleEn?: string | null;
  contentTitleKo?: string | null;
}) => {
  const glossary = [...STATIC_TRANSLATION_GLOSSARY];

  if (input.contentTitleEn && input.contentTitleKo) {
    glossary.push({
      source: input.contentTitleEn,
      target: input.contentTitleKo,
    });
  }

  for (const alias of input.aliases ?? []) {
    if (input.contentTitleKo && alias.trim() && alias !== input.contentTitleKo) {
      glossary.push({
        source: alias,
        target: input.contentTitleKo,
      });
    }
  }

  if (input.channelName) {
    glossary.push({
      source: input.channelName,
      target: input.channelName,
    });
  }

  return glossary;
};

export const shouldSkipKoreanTranslation = (
  text: string,
  sourceLanguage?: string | null,
) => {
  const normalized = normalizeText(text);

  if (!normalized) {
    return true;
  }

  if (sourceLanguage?.trim().toLowerCase().startsWith("ko")) {
    return true;
  }

  return isPredominantlyKorean(normalized);
};

export const translateTextToKorean = async (
  env: TranslationEnv,
  request: TranslationRequest,
): Promise<MachineTranslationResult | null> => {
  const normalizedText = normalizeText(request.text);

  if (!normalizedText) {
    return null;
  }

  const providerOrder = buildProviderOrder(env);

  if (providerOrder.length === 0) {
    return null;
  }

  const { protectedText, replacements } = protectGlossaryTerms(normalizedText, request.glossary ?? []);
  const translationRequest: TranslationRequest = {
    ...request,
    text: protectedText,
  };

  for (const provider of providerOrder) {
    try {
      const result = await translateWithProvider(provider, env, translationRequest);

      if (!result) {
        continue;
      }

      const restoredText = normalizeText(restoreGlossaryTerms(result.translatedText, replacements));

      if (!restoredText) {
        continue;
      }

      return {
        provider: result.provider,
        translatedText: restoredText,
      };
    } catch (error) {
      console.error("[translation] provider failed", provider, error);
    }
  }

  return null;
};
