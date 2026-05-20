import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocationBadge } from "../ToolInvocationBadge";
import type { ToolInvocation } from "ai";

afterEach(() => {
  cleanup();
});

function makeInvocation(
  toolName: string,
  args: Record<string, unknown>,
  state: "call" | "result" = "result"
): ToolInvocation {
  if (state === "result") {
    return { toolCallId: "id", toolName, args, state, result: "ok" };
  }
  return { toolCallId: "id", toolName, args, state };
}

// str_replace_editor
test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "str_replace", path: "/components/Button.tsx" })}
    />
  );
  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "insert", path: "/index.ts" })}
    />
  );
  expect(screen.getByText("Editing index.ts")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "view", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Reading App.jsx")).toBeDefined();
});

test("shows 'Updating' label for str_replace_editor unknown command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })}
    />
  );
  expect(screen.getByText("Updating App.jsx")).toBeDefined();
});

// file_manager
test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", { command: "delete", path: "/old.jsx" })}
    />
  );
  expect(screen.getByText("Deleting old.jsx")).toBeDefined();
});

test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("file_manager", { command: "rename", path: "/old.jsx", new_path: "/new.jsx" })}
    />
  );
  expect(screen.getByText("Renaming old.jsx → new.jsx")).toBeDefined();
});

// Unknown tool fallback
test("shows raw tool name for unknown tools", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("some_unknown_tool", {})}
    />
  );
  expect(screen.getByText("some_unknown_tool")).toBeDefined();
});

// Partial/empty args
test("falls back to 'file' when path is missing", () => {
  render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", {})}
    />
  );
  expect(screen.getByText("Updating file")).toBeDefined();
});

// State: in-progress shows spinner, not green dot
test("shows spinner when state is call (in progress)", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "call")}
    />
  );
  expect(container.querySelector(".animate-spin")).not.toBeNull();
  expect(container.querySelector(".bg-emerald-500")).toBeNull();
});

// State: done shows green dot, not spinner
test("shows green dot when state is result (done)", () => {
  const { container } = render(
    <ToolInvocationBadge
      toolInvocation={makeInvocation("str_replace_editor", { command: "create", path: "/App.jsx" }, "result")}
    />
  );
  expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  expect(container.querySelector(".animate-spin")).toBeNull();
});
