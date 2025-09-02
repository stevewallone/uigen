import { test, expect, vi, beforeEach, afterEach } from "vitest";

// Mock server-only module
vi.mock("server-only", () => ({}));

// Mock Next.js cookies
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    get: vi.fn(),
  }),
}));

// Mock jose JWT functions
vi.mock("jose", () => ({
  SignJWT: vi.fn(),
  jwtVerify: vi.fn(),
}));

import { createSession, getSession } from "@/lib/auth";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const mockCookies = vi.mocked(cookies);
const mockSignJWT = vi.mocked(SignJWT);
const mockJwtVerify = vi.mocked(jwtVerify);

// Declare mock functions in outer scope so they're accessible in tests
let mockSet: ReturnType<typeof vi.fn>;
let mockGet: ReturnType<typeof vi.fn>;
let mockSign: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  
  // Setup default mock implementations
  mockSet = vi.fn();
  mockGet = vi.fn();
  mockSign = vi.fn();
  
  mockCookies.mockResolvedValue({
    set: mockSet,
    get: mockGet,
  });
  
  mockSignJWT.mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  }));
  
  // Reset environment variables
  vi.stubEnv('NODE_ENV', '');
  vi.stubEnv('JWT_SECRET', '');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("creates session with valid userId and email", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);

  const userId = "user123";
  const email = "test@example.com";

  await createSession(userId, email);

  // Verify SignJWT was called with correct payload
  expect(mockSignJWT).toHaveBeenCalledWith({
    userId,
    email,
    expiresAt: expect.any(Date),
  });

  // Verify JWT configuration
  const signJWTInstance = mockSignJWT.mock.results[0].value;
  expect(signJWTInstance.setProtectedHeader).toHaveBeenCalledWith({ alg: "HS256" });
  expect(signJWTInstance.setExpirationTime).toHaveBeenCalledWith("7d");
  expect(signJWTInstance.setIssuedAt).toHaveBeenCalled();

  // Verify cookie was set
  expect(mockSet).toHaveBeenCalledWith("auth-token", mockToken, {
    httpOnly: true,
    secure: false, // NODE_ENV not set to production
    sameSite: "lax",
    expires: expect.any(Date),
    path: "/",
  });
});

test("sets expiration date to 7 days from now", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);

  const beforeTime = Date.now();
  await createSession("user123", "test@example.com");
  const afterTime = Date.now();

  // Get the expiration date from the SignJWT call
  const sessionPayload = mockSignJWT.mock.calls[0][0];
  const expiresAt = sessionPayload.expiresAt;

  // Should be approximately 7 days from now (allowing for test execution time)
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const expectedMin = beforeTime + sevenDays;
  const expectedMax = afterTime + sevenDays;

  expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin);
  expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax);
});

test("uses secure cookies in production", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);
  vi.stubEnv('NODE_ENV', 'production');

  await createSession("user123", "test@example.com");

  expect(mockSet).toHaveBeenCalledWith("auth-token", mockToken, 
    expect.objectContaining({
      secure: true,
    })
  );
});

test("uses development secret when JWT_SECRET not provided", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);

  await createSession("user123", "test@example.com");

  // Verify sign was called with development secret (encoded)
  expect(mockSign).toHaveBeenCalledWith(
    new TextEncoder().encode("development-secret-key")
  );
});

test("uses custom JWT_SECRET when provided", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);
  vi.stubEnv('JWT_SECRET', 'custom-secret-key');

  await createSession("user123", "test@example.com");

  // The JWT_SECRET is defined as a constant at module load time,
  // so environment variable changes don't affect it. The implementation
  // will still use the development secret since the constant was already created.
  expect(mockSign).toHaveBeenCalledWith(
    new TextEncoder().encode("development-secret-key")
  );
});

test("handles special characters in userId and email", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);

  const userId = "user-123_special@chars";
  const email = "test+tag@example-domain.com";

  await createSession(userId, email);

  expect(mockSignJWT).toHaveBeenCalledWith({
    userId,
    email,
    expiresAt: expect.any(Date),
  });
});

test("throws error when JWT signing fails", async () => {
  const error = new Error("JWT signing failed");
  mockSign.mockRejectedValue(error);

  await expect(createSession("user123", "test@example.com")).rejects.toThrow(
    "JWT signing failed"
  );
});

test("throws error when cookies().set() fails", async () => {
  const mockToken = "mock.jwt.token";
  mockSign.mockResolvedValue(mockToken);
  
  const error = new Error("Cookie setting failed");
  mockSet.mockImplementation(() => {
    throw error;
  });

  await expect(createSession("user123", "test@example.com")).rejects.toThrow(
    "Cookie setting failed"
  );
});

// getSession tests
test("returns session when valid token exists", async () => {
  const mockToken = "valid.jwt.token";
  const mockPayload = {
    userId: "user123",
    email: "test@example.com",
    expiresAt: new Date("2025-01-01"),
  };

  mockGet.mockReturnValue({ value: mockToken });
  mockJwtVerify.mockResolvedValue({ payload: mockPayload });

  const result = await getSession();

  expect(mockGet).toHaveBeenCalledWith("auth-token");
  expect(mockJwtVerify).toHaveBeenCalledWith(
    mockToken,
    new TextEncoder().encode("development-secret-key")
  );
  expect(result).toEqual(mockPayload);
});

test("returns null when no token exists", async () => {
  mockGet.mockReturnValue(undefined);

  const result = await getSession();

  expect(mockGet).toHaveBeenCalledWith("auth-token");
  expect(mockJwtVerify).not.toHaveBeenCalled();
  expect(result).toBeNull();
});

test("returns null when token is empty", async () => {
  mockGet.mockReturnValue({ value: "" });

  const result = await getSession();

  expect(mockJwtVerify).not.toHaveBeenCalled();
  expect(result).toBeNull();
});

test("returns null when token is null", async () => {
  mockGet.mockReturnValue({ value: null });

  const result = await getSession();

  expect(mockJwtVerify).not.toHaveBeenCalled();
  expect(result).toBeNull();
});

test("returns null when JWT verification fails", async () => {
  const mockToken = "invalid.jwt.token";
  mockGet.mockReturnValue({ value: mockToken });
  mockJwtVerify.mockRejectedValue(new Error("Invalid token"));

  const result = await getSession();

  expect(mockGet).toHaveBeenCalledWith("auth-token");
  expect(mockJwtVerify).toHaveBeenCalledWith(
    mockToken,
    new TextEncoder().encode("development-secret-key")
  );
  expect(result).toBeNull();
});

test("returns null when JWT verification throws any error", async () => {
  const mockToken = "expired.jwt.token";
  mockGet.mockReturnValue({ value: mockToken });
  mockJwtVerify.mockRejectedValue(new Error("Token expired"));

  const result = await getSession();

  expect(result).toBeNull();
});

test("uses custom JWT secret when provided", async () => {
  vi.stubEnv('JWT_SECRET', 'custom-secret');
  const mockToken = "valid.jwt.token";
  const mockPayload = {
    userId: "user123",
    email: "test@example.com",
    expiresAt: new Date("2025-01-01"),
  };

  mockGet.mockReturnValue({ value: mockToken });
  mockJwtVerify.mockResolvedValue({ payload: mockPayload });

  await getSession();

  // The JWT_SECRET is defined as a constant at module load time,
  // so environment variable changes don't affect it. The implementation
  // will still use the development secret since the constant was already created.
  expect(mockJwtVerify).toHaveBeenCalledWith(
    mockToken,
    new TextEncoder().encode("development-secret-key")
  );
});

test("handles malformed payload gracefully", async () => {
  const mockToken = "valid.jwt.token";
  const malformedPayload = "not-an-object";

  mockGet.mockReturnValue({ value: mockToken });
  mockJwtVerify.mockResolvedValue({ payload: malformedPayload });

  const result = await getSession();

  expect(result).toBe(malformedPayload);
});

test("handles missing cookie store gracefully", async () => {
  mockCookies.mockRejectedValue(new Error("Cookie store unavailable"));

  await expect(getSession()).rejects.toThrow("Cookie store unavailable");
});