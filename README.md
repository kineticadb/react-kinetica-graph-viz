<h2>Kinetica Graph Visualization React Component Library</h2>
React component to visualize graph data fom a Kinetica database

## Installation

```
npm install --save @kinetica/react-kinetica-graph-viz
```

## Usage

```javascript
import { KineticaGraphViz } from "@kinetica/react-kinetica-graph-viz";
import "./App.css";

function App() {
  return (
    <KineticaGraphViz
      id="my_graph"
      server="http://127.0.0.1:9191"
      username="admin"
      password="password"
      node_table="graph.social_ids_nodes"
      node_columns={["id", "name"]}
      edge_table="graph.social_ids_edges"
      edge_columns={["node1", "node2"]}
      limit={800}
      graph_config={(graph) => {
        graph
          .cooldownTicks(50)
          .backgroundColor("#00000000")
          .nodeVal(() => Math.random() * 15)
          .nodeLabel((node) => `Node ${node.id}`)
          .nodeColor(() => (Math.random() > 0.5 ? "#4c00b0" : "#FF00FF"))
          .linkColor(() => (Math.random() > 0.5 ? "#4c00b0" : "#FF00FF"))
          .linkWidth(2);
      }}
    />
  );
}

export default App;
```

```javascript
import { KineticaGraphViz } from "@kinetica/react-kinetica-graph-viz";
import "./App.css";

function App() {
  return (
    <KineticaGraphViz
      id="my_graph"
      server="http://127.0.0.1:9191"
      username="admin"
      password="password"
      data_table="graph.multi_out_table"
      data_columns={["EDGE_NODE1_ID", "EDGE_NODE2_ID"]}
      limit={800}
      graph_config={(graph) => {
        graph
          .cooldownTicks(50)
          .backgroundColor("#00000000")
          .nodeVal(() => Math.random() * 15)
          .nodeLabel((node) => `Node ${node.id}`)
          .nodeColor(() => (Math.random() > 0.5 ? "#4c00b0" : "#FF00FF"))
          .linkColor(() => (Math.random() > 0.5 ? "#4c00b0" : "#FF00FF"))
          .linkWidth(2);
      }}
    />
  );
}

export default App;
```
