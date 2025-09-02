import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useAuth } from "../use-auth";
import * as actions from "@/actions";
import * as anonTracker from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

// Mock anonymous work tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

// Mock project actions
vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockRouter = { push: mockPush };

  const mockSignIn = vi.mocked(actions.signIn);
  const mockSignUp = vi.mocked(actions.signUp);
  const mockGetAnonWorkData = vi.mocked(anonTracker.getAnonWorkData);
  const mockClearAnonWork = vi.mocked(anonTracker.clearAnonWork);
  const mockGetProjects = vi.mocked(getProjects);
  const mockCreateProject = vi.mocked(createProject);

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    test("should handle successful sign in with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/test.js": { type: "file", content: "test" } },
      };
      const mockProject = { id: "project-123", name: "Test Project" };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signInResult = await result.current.signIn("test@example.com", "password");
        expect(signInResult.success).toBe(true);
      });

      expect(mockSignIn).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from \d/),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");
    });

    test("should handle successful sign in with existing projects", async () => {
      const mockProjects = [
        { id: "project-1", name: "Recent Project" },
        { id: "project-2", name: "Older Project" },
      ];

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("should handle successful sign in with no existing projects", async () => {
      const mockNewProject = { id: "new-project-123", name: "New Design" };

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockNewProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
    });

    test("should handle failed sign in", async () => {
      const mockError = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signInResult = await result.current.signIn("test@example.com", "wrong-password");
        expect(signInResult).toEqual(mockError);
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("should manage loading state during sign in", async () => {
      mockSignIn.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "test", name: "test" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signIn("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    test("should handle anonymous work with empty messages", async () => {
      const mockAnonWork = {
        messages: [],
        fileSystemData: {},
      };
      const mockProjects = [{ id: "project-1", name: "Existing Project" }];

      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockGetProjects.mockResolvedValue(mockProjects);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    test("should handle errors during post-sign-in flow", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockImplementation(() => {
        throw new Error("Anon work error");
      });

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await act(async () => {
          await result.current.signIn("test@example.com", "password");
        });
      }).rejects.toThrow("Anon work error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("should handle successful sign up with anonymous work", async () => {
      const mockAnonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/test.js": { type: "file", content: "test" } },
      };
      const mockProject = { id: "project-456", name: "New User Project" };

      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(mockAnonWork);
      mockCreateProject.mockResolvedValue(mockProject);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signUpResult = await result.current.signUp("newuser@example.com", "password");
        expect(signUpResult.success).toBe(true);
      });

      expect(mockSignUp).toHaveBeenCalledWith("newuser@example.com", "password");
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from \d/),
        messages: mockAnonWork.messages,
        data: mockAnonWork.fileSystemData,
      });
      expect(mockPush).toHaveBeenCalledWith("/project-456");
    });

    test("should handle failed sign up", async () => {
      const mockError = { success: false, error: "Email already exists" };
      mockSignUp.mockResolvedValue(mockError);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const signUpResult = await result.current.signUp("existing@example.com", "password");
        expect(signUpResult).toEqual(mockError);
      });

      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("should manage loading state during sign up", async () => {
      mockSignUp.mockImplementation(
        () =>
          new Promise((resolve) => setTimeout(() => resolve({ success: true }), 50))
      );
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "test", name: "test" });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.signUp("test@example.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("loading state", () => {
    test("should initialize with loading state as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("should reset loading state after sign in error", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await act(async () => {
          await result.current.signIn("test@example.com", "password");
        });
      }).rejects.toThrow("Network error");

      expect(result.current.isLoading).toBe(false);
    });

    test("should reset loading state after sign up error", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await act(async () => {
          await result.current.signUp("test@example.com", "password");
        });
      }).rejects.toThrow("Server error");

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle null anonymous work data", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "fallback", name: "Fallback" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
    });

    test("should handle undefined anonymous work data", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(undefined);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "fallback", name: "Fallback" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
    });

    test("should handle project creation failure", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await act(async () => {
          await result.current.signIn("test@example.com", "password");
        });
      }).rejects.toThrow("Database error");

      expect(result.current.isLoading).toBe(false);
    });

    test("should handle get projects failure", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockRejectedValue(new Error("Projects fetch error"));

      const { result } = renderHook(() => useAuth());

      await expect(async () => {
        await act(async () => {
          await result.current.signIn("test@example.com", "password");
        });
      }).rejects.toThrow("Projects fetch error");

      expect(result.current.isLoading).toBe(false);
    });
  });
});