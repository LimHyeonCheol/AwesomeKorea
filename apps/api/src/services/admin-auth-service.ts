import { scryptSync, timingSafeEqual } from "node:crypto";

import type { AdminProfile } from "@awesomekorea/shared";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";

import type { AdminAuthUser } from "../repositories/admin-auth-repository";
import type { AppBindings } from "../types";

const ADMIN_SESSION_COOKIE_NAME = "awesomekorea_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;
const LOCAL_ADMIN_SESSION_SECRET = "awesomekorea-local-admin-session-secret";

interface AdminSessionPayload {
  displayName: string;
  expiresAt: string;
  loginId: string;
}

type AdminContextLike = Context<AppBindings>;

const toAdminProfile = (adminUser: Pick<AdminAuthUser, "displayName" | "loginId">): AdminProfile => ({
  loginId: adminUser.loginId,
  displayName: adminUser.displayName,
});

const resolveAdminSessionSecret = (env: AppBindings["Bindings"]) => {
  const configuredSecret = env.ADMIN_SESSION_SECRET?.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if ((env.APP_ENV ?? "local") === "local") {
    return LOCAL_ADMIN_SESSION_SECRET;
  }

  throw new HTTPException(503, {
    message: "관리자 세션 시크릿이 설정되지 않았습니다.",
  });
};

const isLocalOrigin = (origin: string) => {
  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.protocol === "http:" &&
      (parsedOrigin.hostname === "localhost" || parsedOrigin.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
};

const normalizeAllowedOrigins = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

const isAllowedAdminOrigin = (
  env: AppBindings["Bindings"],
  requestUrl: string,
  originHeader: string,
) => {
  if (!originHeader) {
    return true;
  }

  try {
    const requestOrigin = new URL(requestUrl).origin;

    if (originHeader === requestOrigin) {
      return true;
    }
  } catch {
    return false;
  }

  if ((env.APP_ENV ?? "local") === "local" && isLocalOrigin(originHeader)) {
    return true;
  }

  return normalizeAllowedOrigins(env.ADMIN_ALLOWED_ORIGINS).includes(originHeader);
};

const createSessionCookieOptions = (env: AppBindings["Bindings"], requestUrl: string) => {
  const requestOrigin = new URL(requestUrl);
  const isProduction = (env.APP_ENV ?? "local") !== "local" && requestOrigin.protocol === "https:";

  return {
    httpOnly: true,
    maxAge: ADMIN_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: isProduction ? "None" : "Lax",
    secure: isProduction,
  } as const;
};

const parseAdminSession = (rawValue: string): AdminSessionPayload | null => {
  try {
    const parsed = JSON.parse(rawValue) as Partial<AdminSessionPayload>;

    if (
      typeof parsed.loginId !== "string" ||
      parsed.loginId.trim().length === 0 ||
      typeof parsed.displayName !== "string" ||
      parsed.displayName.trim().length === 0 ||
      typeof parsed.expiresAt !== "string"
    ) {
      return null;
    }

    return {
      loginId: parsed.loginId,
      displayName: parsed.displayName,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
};

export const assertAllowedAdminOrigin = (context: AdminContextLike) => {
  const originHeader = context.req.header("Origin") ?? "";

  if (isAllowedAdminOrigin(context.env, context.req.url, originHeader)) {
    return;
  }

  throw new HTTPException(403, {
    message: "허용되지 않은 관리자 접근 경로입니다.",
  });
};

export const verifyAdminPassword = (
  password: string,
  passwordHash: string,
) => {
  const [algorithm, saltHex, digestHex] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !saltHex || !digestHex) {
    return false;
  }

  try {
    const expectedDigest = Buffer.from(digestHex, "hex");
    const derivedDigest = scryptSync(password, Buffer.from(saltHex, "hex"), expectedDigest.length);

    return timingSafeEqual(derivedDigest, expectedDigest);
  } catch {
    return false;
  }
};

export const createAdminSession = async (
  context: AdminContextLike,
  adminUser: Pick<AdminAuthUser, "displayName" | "loginId">,
) => {
  const sessionSecret = resolveAdminSessionSecret(context.env);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000).toISOString();

  await setSignedCookie(
    context,
    ADMIN_SESSION_COOKIE_NAME,
    JSON.stringify({
      loginId: adminUser.loginId,
      displayName: adminUser.displayName,
      expiresAt,
    } satisfies AdminSessionPayload),
    sessionSecret,
    createSessionCookieOptions(context.env, context.req.url),
  );
};

export const clearAdminSession = (context: AdminContextLike) => {
  deleteCookie(
    context,
    ADMIN_SESSION_COOKIE_NAME,
    createSessionCookieOptions(context.env, context.req.url),
  );
};

export const readAdminSession = async (
  context: AdminContextLike,
): Promise<AdminProfile | null> => {
  const sessionSecret = resolveAdminSessionSecret(context.env);
  const rawValue = await getSignedCookie(context, sessionSecret, ADMIN_SESSION_COOKIE_NAME);

  if (rawValue === undefined) {
    return null;
  }

  if (rawValue === false) {
    clearAdminSession(context);
    return null;
  }

  const sessionPayload = parseAdminSession(rawValue);

  if (!sessionPayload) {
    clearAdminSession(context);
    return null;
  }

  if (Date.parse(sessionPayload.expiresAt) <= Date.now()) {
    clearAdminSession(context);
    return null;
  }

  return {
    loginId: sessionPayload.loginId,
    displayName: sessionPayload.displayName,
  };
};

export const requireAdminSession = async (
  context: AdminContextLike,
  getAdminUser: (loginId: string) => Promise<AdminAuthUser | null>,
): Promise<AdminProfile> => {
  assertAllowedAdminOrigin(context);

  const sessionAdmin = await readAdminSession(context);

  if (!sessionAdmin) {
    throw new HTTPException(401, {
      message: "관리자 로그인이 필요합니다.",
    });
  }

  const adminUser = await getAdminUser(sessionAdmin.loginId);

  if (!adminUser || !adminUser.isActive) {
    clearAdminSession(context);
    throw new HTTPException(401, {
      message: "관리자 로그인이 필요합니다.",
    });
  }

  return toAdminProfile(adminUser);
};
