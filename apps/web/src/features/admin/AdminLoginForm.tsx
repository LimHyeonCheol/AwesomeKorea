import { useState, type FormEvent } from "react";

import type { AdminProfile } from "@awesomekorea/shared";

import { apiClient } from "../../lib/api-client";

interface AdminLoginFormProps {
  onSuccess: (admin: AdminProfile) => void;
}

export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [loginId, setLoginId] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.loginAdmin({
        loginId,
        password,
      });

      setPassword("");
      onSuccess(response.admin);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "로그인을 처리하지 못했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel-section admin-login-panel">
      <div className="admin-login-card">
        <div className="admin-login-card__copy">
          <p className="admin-login-card__eyebrow">Admin Login</p>
          <h2 className="admin-login-card__title">관리자 로그인이 필요합니다.</h2>
          <p className="admin-login-card__description">
            브라우저에서 내부 토큰을 입력하지 않고, 세션 기반으로 어드민 화면에 접근합니다.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="admin-field">
            <span className="admin-field__label">아이디</span>
            <input
              autoComplete="username"
              className="admin-input"
              disabled={isSubmitting}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
            />
          </label>

          <label className="admin-field">
            <span className="admin-field__label">비밀번호</span>
            <input
              autoComplete="current-password"
              className="admin-input"
              disabled={isSubmitting}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="admin-login-form__error">{error}</p> : null}

          <button
            className="chip-button chip-button--solid admin-login-form__submit"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </section>
  );
}
