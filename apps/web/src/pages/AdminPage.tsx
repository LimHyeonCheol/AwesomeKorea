import { useEffect, useState } from "react";

import type { AdminProfile } from "@awesomekorea/shared";

import { AppFooter } from "../components/common/AppFooter";
import { StatusNotice } from "../components/common/StatusNotice";
import { AdminEditorPage } from "../features/admin/AdminEditorPage";
import { AdminLoginForm } from "../features/admin/AdminLoginForm";
import { apiClient, isApiRequestError } from "../lib/api-client";

interface AdminPageProps {
  onNavigateHome: () => void;
}

export function AdminPage({ onNavigateHome }: AdminPageProps) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      setIsCheckingSession(true);

      try {
        const response = await apiClient.getAdminSession();

        if (!isMounted) {
          return;
        }

        setAdmin(response.admin);
        setPageError(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (isApiRequestError(error, 401)) {
          setAdmin(null);
          setPageError(null);
        } else {
          setAdmin(null);
          setPageError(
            error instanceof Error
              ? error.message
              : "로그인 상태를 확인하지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    void syncSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.logoutAdmin();
      setAdmin(null);
      setPageError(null);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "로그아웃을 처리하지 못했습니다.",
      );
    }
  };

  const handleSessionExpired = () => {
    setAdmin(null);
    setPageError("세션이 만료되어 다시 로그인해야 합니다.");
  };

  const handleRefresh = () => {
    setPageError(null);
    setRefreshKey((current) => current + 1);
  };

  return (
    <div className="app-shell">
      <header className="admin-header">
        <div className="admin-header__inner">
          <div>
            <p className="admin-header__eyebrow">AwesomeKorea Admin</p>
            <h1 className="admin-header__title">
              {admin ? "운영 수정 관리" : "관리자 로그인"}
            </h1>
            <p className="admin-header__copy">
              {admin
                ? "기존 카테고리, 콘텐츠, 유튜브 반응 노출 문구를 안전하게 수정하는 관리자 화면입니다."
                : "브라우저 토큰 입력을 없애고, 세션 기반 로그인으로 관리자 화면에 접근합니다."}
            </p>
          </div>

          <div className="admin-header__actions">
            {admin ? (
              <span className="admin-pill">{admin.displayName} 로그인 중</span>
            ) : null}
            <button
              className="chip-button chip-button--ghost"
              type="button"
              onClick={onNavigateHome}
            >
              메인으로 이동
            </button>
            {admin ? (
              <button
                className="chip-button chip-button--ghost"
                type="button"
                onClick={handleRefresh}
              >
                새로고침
              </button>
            ) : null}
            {admin ? (
              <button
                className="chip-button chip-button--solid"
                type="button"
                onClick={() => void handleLogout()}
              >
                로그아웃
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="site-main">
        <div className="page-stack">
          {pageError ? (
            <StatusNotice
              title="관리자 화면을 준비하지 못했습니다."
              description={pageError}
              tone="danger"
            />
          ) : null}

          {isCheckingSession ? (
            <StatusNotice
              title="로그인 상태를 확인하는 중입니다."
              description="관리자 세션과 접근 권한을 점검하고 있습니다."
            />
          ) : null}

          {!isCheckingSession && !admin ? (
            <AdminLoginForm
              onSuccess={(nextAdmin) => {
                setAdmin(nextAdmin);
                setPageError(null);
                setRefreshKey((current) => current + 1);
              }}
            />
          ) : null}

          {!isCheckingSession && admin ? (
            <AdminEditorPage
              admin={admin}
              onSessionExpired={handleSessionExpired}
              refreshKey={refreshKey}
            />
          ) : null}
        </div>
      </main>

      <AppFooter updatedAt={null} />
    </div>
  );
}
