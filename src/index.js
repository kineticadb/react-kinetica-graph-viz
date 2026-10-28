/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";

// The graph library uses browser globals as soon as it is evaluated, so it is
// loaded only from an effect, which never runs during server-side rendering.
// Its UMD export may arrive as the module, its default, or a nested default.
const loadHelper = () =>
  import("@kinetica/kinetica-graph-viz").then((mod) => {
    const Helper = [mod.default?.default, mod.default, mod].find(
      (candidate) => typeof candidate === "function"
    );
    if (!Helper) {
      throw new Error(
        "@kinetica/kinetica-graph-viz did not export a constructor"
      );
    }
    return Helper;
  });

// Defaults must keep their identity across renders: a fresh {} here would
// re-run the effect below on every render and re-create the graph endlessly.
const DEFAULT_OPTIONS = {};
const DEFAULT_GRAPH_CONFIG = () => {};

// Compares column lists by value, so inline arrays don't reload the data.
const columnsKey = (columns) => JSON.stringify(columns);

// Creates the graph helper in the browser, and destroys it when a connection
// setting changes or the component unmounts. graph_config is applied once, when
// the graph is created, so setup that adds to the graph never runs twice.
const useGraphHelper = (settings) => {
  const { id, server, username, password, options, limit, curvature } =
    settings;
  const [kGraphViz, setKGraphViz] = useState(null);

  useEffect(() => {
    let viz = null;
    let cancelled = false;

    loadHelper()
      .then((KineticaGraphVizHelper) => {
        if (cancelled) {
          return;
        }
        viz = new KineticaGraphVizHelper(id, options);
        viz
          .connect(server, {
            username,
            password,
          })
          .limit(limit)
          .curvature(curvature)
          .graph(settings.graph_config);
        setKGraphViz(viz);
      })
      .catch((error) => {
        console.error("KineticaGraphViz: failed to create the graph", error);
      });

    return () => {
      cancelled = true;
      if (viz) {
        viz.destroy();
      }
    };
  }, [id, server, username, password, options, limit, curvature]);

  return kGraphViz;
};

// Points the helper at the data source given in props and draws it.
const useGraphData = (kGraphViz, source) => {
  const { nodes, node_table, node_columns, edges, edge_table, edge_columns } =
    source;
  const { data_table, data_columns } = source;

  useEffect(() => {
    if (kGraphViz) {
      if (nodes && nodes.length > 0 && edges && edges.length > 0) {
        kGraphViz.raw({
          nodes,
          edges,
        });
      } else if (node_table && edge_table && node_columns && edge_columns) {
        kGraphViz
          .nodes(node_table, node_columns)
          .edges(edge_table, edge_columns);
      } else if (data_table && data_columns) {
        kGraphViz.data(data_table, data_columns);
      }
      kGraphViz.render().catch((error) => {
        console.error("KineticaGraphViz: failed to load graph data", error);
      });
    }
  }, [
    kGraphViz,
    nodes,
    node_table,
    columnsKey(node_columns),
    edges,
    edge_table,
    columnsKey(edge_columns),
    data_table,
    columnsKey(data_columns),
  ]);
};

const KineticaGraphViz = ({
  id = "kinetica_graph_viz",
  server = "http://127.0.0.1:9191",
  username = "",
  password = "",
  options = DEFAULT_OPTIONS,
  nodes,
  node_table = "",
  node_columns,
  edges,
  edge_table = "",
  edge_columns,
  data_table = "",
  data_columns,
  limit = 1000,
  curvature = 1.0,
  graph_config = DEFAULT_GRAPH_CONFIG,
}) => {
  const kGraphViz = useGraphHelper({
    id,
    server,
    username,
    password,
    options,
    limit,
    curvature,
    graph_config,
  });
  useGraphData(kGraphViz, {
    nodes,
    node_table,
    node_columns,
    edges,
    edge_table,
    edge_columns,
    data_table,
    data_columns,
  });

  return <div id={id}></div>;
};

export { KineticaGraphViz };
