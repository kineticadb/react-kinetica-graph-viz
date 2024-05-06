/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import KineticaGraphVizHelper from "@kinetica/kinetica-graph-viz";

const KineticaGraphViz = ({
  id = "kinetica_graph_viz",
  server = "http://127.0.0.1:9191",
  username = "",
  password = "",
  options = {},
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
  graph_config = () => {},
}) => {
  const [kGraphViz, setKGraphViz] = useState(null);

  useEffect(
    (_) => {
      const viz = new KineticaGraphVizHelper(id, options);
      viz
        .connect(server, {
          username,
          password,
        })
        .limit(limit)
        .curvature(curvature)
        .graph(graph_config);
      setKGraphViz(viz);
    },
    [id, server, username, password, options, limit, curvature]
  );

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
      kGraphViz.render();
    }
  }, [
    kGraphViz,
    nodes,
    node_table,
    node_columns,
    edges,
    edge_table,
    edge_columns,
    data_table,
    data_columns,
    graph_config,
  ]);

  return <div id={id}></div>;
};

export { KineticaGraphViz };
