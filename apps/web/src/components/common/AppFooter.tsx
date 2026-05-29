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
          <p className="site-footer__title">AwesomeKorea MVP</p>
          <p className="site-footer__copy">
            대한민국 콘텐츠의 해외 유튜브 반응을 카테고리별로 빠르게 정리하는 Cloudflare
            네이티브 서비스
          </p>
        </div>
        <div className="site-footer__meta">
          <span>마지막 갱신 {formatUpdatedAt(updatedAt)}</span>
          <span>Workers · D1 · KV · React/Vite</span>
        </div>
      </div>
    </footer>
  );
}
