import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("initial state has isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    test("sets isLoading to true during call and false after", async () => {
      let resolveSignIn!: (v: any) => void;
      (signInAction as any).mockReturnValue(
        new Promise((res) => { resolveSignIn = res; })
      );
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("a@b.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: true });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the action result", async () => {
      const actionResult = { success: false, error: "Invalid credentials" };
      (signInAction as any).mockResolvedValue(actionResult);

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signIn("a@b.com", "wrong");
      });

      expect(returned).toEqual(actionResult);
    });

    test("does not navigate on failure", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "wrong");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when action throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with provided credentials", async () => {
      (signInAction as any).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@example.com", "mypassword");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "mypassword");
    });
  });

  describe("signUp", () => {
    test("sets isLoading to true during call and false after", async () => {
      let resolveSignUp!: (v: any) => void;
      (signUpAction as any).mockReturnValue(
        new Promise((res) => { resolveSignUp = res; })
      );
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("a@b.com", "password");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: true });
        await signUpPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("returns the action result", async () => {
      const actionResult = { success: false, error: "Email already registered" };
      (signUpAction as any).mockResolvedValue(actionResult);

      const { result } = renderHook(() => useAuth());

      let returned: any;
      await act(async () => {
        returned = await result.current.signUp("a@b.com", "password");
      });

      expect(returned).toEqual(actionResult);
    });

    test("does not navigate on failure", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("existing@b.com", "password");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading to false even when action throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("DB error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "password").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with provided credentials", async () => {
      (signUpAction as any).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
    });
  });

  describe("handlePostSignIn — anon work exists with messages", () => {
    const anonWork = {
      messages: [{ role: "user", content: "Make a button" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "<div/>" } },
    };

    beforeEach(() => {
      (getAnonWorkData as any).mockReturnValue(anonWork);
      (createProject as any).mockResolvedValue({ id: "anon-project-1" });
    });

    test("creates a project with anon work data on signIn success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
    });

    test("clears anon work after creating the project on signIn success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(clearAnonWork).toHaveBeenCalled();
    });

    test("navigates to the new project route on signIn success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-1");
    });

    test("does not call getProjects when anon work is present on signUp success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "password");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anon work exists but has no messages", () => {
    beforeEach(() => {
      (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
      (getProjects as any).mockResolvedValue([{ id: "existing-1" }]);
    });

    test("falls through to getProjects when anon messages is empty on signIn", async () => {
      (signInAction as any).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(getProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-1");
    });
  });

  describe("handlePostSignIn — no anon work", () => {
    beforeEach(() => {
      (getAnonWorkData as any).mockReturnValue(null);
    });

    test("navigates to most recent project when projects exist on signIn success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "proj-1" }, { id: "proj-2" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-1");
    });

    test("navigates to most recent project when projects exist on signUp success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([{ id: "proj-99" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-99");
    });

    test("creates a new project and navigates when no projects exist on signIn success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "new-proj-1" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-proj-1");
    });

    test("creates a new project and navigates when no projects exist on signUp success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "new-proj-2" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@b.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/new-proj-2");
    });

    test("new project name starts with 'New Design #' when no projects exist", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "np" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "password");
      });

      const callArg = (createProject as any).mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });
  });
});
