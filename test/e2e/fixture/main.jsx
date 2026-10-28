import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
// The built bundle, exactly as published to npm.
import { KineticaGraphViz } from "../../../dist/index.esm.js";

// Fake host; the tests intercept every request to it.
const SERVER = "http://kinetica.test:9191";
const OPTIONS = { controlType: "orbit" };

const SCENARIOS = {
  raw: {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
    ],
  },
  tables: {
    node_table: "graph.nodes",
    node_columns: ["id", "name"],
    edge_table: "graph.edges",
    edge_columns: ["node1", "node2"],
  },
  data: {
    data_table: "graph.out",
    data_columns: ["EDGE_NODE1_ID", "EDGE_NODE2_ID"],
  },
};

// Exposes the 3d-force-graph instance so tests can read what was drawn,
// and counts config calls so tests can detect re-creation.
window.__graphCount = 0;
const captureGraph = (graph) => {
  window.__graph = graph;
  window.__graphCount += 1;
};

const params = new URLSearchParams(window.location.search);
// Live tests inject server, credentials and tables here instead of a scenario.
const scenario =
  window.__liveProps ?? SCENARIOS[params.get("scenario")] ?? {};
const options = params.has("noOptions") ? {} : { options: OPTIONS };

const App = () => {
  const [, setRenders] = useState(0);
  const [mounted, setMounted] = useState(true);
  window.__rerender = () => setRenders((count) => count + 1);
  window.__unmount = () => setMounted(false);

  if (!mounted) {
    return null;
  }
  // Rebuilt every render, like inline array props in an application.
  const inlineProps = structuredClone(scenario);
  return (
    <KineticaGraphViz
      id="graph"
      server={SERVER}
      graph_config={captureGraph}
      {...options}
      {...inlineProps}
    />
  );
};

const app = <App />;
createRoot(document.getElementById("root")).render(
  params.has("strict") ? <StrictMode>{app}</StrictMode> : app
);
