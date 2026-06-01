import {
  buildReactionTranslationGlossary,
  pickFirstSentence,
  shouldSkipKoreanTranslation,
  translateTextToKorean,
  type TranslationContext,
  type TranslationGlossaryEntry,
} from "./translation-service";

type StoredTranslationSource = "youtube_localized" | "machine";

interface TranslationEnv {
  DEEPL_API_KEY?: string;
  DEEPL_API_URL?: string;
  GOOGLE_TRANSLATE_API_KEY?: string;
  PAPAGO_CLIENT_ID?: string;
  PAPAGO_CLIENT_SECRET?: string;
  TRANSLATION_PROVIDER?: string;
}

interface ReactionLocalizationInput {
  aliases?: string[];
  categoryName?: string | null;
  channelName: string;
  contentTitleEn?: string | null;
  contentTitleKo?: string | null;
  description: string | null;
  localizedDescriptionCandidate?: string | null;
  localizedTitleCandidate?: string | null;
  sourceLanguage?: string | null;
  title: string;
}

interface LocalizedReactionField {
  localizedText: string | null;
  source: StoredTranslationSource | null;
}

export interface LocalizedReactionMetadata {
  description: LocalizedReactionField;
  title: LocalizedReactionField;
}

const normalizeText = (value: string | null | undefined) => {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "";
};

const shouldUseYoutubeLocalizedText = (original: string, candidate: string | null | undefined) => {
  const normalizedOriginal = normalizeText(original);
  const normalizedCandidate = normalizeText(candidate);

  if (!normalizedOriginal || !normalizedCandidate) {
    return false;
  }

  return normalizedOriginal !== normalizedCandidate;
};

const resolveLocalizedField = async (input: {
  context: TranslationContext;
  env: TranslationEnv;
  glossary: TranslationGlossaryEntry[];
  localizedCandidate?: string | null;
  sourceLanguage?: string | null;
  text: string;
}) => {
  const normalizedText = normalizeText(input.text);

  if (!normalizedText || shouldSkipKoreanTranslation(normalizedText, input.sourceLanguage)) {
    return {
      localizedText: null,
      source: null,
    } satisfies LocalizedReactionField;
  }

  if (shouldUseYoutubeLocalizedText(normalizedText, input.localizedCandidate)) {
    return {
      localizedText: normalizeText(input.localizedCandidate),
      source: "youtube_localized",
    } satisfies LocalizedReactionField;
  }

  const translated = await translateTextToKorean(input.env, {
    text: normalizedText,
    sourceLanguage: input.sourceLanguage,
    glossary: input.glossary,
    context: input.context,
  });

  if (!translated || translated.translatedText === normalizedText) {
    return {
      localizedText: null,
      source: null,
    } satisfies LocalizedReactionField;
  }

  return {
    localizedText: translated.translatedText,
    source: "machine",
  } satisfies LocalizedReactionField;
};

export const localizeReactionMetadata = async (
  env: TranslationEnv,
  input: ReactionLocalizationInput,
): Promise<LocalizedReactionMetadata> => {
  const glossary = buildReactionTranslationGlossary({
    contentTitleKo: input.contentTitleKo,
    contentTitleEn: input.contentTitleEn,
    aliases: input.aliases,
    channelName: input.channelName,
  });
  const descriptionFirstSentence = pickFirstSentence(input.description);

  const titleContext: TranslationContext = {
    categoryName: input.categoryName,
    channelName: input.channelName,
    contentTitleEn: input.contentTitleEn,
    contentTitleKo: input.contentTitleKo,
    description: descriptionFirstSentence,
  };
  const descriptionContext: TranslationContext = {
    categoryName: input.categoryName,
    channelName: input.channelName,
    contentTitleEn: input.contentTitleEn,
    contentTitleKo: input.contentTitleKo,
    description: input.title,
  };

  const [title, description] = await Promise.all([
    resolveLocalizedField({
      env,
      context: titleContext,
      glossary,
      localizedCandidate: input.localizedTitleCandidate,
      sourceLanguage: input.sourceLanguage,
      text: input.title,
    }),
    resolveLocalizedField({
      env,
      context: descriptionContext,
      glossary,
      localizedCandidate: input.localizedDescriptionCandidate,
      sourceLanguage: input.sourceLanguage,
      text: input.description ?? "",
    }),
  ]);

  return {
    title,
    description,
  };
};
