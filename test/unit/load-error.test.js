import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { KineticaGraphViz } from "../../src/index.js";

// A bundler interop shape the loader does not recognise.
vi.mock("@kinetica/kinetica-graph-viz", () => ({
  default: { notAConstructor: true },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("reports a library export it cannot use", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  render(<KineticaGraphViz />);
  await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

  expect(consoleError).toHaveBeenCalledWith(
    "KineticaGraphViz: failed to create the graph",
    expect.objectContaining({
      message: "@kinetica/kinetica-graph-viz did not export a constructor",
    })
  );
});
