# Graph Visualizer

An interactive, web-based tool designed for the visualization and manipulation of mathematical graphs. It employs a physics-based simulation to provide dynamic layouts, allowing users to intuitively explore graph structures through an edge list input.

Hosted at: https://elgv.netlify.app

## Features

*   **Interactive Physics Simulation**: Nodes respond to spring and repulsion forces, creating organic and readable layouts automatically.
*   **Edge List Support**: Quickly define complex graphs by entering a list of node pairs.
*   **Directed and Weighted Edges**: Support for directed graphs with arrows and weighted edges with numeric labels.
*   **Real-time Interaction**: Drag individual nodes to rearrange the layout or pan the entire view to navigate large graphs.
*   **Dynamic Customization**: Adjust visualization parameters on the fly, including node sizing, margins, and edge lengths.
*   **SVG Rendering**: High-quality, scalable graphics that remain sharp at any zoom level.

## Configuration

The tool provides several parameters to fine-tune the visualization:

*   **Node Size**: Adjust the radius of the graph nodes.
*   **Node Margin**: Set the minimum spacing between nodes to prevent overlapping.
*   **Edge Length**: Control the target distance for the spring-based connections between nodes.
*   **Directed Edges**: Toggle arrowheads to indicate the direction of flow.
*   **Weighted Edges**: Enable numeric displays on edges to represent weights or costs.
*   **Simulation Speed**: Scale the speed of the layout engine to control how quickly the graph settles.
*   **Manual Mode**: Disable the physics engine to allow for static positioning and manual node placement.

## Usage

To generate a graph, enter node pairs into the edge list editor. Weights are optional and will only be displayed if the "Weighted Edges" option is enabled.

- For unweighted graphs, enter node pairs separated by a space:
```
1 2
2 3
3 1
```

- For weighted graphs, enter node pairs followed by a weight:
```
1 2 5
2 3 10
3 1 2.5
```

Use the "Update" button to apply changes to the current graph or "Refresh" to restart the simulation.

## Screenshot

<img src="screenshot.png" alt="Graph Visualizer Screenshot" />
