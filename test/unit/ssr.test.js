// @vitest-environment node
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

// No mocks: the real graph library touches window/self when it is evaluated,
// so this only passes if the component defers loading it to the browser.
describe("server-side rendering", () => {
  it("renders the container without loading the graph library", async () => {
    const { KineticaGraphViz } = await import("../../src/index.js");

    expect(renderToString(<KineticaGraphViz id="graph" />)).toBe(
      '<div id="graph"></div>'
    );
  });
});
