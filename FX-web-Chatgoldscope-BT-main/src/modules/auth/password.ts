import bcrypt from "bcryptjs";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must contain at least ${PASSWORD_MIN_LENGTH} characters.`,
    );
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    throw new Error(
      `Password must contain no more than ${PASSWORD_MAX_LENGTH} characters.`,
    );
  }
}

export async function hashPassword(
  password: string,
): Promise<string> {
  validatePassword(password);

  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(password, passwordHash);
  } catch {
    return false;
  }
}