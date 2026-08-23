import type {
  ApiErrorResponse,
  AuthenticationTokens,
  LoginRequest,
  LoginResponse,
} from "./auth.types";

import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  saveAuthenticationTokens,
} from "./auth.storage";

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawApiBaseUrl) {
  throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured.");
}

const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");


export interface SignupRequest {
  fullName: string;
  phone: string;
  countryCode?: string;
  email?: string | null;
  password: string;
  whatsappConsent: boolean;
}

export interface SignupResponse {
  success: boolean;
  user?: {
    id: string;
    fullName: string | null;
    phone: string;
    countryCode: string;
    email: string | null;
    status: string;
    whatsappConsent: boolean;
  };
  verification?: {
    required: boolean;
  };
  message?: string;
}

interface RefreshResponse {
  success: true;
  authentication: AuthenticationTokens;
}

let refreshRequest: Promise<AuthenticationTokens> | null = null;

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function readErrorResponse(
  response: Response,
): Promise<ApiErrorResponse | null> {
  try {
    const payload: unknown = await response.json();

    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    return payload as ApiErrorResponse;
  } catch {
    return null;
  }
}

export async function signup(input: SignupRequest): Promise<SignupResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/signup`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload: SignupResponse | ApiErrorResponse = await response.json();

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    throw new AuthApiError(
      errorPayload.error?.message ?? "Registration could not be completed.",
      errorPayload.error?.code ?? "SIGNUP_FAILED",
      response.status,
    );
  }

  return payload as SignupResponse;
}

export async function login(input: LoginRequest): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload: LoginResponse | ApiErrorResponse = await response.json();

  if (!response.ok || !payload.success) {
    const errorPayload = payload as ApiErrorResponse;
    throw new AuthApiError(
      errorPayload.error?.message ?? "Sign in could not be completed.",
      errorPayload.error?.code ?? "LOGIN_FAILED",
      response.status,
    );
  }

  return payload as LoginResponse;
}

async function performRefresh(): Promise<AuthenticationTokens> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthSession();
    throw new AuthApiError(
      "Your session has expired. Please sign in again.",
      "AUTHENTICATION_REQUIRED",
      401,
    );
  }

  const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      refreshToken,
    }),
  });

  if (!response.ok) {
    const errorPayload = await readErrorResponse(response);
    clearAuthSession();
    throw new AuthApiError(
      errorPayload?.error?.message ??
        "Your session has expired. Please sign in again.",
      errorPayload?.error?.code ?? "SESSION_EXPIRED",
      response.status,
    );
  }

  const payload = (await response.json()) as RefreshResponse;

  if (!payload.success || !payload.authentication) {
    clearAuthSession();
    throw new AuthApiError(
      "Your session could not be refreshed.",
      "SESSION_REFRESH_FAILED",
      401,
    );
  }

  saveAuthenticationTokens(payload.authentication);
  return payload.authentication;
}

export async function refreshAuthenticationSession(): Promise<AuthenticationTokens> {
  if (!refreshRequest) {
    refreshRequest = performRefresh().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function fetchWithAccessToken(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  accessToken: string,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let accessToken = getAccessToken();

  if (!accessToken) {
    const authentication = await refreshAuthenticationSession();
    accessToken = authentication.accessToken;
  }

  let response = await fetchWithAccessToken(input, init, accessToken);

  if (response.status !== 401) {
    return response;
  }

  const authentication = await refreshAuthenticationSession();
  response = await fetchWithAccessToken(
    input,
    init,
    authentication.accessToken,
  );

  return response;
}