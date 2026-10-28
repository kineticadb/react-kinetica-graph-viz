import { test, expect } from "@playwright/test";

// Runs the built component against a real Kinetica server. Everything comes
// from the environment, so no server details or credentials live in the repo:
//
//   KINETICA_URL           server URL, e.g. http://host:9191 (required)
//   KINETICA_USER          username (optional)
//   KINETICA_PASS          password (optional)
//   KINETICA_LIMIT         rows to request (default 100)
//   KINETICA_DATA_TABLE    data mode: table name
//   KINETICA_DATA_COLUMNS  data mode: node1,node2[,label]
//   KINETICA_NODE_TABLE    tables mode: node table name
//   KINETICA_NODE_COLUMNS  tables mode: id[,name[,label]]
//   KINETICA_EDGE_TABLE    tables mode: edge table name
//   KINETICA_EDGE_COLUMNS  tables mode: node1,node2[,label]
//   KINETICA_INSECURE_TLS  set to 1 to accept a self-signed certificate

const env = process.env;
const LIMIT = Number(env.KINETICA_LIMIT ?? 100);

const columns = (value) =>
  (value ?? "")
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean);

const DATA_COLUMNS = columns(env.KINETICA_DATA_COLUMNS);
const NODE_COLUMNS = columns(env.KINETICA_NODE_COLUMNS);
const EDGE_COLUMNS = columns(env.KINETICA_EDGE_COLUMNS);

test.skip(!env.KINETICA_URL, "Set KINETICA_URL to run live tests");

// Renders the component with the given table props through the /kinetica proxy.
const renderLive = async (page, tableProps) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript((props) => {
    window.__liveProps = {
      ...props,
      server: `${window.location.origin}/kinetica`,
    };
  }, {
    username: env.KINETICA_USER ?? "",
    password: env.KINETICA_PASS ?? "",
    limit: LIMIT,
    ...tableProps,
  });
  await page.goto("/");
  return errors;
};

const LOAD_TIMEOUT = 30_000;

// Waits for drawn data, failing fast with the server's error if a load fails.
const waitForGraph = async (page, errors) => {
  const deadline = Date.now() + LOAD_TIMEOUT;
  for (;;) {
    if (errors.length > 0) {
      throw new Error(`Graph failed to load:\n${errors.join("\n")}`);
    }
    const drawn = await page.evaluate(
      () => window.__graph?.graphData().nodes.length > 0
    );
    if (drawn) break;
    if (Date.now() > deadline) {
      throw new Error(`No graph data drawn within ${LOAD_TIMEOUT / 1000}s`);
    }
    await page.waitForTimeout(250);
  }

  return page.evaluate(() => {
    const { nodes, links } = window.__graph.graphData();
    const id = (end) => (typeof end === "object" ? end?.id : end);
    return {
      nodes: nodes.map(({ id, name, label }) => ({ id, name, label })),
      links: links.map((link) => ({
        source: id(link.source),
        target: id(link.target),
        hasLabel: "label" in link,
      })),
    };
  });
};

const expectValidGraph = ({ nodes, links }) => {
  expect(nodes.length).toBeGreaterThan(0);
  for (const node of nodes) {
    expect(node.id).not.toBeUndefined();
  }
  const ids = new Set(nodes.map((node) => node.id));
  for (const link of links) {
    expect(ids.has(link.source)).toBe(true);
    expect(ids.has(link.target)).toBe(true);
  }
};

// Unmounts the component and checks the WebGL context was released.
const expectCleanUnmount = async (page) => {
  await page.evaluate(() => {
    window.__canvas = document.querySelector("#graph canvas");
    window.__unmount();
  });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.__canvas.getContext("webgl2").isContextLost()
      )
    )
    .toBe(true);
};

test("draws a data table", async ({ page }) => {
  test.skip(
    !env.KINETICA_DATA_TABLE || DATA_COLUMNS.length < 2,
    "Set KINETICA_DATA_TABLE and KINETICA_DATA_COLUMNS"
  );
  const errors = await renderLive(page, {
    data_table: env.KINETICA_DATA_TABLE,
    data_columns: DATA_COLUMNS,
  });

  const graph = await waitForGraph(page, errors);

  expectValidGraph(graph);
  expect(graph.links.length).toBeGreaterThan(0);
  expect(graph.links.length).toBeLessThanOrEqual(LIMIT);
  if (DATA_COLUMNS.length === 3) {
    expect(graph.links.every((link) => link.hasLabel)).toBe(true);
  }
  await expectCleanUnmount(page);
  expect(errors).toEqual([]);
});

test("draws node and edge tables", async ({ page }) => {
  test.skip(
    !env.KINETICA_NODE_TABLE ||
      !env.KINETICA_EDGE_TABLE ||
      NODE_COLUMNS.length < 1 ||
      EDGE_COLUMNS.length < 2,
    "Set KINETICA_NODE_TABLE/COLUMNS and KINETICA_EDGE_TABLE/COLUMNS"
  );
  const errors = await renderLive(page, {
    node_table: env.KINETICA_NODE_TABLE,
    node_columns: NODE_COLUMNS,
    edge_table: env.KINETICA_EDGE_TABLE,
    edge_columns: EDGE_COLUMNS,
  });

  const graph = await waitForGraph(page, errors);

  expectValidGraph(graph);
  expect(graph.links.length).toBeLessThanOrEqual(LIMIT);
  if (NODE_COLUMNS.length >= 2) {
    expect(graph.nodes.some((node) => node.name !== undefined)).toBe(true);
  }
  if (EDGE_COLUMNS.length === 3) {
    expect(graph.links.every((link) => link.hasLabel)).toBe(true);
  }
  await expectCleanUnmount(page);
  expect(errors).toEqual([]);
});

test("reports a missing table instead of drawing nothing", async ({ page }) => {
  const errors = await renderLive(page, {
    data_table: "kinetica_graph_viz_live_test.no_such_table",
    data_columns: ["a", "b"],
  });

  await expect
    .poll(() => errors.join("\n"), { timeout: 30_000 })
    .toContain("KineticaGraphViz: failed to load graph data");
});
