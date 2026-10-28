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

### Re-rendering

Some props are compared by identity, so pass a stable value (defined outside
your component, or wrapped in `useMemo`/`useCallback`) to avoid extra work on
every parent render:

- `options`: a new object re-creates the graph.
- `nodes` / `edges`: new arrays redraw the graph and restart the layout.

Column lists (`node_columns`, `edge_columns`, `data_columns`) are compared by
value, so passing them inline is fine.

`graph_config` is applied once, when the graph is created, so it can be passed
inline and may add to the graph (for example a bloom pass) without that
repeating. A changed `graph_config` takes effect the next time the graph is
created, e.g. when `options` or the connection props change, or when you give
the component a new `key`.

### Fitting the view to new data

The camera keeps its position when the data changes, so a view the user has
rotated or zoomed is not reset. To re-fit the view whenever the layout settles,
add this to `graph_config`:

```javascript
const graphConfig = (graph) => {
  graph.onEngineStop(() => graph.zoomToFit(400));
};
```

The layout settles after up to 15 seconds by default; lower it with
`graph.cooldownTime(ms)` to re-fit sooner.

### Server-side rendering

The component renders an empty container on the server and loads the graph
library in the browser, so it can be used with server-rendered frameworks such
as Next.js.

## Development

Requires Node 22.23.4 (see `.nvmrc`).

```
npm install
npm test                          # unit tests (Vitest)
npx playwright install chromium   # once, for the browser tests
npm run test:e2e                  # builds dist/ and runs Playwright smoke tests
```

### Testing against a real Kinetica server

`npm run test:live` renders the built component against a live server. It is
skipped unless `KINETICA_URL` is set, and reads everything else from the
environment too, so no credentials are written to disk:

```
KINETICA_URL=http://host:9191 KINETICA_USER=user KINETICA_PASS=pass \
KINETICA_DATA_TABLE=graph.multi_out_table \
KINETICA_DATA_COLUMNS=EDGE_NODE1_ID,EDGE_NODE2_ID \
npm run test:live
```

For node/edge tables, set `KINETICA_NODE_TABLE`, `KINETICA_NODE_COLUMNS`,
`KINETICA_EDGE_TABLE` and `KINETICA_EDGE_COLUMNS` instead (or as well). Add a
third column to an edge or data table to check edge labels. `KINETICA_LIMIT`
sets the rows requested (default 100), and `KINETICA_INSECURE_TLS=1` accepts a
self-signed certificate. Requests go through a local proxy, so the server's
CORS settings are not tested.
