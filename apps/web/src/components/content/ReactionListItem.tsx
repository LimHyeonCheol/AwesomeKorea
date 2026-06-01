import { useState } from "react";

import type {
  ReactionComment,
  ReactionCommentReply,
  ReactionVideo,
  TranslationSource,
} from "@awesomekorea/shared";

import { useAsyncResource } from "../../hooks/useAsyncResource";
import { apiClient } from "../../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

const DEFAULT_TOP_COMMENT_LIMIT = 20;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

interface ReactionListItemProps {
  isExpanded: boolean;
  onToggle: () => void;
  reaction: ReactionVideo;
}

interface TranslationBadgeProps {
  hasTranslation: boolean;
  source: TranslationSource | null;
}

interface OriginalTextDisclosureProps {
  originalText: string | null;
  summaryLabel?: string;
}

interface CommentRepliesSectionProps {
  comment: ReactionComment;
  youtubeVideoId: string;
}

const getInlineEmbedUrl = (reaction: ReactionVideo) => {
  const separator = reaction.embedUrl.includes("?") ? "&" : "?";

  return `${reaction.embedUrl}${separator}playsinline=1&rel=0&modestbranding=1`;
};

const getTranslationSourceLabel = (source: TranslationSource | null, hasTranslation: boolean) => {
  if (!hasTranslation || source === "original" || source === null) {
    return "원문";
  }

  if (source === "manual") {
    return "수동 번역";
  }

  if (source === "youtube_localized") {
    return "유튜브 현지화";
  }

  return "자동 번역";
};

function TranslationBadge({ hasTranslation, source }: TranslationBadgeProps) {
  const variant = hasTranslation ? "translated" : "original";

  return (
    <span className={`reaction-translation-badge reaction-translation-badge--${variant}`}>
      {getTranslationSourceLabel(source, hasTranslation)}
    </span>
  );
}

function OriginalTextDisclosure({
  originalText,
  summaryLabel = "원문 보기",
}: OriginalTextDisclosureProps) {
  if (!originalText) {
    return null;
  }

  return (
    <details className="reaction-translation">
      <summary className="reaction-translation__summary">{summaryLabel}</summary>
      <p className="reaction-translation__original">{originalText}</p>
    </details>
  );
}

function CommentReplyCard({ reply }: { reply: ReactionCommentReply }) {
  return (
    <div className="reaction-comment__reply">
      <div className="reaction-comment__reply-head">
        <span className="reaction-comment__reply-author">{reply.authorDisplayName}</span>
        <TranslationBadge hasTranslation={reply.hasTranslation} source={reply.translationSource} />
      </div>
      <p className="reaction-comment__reply-text">{reply.text}</p>
      {reply.hasTranslation ? (
        <OriginalTextDisclosure originalText={reply.originalText} summaryLabel="답글 원문 보기" />
      ) : null}
      <span className="reaction-comment__reply-meta">
        좋아요 {formatCompactNumber(reply.likeCount)} · {formatKoreanDate(reply.publishedAt)}
      </span>
    </div>
  );
}

function CommentRepliesSection({ comment, youtubeVideoId }: CommentRepliesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const repliesResource = useAsyncResource(
    () => apiClient.getReactionCommentReplies(youtubeVideoId, comment.id),
    [youtubeVideoId, comment.id],
    {
      enabled: isOpen && comment.replyCount > 0,
      initialData: null,
    },
  );

  if (comment.replyCount <= 0) {
    return null;
  }

  return (
    <div className="reaction-comment__replies-shell">
      <button
        className="chip-button chip-button--ghost reaction-comment__reply-toggle"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "답글 숨기기" : `답글 보기 (${formatCompactNumber(comment.replyCount)})`}
      </button>

      {isOpen ? (
        <div className="reaction-comment__replies-panel">
          {repliesResource.isLoading && !repliesResource.data ? (
            <div className="reaction-comment__reply-state">답글을 한국어로 정리하고 있어요.</div>
          ) : null}

          {repliesResource.error ? (
            <div className="reaction-comment__reply-state reaction-comment__reply-state--danger">
              <p>{repliesResource.error}</p>
              <button
                className="chip-button chip-button--ghost"
                type="button"
                onClick={() => {
                  void repliesResource.refetch();
                }}
              >
                다시 시도
              </button>
            </div>
          ) : null}

          {repliesResource.data ? (
            <>
              <p className="reaction-comment__reply-notice">{repliesResource.data.message}</p>

              {repliesResource.data.status === "ok" ? (
                <div className="reaction-comment__replies">
                  {repliesResource.data.items.map((reply) => (
                    <CommentReplyCard key={reply.id} reply={reply} />
                  ))}
                </div>
              ) : (
                <div className="reaction-comment__reply-state">
                  {repliesResource.data.status === "unavailable"
                    ? "답글을 바로 번역하지 못해 잠시 후 다시 시도해 주세요."
                    : "표시할 답글이 없어요."}
                </div>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentCard({
  comment,
  youtubeVideoId,
}: {
  comment: ReactionComment;
  youtubeVideoId: string;
}) {
  return (
    <article className="reaction-comment">
      <div className="reaction-comment__head">
        <span className="reaction-comment__avatar">
          {comment.authorProfileImageUrl ? (
            <img
              className="reaction-comment__avatar-image"
              src={comment.authorProfileImageUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            comment.authorDisplayName.slice(0, 1)
          )}
        </span>
        <div className="reaction-comment__identity">
          <div className="reaction-comment__identity-row">
            <p className="reaction-comment__author">{comment.authorDisplayName}</p>
            <TranslationBadge hasTranslation={comment.hasTranslation} source={comment.translationSource} />
          </div>
          <p className="reaction-comment__meta">
            좋아요 {formatCompactNumber(comment.likeCount)} · {formatKoreanDate(comment.publishedAt)}
          </p>
        </div>
      </div>

      <p className="reaction-comment__text">{comment.text}</p>
      {comment.hasTranslation ? (
        <OriginalTextDisclosure originalText={comment.originalText} summaryLabel="댓글 원문 보기" />
      ) : null}
      <div className="reaction-comment__foot">
        <span>답글 {formatCompactNumber(comment.replyCount)}</span>
        <span>수정 {formatKoreanDate(comment.updatedAt)}</span>
      </div>
      <CommentRepliesSection comment={comment} youtubeVideoId={youtubeVideoId} />
    </article>
  );
}

export function ReactionListItem({ isExpanded, onToggle, reaction }: ReactionListItemProps) {
  const panelId = `reaction-panel-${reaction.id}`;
  const canRenderInlinePlayer = YOUTUBE_VIDEO_ID_PATTERN.test(reaction.youtubeVideoId);
  const commentResource = useAsyncResource(
    () => apiClient.getReactionComments(reaction.youtubeVideoId, DEFAULT_TOP_COMMENT_LIMIT),
    [reaction.youtubeVideoId],
    {
      enabled: isExpanded,
      initialData: null,
    },
  );

  return (
    <article className={`reaction-card ${isExpanded ? "reaction-card--expanded" : ""}`}>
      <button
        className="reaction-card__trigger"
        type="button"
        aria-controls={panelId}
        aria-expanded={isExpanded}
        onClick={onToggle}
      >
        <span className="reaction-card__avatar">{reaction.channelName.slice(0, 1)}</span>
        <span className="reaction-card__body">
          <span className="reaction-card__title">{reaction.title}</span>
          <span className="reaction-card__channel">{reaction.channelName}</span>
        </span>
        <span className="reaction-card__meta">
          <span>조회수 {formatCompactNumber(reaction.viewCount)}</span>
          <span>{formatKoreanDate(reaction.publishedAt)}</span>
        </span>
        <span className="reaction-card__cta">{isExpanded ? "접기" : "영상 보기"}</span>
      </button>

      {isExpanded ? (
        <div className="reaction-card__expand" id={panelId}>
          <div className="reaction-card__expand-head">
            <span className="reaction-card__section-chip">관련 영상</span>
            <button
              className="reaction-card__section-chip reaction-card__section-chip--action"
              type="button"
              onClick={() => {
                void commentResource.refetch();
              }}
              disabled={commentResource.isLoading}
            >
              댓글 다시 보기
            </button>
          </div>

          <div className="reaction-card__expand-stage">
            <div className="reaction-card__player-column">
              <div className="reaction-card__player">
                {canRenderInlinePlayer ? (
                  <iframe
                    className="reaction-card__frame"
                    src={getInlineEmbedUrl(reaction)}
                    title={reaction.title}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="reaction-card__empty">
                    현재 데이터에는 인라인 재생이 가능한 영상 ID가 없어 유튜브 원문 링크로만 확인할 수 있어요.
                  </div>
                )}
              </div>

              <div className="reaction-card__summary">
                <div>
                  <div className="reaction-card__summary-heading">
                    <p className="reaction-card__summary-title">{reaction.title}</p>
                    <TranslationBadge
                      hasTranslation={reaction.hasTitleTranslation}
                      source={reaction.titleTranslationSource}
                    />
                  </div>
                  {reaction.hasTitleTranslation ? (
                    <OriginalTextDisclosure originalText={reaction.titleOriginal} summaryLabel="제목 원문 보기" />
                  ) : null}
                  <p className="reaction-card__summary-channel">{reaction.channelName}</p>
                  {reaction.description ? (
                    <div className="reaction-card__summary-copy">
                      <div className="reaction-card__summary-copy-head">
                        <TranslationBadge
                          hasTranslation={reaction.hasDescriptionTranslation}
                          source={reaction.descriptionTranslationSource}
                        />
                      </div>
                      <p className="reaction-card__summary-description">{reaction.description}</p>
                      {reaction.hasDescriptionTranslation ? (
                        <OriginalTextDisclosure
                          originalText={reaction.descriptionOriginal}
                          summaryLabel="소개글 원문 보기"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="reaction-card__summary-meta">
                  <span>조회수 {formatCompactNumber(reaction.viewCount)}</span>
                  <span>좋아요 {formatCompactNumber(reaction.likeCount)}</span>
                  <span>댓글 {formatCompactNumber(reaction.commentCount)}</span>
                  <span>업로드 {formatKoreanDate(reaction.publishedAt)}</span>
                  <a
                    className="chip-button chip-button--solid"
                    href={reaction.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    유튜브 원문 보기
                  </a>
                </div>
              </div>
            </div>

            <aside className="reaction-comments" aria-label="유튜브 댓글">
              <div className="reaction-comments__header">
                <div>
                  <p className="reaction-comments__eyebrow">유튜브 댓글</p>
                  <p className="reaction-comments__title">영상 반응을 함께 살펴보세요.</p>
                </div>
                <span className="reaction-comments__count">
                  총 댓글 {formatCompactNumber(reaction.commentCount)}
                </span>
              </div>

              {commentResource.isLoading && !commentResource.data ? (
                <div className="reaction-comments__state">
                  댓글을 정리하고 있어요. 잠시만 기다려 주세요.
                </div>
              ) : null}

              {commentResource.error ? (
                <div className="reaction-comments__state reaction-comments__state--danger">
                  <p className="reaction-comments__state-title">댓글을 불러오지 못했어요.</p>
                  <p className="reaction-comments__state-copy">{commentResource.error}</p>
                  <button
                    className="chip-button chip-button--ghost"
                    type="button"
                    onClick={() => {
                      void commentResource.refetch();
                    }}
                  >
                    다시 시도
                  </button>
                </div>
              ) : null}

              {commentResource.data ? (
                <>
                  <p className="reaction-comments__notice">{commentResource.data.message}</p>

                  {commentResource.data.status === "ok" ? (
                    <div className="reaction-comments__scroll">
                      <div className="reaction-comments__list">
                        {commentResource.data.items.map((comment) => (
                          <CommentCard
                            key={comment.id}
                            comment={comment}
                            youtubeVideoId={reaction.youtubeVideoId}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="reaction-comments__state">
                      {commentResource.data.status === "disabled"
                        ? "이 영상은 댓글 기능이 꺼져 있어요."
                        : commentResource.data.status === "unavailable"
                          ? "잠시 후 다시 시도하거나 유튜브 원문에서 직접 확인해 주세요."
                          : "아직 표시할 댓글이 없어요."}
                    </div>
                  )}
                </>
              ) : null}
            </aside>
          </div>
        </div>
      ) : null}
    </article>
  );
}
