import React from "react";
import { act, render, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import KineticaGraphVizHelper from "@kinetica/kinetica-graph-viz";
import { KineticaGraphViz } from "../../src/index.js";

// Every helper instance records its calls; chainable methods return `this`.
const instances = [];
// Guards against render loops, which would otherwise exhaust memory.
const MAX_INSTANCES = 20;

vi.mock("@kinetica/kinetica-graph-viz", () => {
  const Helper = vi.fn(function (id, options) {
    if (instances.length >= MAX_INSTANCES) {
      throw new Error(`helper constructed ${MAX_INSTANCES}+ times`);
    }
    this.id = id;
    this.options = options;
    // Stands in for the 3d-force-graph instance the helper wraps.
    this.forceGraph = {};
    for (const method of [
      "connect",
      "limit",
      "curvature",
      "nodes",
      "edges",
      "data",
      "raw",
    ]) {
      this[method] = vi.fn(() => this);
    }
    this.graph = vi.fn((fn) => {
      fn(this.forceGraph);
      return this;
    });
    this.render = vi.fn(() => Promise.resolve());
    this.destroy = vi.fn();
    instances.push(this);
  });
  return { default: Helper };
});

const NODES = [{ id: 1 }, { id: 2 }];
const EDGES = [{ source: 1, target: 2 }];
const OPTIONS = { controlType: "orbit" };

const latest = () => instances[instances.length - 1];

// Lets the asynchronous library load, and the effects after it, finish.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const renderViz = async (element) => {
  const result = render(element);
  await settle();
  return {
    ...result,
    rerender: async (next) => {
      result.rerender(next);
      await settle();
    },
  };
};

beforeEach(() => {
  instances.length = 0;
  KineticaGraphVizHelper.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("KineticaGraphViz", () => {
  it("renders a container div with the given id", async () => {
    const { container } = await renderViz(<KineticaGraphViz id="my_graph" />);
    expect(container.querySelector("div#my_graph")).not.toBeNull();
  });

  it("uses default id and server when none are given", async () => {
    const { container } = await renderViz(<KineticaGraphViz />);
    expect(container.querySelector("div#kinetica_graph_viz")).not.toBeNull();
    expect(KineticaGraphVizHelper).toHaveBeenCalledWith(
      "kinetica_graph_viz",
      {}
    );
    expect(latest().connect).toHaveBeenCalledWith("http://127.0.0.1:9191", {
      username: "",
      password: "",
    });
    expect(latest().limit).toHaveBeenCalledWith(1000);
    expect(latest().curvature).toHaveBeenCalledWith(1.0);
  });

  it("configures the helper from props", async () => {
    const graphConfig = vi.fn();
    await renderViz(
      <KineticaGraphViz
        id="g"
        server="http://db:9191"
        username="admin"
        password="secret"
        options={OPTIONS}
        limit={50}
        curvature={0.5}
        graph_config={graphConfig}
      />
    );
    const viz = latest();
    expect(KineticaGraphVizHelper).toHaveBeenCalledWith("g", OPTIONS);
    expect(viz.connect).toHaveBeenCalledWith("http://db:9191", {
      username: "admin",
      password: "secret",
    });
    expect(viz.limit).toHaveBeenCalledWith(50);
    expect(viz.curvature).toHaveBeenCalledWith(0.5);
    expect(graphConfig).toHaveBeenCalledTimes(1);
    expect(graphConfig).toHaveBeenCalledWith(viz.forceGraph);
  });

  it("loads raw nodes and edges", async () => {
    await renderViz(<KineticaGraphViz nodes={NODES} edges={EDGES} />);
    const viz = latest();
    expect(viz.raw).toHaveBeenCalledWith({ nodes: NODES, edges: EDGES });
    expect(viz.nodes).not.toHaveBeenCalled();
    expect(viz.data).not.toHaveBeenCalled();
    expect(viz.render).toHaveBeenCalled();
  });

  it("loads separate node and edge tables", async () => {
    await renderViz(
      <KineticaGraphViz
        node_table="graph.nodes"
        node_columns={["id", "name"]}
        edge_table="graph.edges"
        edge_columns={["node1", "node2"]}
      />
    );
    const viz = latest();
    expect(viz.nodes).toHaveBeenCalledWith("graph.nodes", ["id", "name"]);
    expect(viz.edges).toHaveBeenCalledWith("graph.edges", ["node1", "node2"]);
    expect(viz.raw).not.toHaveBeenCalled();
    expect(viz.data).not.toHaveBeenCalled();
    expect(viz.render).toHaveBeenCalled();
  });

  it("loads a single data table", async () => {
    await renderViz(
      <KineticaGraphViz
        data_table="graph.out"
        data_columns={["EDGE_NODE1_ID", "EDGE_NODE2_ID"]}
      />
    );
    const viz = latest();
    expect(viz.data).toHaveBeenCalledWith("graph.out", [
      "EDGE_NODE1_ID",
      "EDGE_NODE2_ID",
    ]);
    expect(viz.raw).not.toHaveBeenCalled();
    expect(viz.nodes).not.toHaveBeenCalled();
    expect(viz.render).toHaveBeenCalled();
  });

  it("prefers raw data over tables when both are given", async () => {
    await renderViz(
      <KineticaGraphViz
        nodes={NODES}
        edges={EDGES}
        node_table="graph.nodes"
        node_columns={["id"]}
        edge_table="graph.edges"
        edge_columns={["node1", "node2"]}
        data_table="graph.out"
        data_columns={["a", "b"]}
      />
    );
    const viz = latest();
    expect(viz.raw).toHaveBeenCalled();
    expect(viz.nodes).not.toHaveBeenCalled();
    expect(viz.data).not.toHaveBeenCalled();
  });

  it("prefers node/edge tables over a data table", async () => {
    await renderViz(
      <KineticaGraphViz
        node_table="graph.nodes"
        node_columns={["id"]}
        edge_table="graph.edges"
        edge_columns={["node1", "node2"]}
        data_table="graph.out"
        data_columns={["a", "b"]}
      />
    );
    const viz = latest();
    expect(viz.nodes).toHaveBeenCalled();
    expect(viz.data).not.toHaveBeenCalled();
  });

  it("falls back to the data table when raw edges are empty", async () => {
    await renderViz(
      <KineticaGraphViz
        nodes={NODES}
        edges={[]}
        data_table="graph.out"
        data_columns={["a", "b"]}
      />
    );
    const viz = latest();
    expect(viz.raw).not.toHaveBeenCalled();
    expect(viz.data).toHaveBeenCalledWith("graph.out", ["a", "b"]);
  });

  it("ignores a node table without column lists", async () => {
    await renderViz(<KineticaGraphViz node_table="graph.nodes" edge_table="graph.edges" />);
    const viz = latest();
    expect(viz.nodes).not.toHaveBeenCalled();
    expect(viz.render).toHaveBeenCalled();
  });

  it("creates one helper when options are omitted", async () => {
    await renderViz(<KineticaGraphViz nodes={NODES} edges={EDGES} />);
    expect(instances).toHaveLength(1);
  });

  it("keeps one helper across re-renders when options are stable", async () => {
    const { rerender } = await renderViz(<KineticaGraphViz options={OPTIONS} />);
    await rerender(<KineticaGraphViz options={OPTIONS} />);
    expect(instances).toHaveLength(1);
  });

  it("re-renders on the same helper when data props change", async () => {
    const { rerender } = await renderViz(
      <KineticaGraphViz nodes={NODES} edges={EDGES} />
    );
    const viz = latest();
    const moreEdges = [...EDGES, { source: 2, target: 1 }];

    await rerender(<KineticaGraphViz nodes={NODES} edges={moreEdges} />);

    expect(instances).toHaveLength(1);
    expect(viz.raw).toHaveBeenLastCalledWith({ nodes: NODES, edges: moreEdges });
    expect(viz.render).toHaveBeenCalledTimes(2);
  });

  it("does not reload when re-rendered with equal inline props", async () => {
    const element = () => (
      <KineticaGraphViz
        node_table="graph.nodes"
        node_columns={["id", "name"]}
        edge_table="graph.edges"
        edge_columns={["node1", "node2"]}
        graph_config={() => {}}
      />
    );
    const { rerender } = await renderViz(element());
    await rerender(element());
    expect(latest().render).toHaveBeenCalledTimes(1);
  });

  it("reloads when column lists change", async () => {
    const { rerender } = await renderViz(
      <KineticaGraphViz data_table="graph.out" data_columns={["a", "b"]} />
    );
    await rerender(
      <KineticaGraphViz data_table="graph.out" data_columns={["a", "c"]} />
    );
    const viz = latest();
    expect(viz.data).toHaveBeenLastCalledWith("graph.out", ["a", "c"]);
    expect(viz.render).toHaveBeenCalledTimes(2);
  });

  it("applies graph_config once, even when a new function is passed", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = await renderViz(
      <KineticaGraphViz nodes={NODES} edges={EDGES} graph_config={first} />
    );
    await rerender(
      <KineticaGraphViz nodes={NODES} edges={EDGES} graph_config={second} />
    );
    const viz = latest();
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(instances).toHaveLength(1);
    expect(viz.render).toHaveBeenCalledTimes(1);
  });

  it("applies the current graph_config to a re-created graph", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = await renderViz(
      <KineticaGraphViz server="http://a:9191" graph_config={first} />
    );
    await rerender(
      <KineticaGraphViz server="http://b:9191" graph_config={second} />
    );
    expect(second).toHaveBeenCalledWith(latest().forceGraph);
  });

  it("creates a new helper and destroys the old one when connection props change", async () => {
    const { rerender } = await renderViz(<KineticaGraphViz server="http://a:9191" />);
    const first = latest();
    await rerender(<KineticaGraphViz server="http://b:9191" />);

    expect(instances).toHaveLength(2);
    expect(first.destroy).toHaveBeenCalledTimes(1);
    expect(latest().destroy).not.toHaveBeenCalled();
    expect(latest().connect).toHaveBeenCalledWith(
      "http://b:9191",
      expect.anything()
    );
  });

  it("destroys the graph on unmount", async () => {
    const { unmount } = await renderViz(<KineticaGraphViz />);
    unmount();
    expect(latest().destroy).toHaveBeenCalledTimes(1);
  });

  it("does not create a graph when unmounted before the library loads", async () => {
    const { unmount } = render(<KineticaGraphViz />);
    unmount();
    await settle();

    expect(instances).toHaveLength(0);
  });

  it("logs a graph that fails to be created", async () => {
    const error = new Error("WebGL unavailable");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    KineticaGraphVizHelper.mockImplementationOnce(function () {
      throw error;
    });

    await renderViz(<KineticaGraphViz />);

    expect(consoleError).toHaveBeenCalledWith(
      "KineticaGraphViz: failed to create the graph",
      error
    );
  });

  it("logs failures to load graph data", async () => {
    const error = new Error("connection refused");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    KineticaGraphVizHelper.mockImplementationOnce(function (...args) {
      const Helper = KineticaGraphVizHelper.getMockImplementation();
      Helper.apply(this, args);
      this.render = vi.fn(() => Promise.reject(error));
    });

    await renderViz(<KineticaGraphViz data_table="graph.out" data_columns={["a", "b"]} />);

    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "KineticaGraphViz: failed to load graph data",
        error
      )
    );
  });
});
