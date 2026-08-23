export interface AuthenticatedUser {
  id: string;
  fullName: string | null;
  phone: string;
  countryCode: string;
  email: string | null;
  status: string;
  phoneVerifiedAt: string | null;
  onboardingCompleted: boolean;
}

export interface AuthenticationTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
}

export interface LoginRequest {
  phone: string;
  countryCode: string;
  password: string;
}

export interface LoginResponse {
  success: true;

  user: AuthenticatedUser;

  authentication: AuthenticationTokens;
}

export interface ApiErrorResponse {
  success: false;

  error: {
    code: string;
    message: string;
  };
}