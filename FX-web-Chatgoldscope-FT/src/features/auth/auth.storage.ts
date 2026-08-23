import type {
  AuthenticatedUser,
  AuthenticationTokens,
} from "./auth.types";

const ACCESS_TOKEN_KEY =
  "goldscope_access_token";

const REFRESH_TOKEN_KEY =
  "goldscope_refresh_token";

const AUTH_USER_KEY =
  "goldscope_auth_user";

const SESSION_ID_KEY =
  "goldscope_session_id";

const REFRESH_EXPIRES_AT_KEY =
  "goldscope_refresh_expires_at";

function getStorage():
  Storage | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }

  return window.localStorage;
}

export function saveAuthenticationTokens(
  authentication:
    AuthenticationTokens,
): void {
  const storage =
    getStorage();

  if (!storage) {
    return;
  }

  storage.setItem(
    ACCESS_TOKEN_KEY,
    authentication.accessToken,
  );

  storage.setItem(
    REFRESH_TOKEN_KEY,
    authentication.refreshToken,
  );

  storage.setItem(
    SESSION_ID_KEY,
    authentication.sessionId,
  );

  storage.setItem(
    REFRESH_EXPIRES_AT_KEY,
    authentication.refreshTokenExpiresAt,
  );
}

export function saveAuthSession(
  user: AuthenticatedUser,
  authentication:
    AuthenticationTokens,
): void {
  const storage =
    getStorage();

  if (!storage) {
    return;
  }

  saveAuthenticationTokens(
    authentication,
  );

  storage.setItem(
    AUTH_USER_KEY,
    JSON.stringify(user),
  );

  /*
   * Remove old development/sessionStorage
   * authentication values after migration.
   */
  window.sessionStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  window.sessionStorage.removeItem(
    REFRESH_TOKEN_KEY,
  );

  window.sessionStorage.removeItem(
    SESSION_ID_KEY,
  );

  window.sessionStorage.removeItem(
    AUTH_USER_KEY,
  );

  window.sessionStorage.removeItem(
    "goldscope_demo_authenticated",
  );

  window.sessionStorage.removeItem(
    "goldscope_demo_user",
  );
}

export function getAccessToken():
  | string
  | null {
  return getStorage()?.getItem(
    ACCESS_TOKEN_KEY,
  ) ?? null;
}

export function getRefreshToken():
  | string
  | null {
  return getStorage()?.getItem(
    REFRESH_TOKEN_KEY,
  ) ?? null;
}

export function getSessionId():
  | string
  | null {
  return getStorage()?.getItem(
    SESSION_ID_KEY,
  ) ?? null;
}

export function getRefreshTokenExpiresAt():
  | string
  | null {
  return getStorage()?.getItem(
    REFRESH_EXPIRES_AT_KEY,
  ) ?? null;
}

export function getAuthenticatedUser():
  | AuthenticatedUser
  | null {
  const storedUser =
    getStorage()?.getItem(
      AUTH_USER_KEY,
    );

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(
      storedUser,
    ) as AuthenticatedUser;
  } catch {
    return null;
  }
}

export function hasAuthSession():
  boolean {
  const refreshToken =
    getRefreshToken();

  const sessionId =
    getSessionId();

  const user =
    getAuthenticatedUser();

  if (
    !refreshToken ||
    !sessionId ||
    !user
  ) {
    return false;
  }

  const expiresAt =
    getRefreshTokenExpiresAt();

  if (!expiresAt) {
    return true;
  }

  const expiryTime =
    new Date(
      expiresAt,
    ).getTime();

  if (
    Number.isNaN(
      expiryTime,
    )
  ) {
    return false;
  }

  return expiryTime >
    Date.now();
}

export function clearAuthSession():
  void {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const keys = [
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
    SESSION_ID_KEY,
    AUTH_USER_KEY,
    REFRESH_EXPIRES_AT_KEY,
    "goldscope_demo_authenticated",
    "goldscope_demo_user",
  ];

  keys.forEach(
    (key) => {
      window.localStorage.removeItem(
        key,
      );

      window.sessionStorage.removeItem(
        key,
      );
    },
  );
}