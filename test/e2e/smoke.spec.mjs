import { test, expect } from "@playwright/test";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Column data returned for each table, in /get/records/bycolumn shape.
const TABLES = {
  "graph.nodes": { column_1: [1, 2, 3], column_2: ["one", "two", "three"] },
  "graph.edges": { column_1: [1, 2], column_2: [2, 3] },
  "graph.out": { column_1: [10, 20, 30], column_2: [20, 30, 10] },
};

const KINETICA_URL = "http://kinetica.test:9191/**";

// Stands in for a Kinetica server at the fixture's fake host.
// Returns the list of tables requested, in order.
const stubKinetica = async (page) => {
  const requested = [];
  await page.route(KINETICA_URL, (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: CORS_HEADERS });
    }
    const { table_name } = request.postDataJSON();
    requested.push(table_name);
    const columns = TABLES[table_name];
    return route.fulfill({
      headers: CORS_HEADERS,
      json: {
        status: "OK",
        data_type: "get_records_by_column_response",
        data_str: JSON.stringify({
          table_name,
          json_encoded_response: JSON.stringify(columns),
        }),
      },
    });
  });
  return requested;
};

// Fails the test on uncaught page errors, e.g. a broken bundle.
const trackErrors = (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

const graphData = (page) =>
  page.evaluate(() => {
    const data = window.__graph?.graphData();
    if (!data) return null;
    return {
      nodes: data.nodes.map((node) => node.id).sort(),
      links: data.links.length,
    };
  });

let requested;
test.beforeEach(async ({ page }) => {
  requested = await stubKinetica(page);
});

test("renders raw nodes and edges", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/?scenario=raw");

  await expect(page.locator("#graph canvas")).toHaveCount(1);
  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: ["a", "b", "c"], links: 2 });
  expect(errors).toEqual([]);
});

test("loads node and edge tables from Kinetica", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/?scenario=tables");

  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: [1, 2, 3], links: 2 });
  expect(errors).toEqual([]);
});

test("loads a data table from Kinetica", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/?scenario=data");

  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: [10, 20, 30], links: 3 });
  expect(errors).toEqual([]);
});

test("creates one graph when options are omitted", async ({ page }) => {
  await page.goto("/?scenario=raw&noOptions");
  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: ["a", "b", "c"], links: 2 });
  // Give a render loop time to show itself before counting.
  await page.waitForTimeout(1000);

  expect(await page.evaluate(() => window.__graphCount)).toBe(1);
});

test("does not reload data when the parent re-renders", async ({ page }) => {
  await page.goto("/?scenario=tables");
  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: [1, 2, 3], links: 2 });
  expect(requested).toEqual(["graph.nodes", "graph.edges"]);

  // Each re-render passes new, equal column arrays.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.__rerender());
  }
  await page.waitForTimeout(500);

  expect(requested).toEqual(["graph.nodes", "graph.edges"]);
  expect(await page.evaluate(() => window.__graphCount)).toBe(1);
});

test("renders under React StrictMode", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/?scenario=raw&strict");

  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: ["a", "b", "c"], links: 2 });
  await expect(page.locator("#graph canvas")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("unmounts cleanly", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/?scenario=raw");
  await expect
    .poll(() => graphData(page))
    .toEqual({ nodes: ["a", "b", "c"], links: 2 });

  const contextLost = () =>
    page.evaluate(() => {
      const gl = window.__canvas.getContext("webgl2");
      return gl.isContextLost();
    });
  await page.evaluate(() => {
    window.__canvas = document.querySelector("#graph canvas");
  });
  expect(await contextLost()).toBe(false);

  await page.evaluate(() => window.__unmount());
  await expect(page.locator("#graph")).toHaveCount(0);
  // The graph's WebGL context is released, not left for garbage collection.
  await expect.poll(contextLost).toBe(true);
  // The library's resize listener outlives the graph; it must not throw.
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForTimeout(300);

  expect(errors).toEqual([]);
});

test("logs a failed load instead of throwing", async ({ page }) => {
  const errors = trackErrors(page);
  const logged = [];
  page.on("console", (message) => {
    if (message.type() === "error") logged.push(message.text());
  });
  await page.route(KINETICA_URL, (route) =>
    route.fulfill({ status: 500, headers: CORS_HEADERS, body: "down" })
  );
  await page.goto("/?scenario=data");

  await expect
    .poll(() => logged.join("\n"))
    .toContain("KineticaGraphViz: failed to load graph data");
  expect(errors).toEqual([]);
});
