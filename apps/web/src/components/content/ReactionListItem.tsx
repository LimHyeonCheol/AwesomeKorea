import type { ReactionComment, ReactionVideo } from "@awesomekorea/shared";

import { useAsyncResource } from "../../hooks/useAsyncResource";
import { apiClient } from "../../lib/api-client";
import { formatCompactNumber, formatKoreanDate } from "../../lib/formatters";

const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

interface ReactionListItemProps {
  isExpanded: boolean;
  onToggle: () => void;
  reaction: ReactionVideo;
}

const getInlineEmbedUrl = (reaction: ReactionVideo) => {
  const separator = reaction.embedUrl.includes("?") ? "&" : "?";

  return `${reaction.embedUrl}${separator}playsinline=1&rel=0&modestbranding=1`;
};

const renderCommentReplies = (comment: ReactionComment) => {
  if (comment.replies.length === 0) {
    return null;
  }

  return (
    <div className="reaction-comment__replies">
      {comment.replies.map((reply) => (
        <div key={reply.id} className="reaction-comment__reply">
          <span className="reaction-comment__reply-author">{reply.authorDisplayName}</span>
          <p className="reaction-comment__reply-text">{reply.text}</p>
          <span className="reaction-comment__reply-meta">
            좋아요 {formatCompactNumber(reply.likeCount)} · {formatKoreanDate(reply.publishedAt)}
          </span>
        </div>
      ))}
    </div>
  );
};

export function ReactionListItem({ isExpanded, onToggle, reaction }: ReactionListItemProps) {
  const panelId = `reaction-panel-${reaction.id}`;
  const canRenderInlinePlayer = YOUTUBE_VIDEO_ID_PATTERN.test(reaction.youtubeVideoId);
  const commentResource = useAsyncResource(
    () => apiClient.getReactionComments(reaction.youtubeVideoId),
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
              댓글 다시보기
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
                    현재 데이터에는 임베드 재생이 가능한 영상 ID가 없어 원본 링크로만 확인할 수 있어요.
                  </div>
                )}
              </div>

              <div className="reaction-card__summary">
                <div>
                  <p className="reaction-card__summary-title">{reaction.title}</p>
                  <p className="reaction-card__summary-channel">{reaction.channelName}</p>
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
                    유튜브 원본 보기
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
                          <article key={comment.id} className="reaction-comment">
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
                                <p className="reaction-comment__author">{comment.authorDisplayName}</p>
                                <p className="reaction-comment__meta">
                                  좋아요 {formatCompactNumber(comment.likeCount)} ·{" "}
                                  {formatKoreanDate(comment.publishedAt)}
                                </p>
                              </div>
                            </div>
                            <p className="reaction-comment__text">{comment.text}</p>
                            <div className="reaction-comment__foot">
                              <span>답글 {formatCompactNumber(comment.replyCount)}</span>
                              <span>수정 {formatKoreanDate(comment.updatedAt)}</span>
                            </div>
                            {renderCommentReplies(comment)}
                          </article>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="reaction-comments__state">
                      {commentResource.data.status === "disabled"
                        ? "이 영상은 댓글 기능이 꺼져 있어요."
                        : commentResource.data.status === "unavailable"
                          ? "잠시 후 다시 시도하거나 원본 영상에서 직접 확인해 주세요."
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
