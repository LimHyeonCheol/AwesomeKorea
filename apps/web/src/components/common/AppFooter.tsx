interface AppFooterProps {
  updatedAt: string | null;
}

const formatUpdatedAt = (value: string | null) => {
  if (!value) {
    return "데이터 준비 중";
  }

  return new Date(value).toLocaleString("ko-KR");
};

export function AppFooter({ updatedAt }: AppFooterProps) {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div>
          <p className="site-footer__title">AwesomeKorea</p>
          <p className="site-footer__copy">
            지금 반응이 큰 한국 콘텐츠를 더 빠르게 찾고, 마음에 드는 해외 리액션은 바로 이어서
            감상해보세요.
          </p>
        </div>
        <div className="site-footer__meta">
          <span>마지막 갱신 {formatUpdatedAt(updatedAt)}</span>
          <span className="site-footer__version">배포 버전 {__APP_DEPLOY_VERSION__}</span>
        </div>
      </div>
    </footer>
  );
}
