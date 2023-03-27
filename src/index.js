import React, { useEffect } from "react";
import KineticaGraphVizHelper from "@kinetica/kinetica-graph-viz";

const KineticaGraphViz = ({
  id = "kinetica_graph_viz",
  server = "http://127.0.0.1:9191",
  username = "",
  password = "",
  options = {},
  nodes: [],
  node_table = "",
  node_columns = [],
  edges: [],
  edge_table = "",
  edge_columns = [],
  data_table = "",
  data_columns = [],
  data_group = undefined,
  limit = 1000,
  graph_config = () => {},
}) => {
  useEffect(() => {
    const kGraphViz = new KineticaGraphVizHelper(id, options);
    kGraphViz
      .connect(server, {
        username,
        password,
      })
      .limit(limit)
      .graph(graph_config);
    if (nodes.length > 0 && edges.length > 0) {
      kGraphViz.raw({
        nodes,
        edges,
      });
    } else if (node_table && edge_table) {
      kGraphViz.nodes(node_table, node_columns).edges(edge_table, edge_columns);
    } else if (data_table) {
      kGraphViz.data(data_table, data_columns, data_group);
    }
    kGraphViz.render();
  }, [
    id,
    server,
    username,
    password,
    options,
    nodes,
    node_table,
    node_columns,
    edges,
    edge_table,
    edge_columns,
    data_table,
    data_columns,
    data_group,
    limit,
    graph_config,
  ]);
  return <div id={id}></div>;
};

export { KineticaGraphViz };
