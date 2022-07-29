/**
 * A Directional Weighted Graph implementation in TypeScript
 * @author Elias Rilegård
 */
export default class DWG<Vertex, Weight> {
  private readonly adjList: Map<Vertex, Map<Vertex, Weight>>;

  constructor() {
    this.adjList = new Map();
  }

  /**
   * Adds a vertex to the graph
   * @param v The vertex to be added
   * @returns The total number of vertices of the graph
   */
  addVertex(v: Vertex): number {
    this.adjList.set(v, new Map());
    return this.adjList.size;
  }

  /**
   * Adds a directed edge to the graph
   * @param v1 The edge of origin
   * @param v2 The destination edge
   * @param w The weight attached
   */
  addEdge(v1: Vertex, v2: Vertex, w: Weight): void {
    if (!this.adjList.has(v1) || !this.adjList.has(v2)) return;
    this.adjList.get(v1).set(v2, w); // Non-null assertion
  }

  /**
   * Finds all vertices according to a filter function
   * @param filterFn The function to determine if a vertex is filtered out or not
   * @returns An array of all vertices that passed the filter function
   */
  find(filterFn: (v: Vertex) => boolean): Array<Vertex> {
    const result: Array<Vertex> = [];
    for (const vertex of this.adjList.keys()) {
      if (filterFn(vertex)) result.push(vertex);
    }
    return result;
  }

  /**
   * Gets all outgoing edges from a given vertex
   * @param v The vertex for which to search from
   * @returns An array of vertex-weight pairs
   */
  getEdges(v: Vertex): Array<[Vertex, Weight]> {
    const result: Array<[Vertex, Weight]> = [];
    const edges = this.adjList.get(v);
    for (const edge of edges.entries()) result.push(edge);
    return result;
  }

  /**
   * Gets the weight of an edge between two vertices.
   * Note that input order matters for which edge is returned!
   * @param v1 The first vertex
   * @param v2 The second vertex
   * @returns The weight of the edge between the vertices
   */
  getWeight(v1: Vertex, v2: Vertex): Weight {
    return this.adjList.get(v1).get(v2); // Error checking here?
  }

  /**
   * Returns whether the graph contains a given vertex or not.
   * @param v The vertex to check
   * @returns `true` if the vertex is in the graph, `false` if not
   */
  has(v: Vertex): boolean {
    return this.adjList.has(v);
  }

  /**
   * Gets an array representation of all vertices
   * @returns An array of all vertices
   */
  getAllVertices(): Array<Vertex> {
    return [...this.adjList.keys()];
  }
}