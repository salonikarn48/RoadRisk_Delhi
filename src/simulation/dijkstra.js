// Finds the shortest path between two nodes while ignoring blocked roads.
// Uses a Min Heap priority queue for performance on OpenStreetMap networks.
class MinHeap {
  constructor() {
    this.heap = [];
  }

  push(item) {
    this.heap.push(item);
    this.bubbleUp();
  }

  pop() {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop();
    const root = this.heap[0];
    const last = this.heap.pop();
    this.heap[0] = last;
    this.bubbleDown();
    return root;
  }

  get size() {
    return this.heap.length;
  }

  bubbleUp() {
    let index = this.heap.length - 1;
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].distance <= this.heap[index].distance) break;
      [this.heap[parentIndex], this.heap[index]] = [
        this.heap[index],
        this.heap[parentIndex],
      ];
      index = parentIndex;
    }
  }

  bubbleDown() {
    let index = 0;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (
        left < this.heap.length &&
        this.heap[left].distance < this.heap[smallest].distance
      ) {
        smallest = left;
      }
      if (
        right < this.heap.length &&
        this.heap[right].distance < this.heap[smallest].distance
      ) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.heap[index], this.heap[smallest]] = [
        this.heap[smallest],
        this.heap[index],
      ];
      index = smallest;
    }
  }
}

export function dijkstra(graph, start, blockedRoads = new Set()) {
  const distances = {};
  const previous = {};
  const nodes = Object.keys(graph.nodes);

  for (const node of nodes) {
    distances[node] = Infinity;
    previous[node] = null;
  }

  distances[start] = 0;
  const queue = new MinHeap();
  queue.push({ node: start, distance: 0 });

  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;
    const currentNode = current.node;
    const currentDistance = current.distance;

    if (currentDistance > distances[currentNode]) continue;

    const neighbors = graph.adjacency[currentNode] || [];
    for (const edge of neighbors) {
      if (blockedRoads.has(String(edge.roadId))) {
        continue;
      }

      const newDistance = currentDistance + edge.distance;
      if (newDistance < distances[edge.node]) {
        distances[edge.node] = newDistance;
        previous[edge.node] = {
          node: currentNode,
          roadId: edge.roadId,
        };
        queue.push({
          node: edge.node,
          distance: newDistance,
        });
      }
    }
  }

  return { distances, previous };
}

export function getPath(previous, start, end) {
  const path = [];
  let current = end;

  while (current !== null) {
    path.unshift(current);
    if (current === start) return path;
    const previousNode = previous[current];
    if (!previousNode) return [];
    current = previousNode.node;
  }

  return [];
}

export function getPathRoads(previous, start, end) {
  const roads = [];
  let current = end;

  while (current !== start) {
    const previousNode = previous[current];
    if (!previousNode) return [];
    roads.unshift(previousNode.roadId);
    current = previousNode.node;
  }

  return roads;
}

/**
 * Finds shortest-time paths using link travel times with optional BPR congestion multipliers.
 */
export function dijkstraTime(
  graph,
  start,
  roadCongestionFactors = null,
  blockedRoads = new Set()
) {
  const times = {};
  const previous = {};
  const nodes = Object.keys(graph.nodes);

  for (const node of nodes) {
    times[node] = Infinity;
    previous[node] = null;
  }

  times[start] = 0;
  const queue = new MinHeap();
  queue.push({ node: start, distance: 0 });

  while (queue.size > 0) {
    const current = queue.pop();
    if (!current) break;
    const currentNode = current.node;
    const currentTime = current.distance;

    if (currentTime > times[currentNode]) continue;

    const neighbors = graph.adjacency[currentNode] || [];
    for (const edge of neighbors) {
      if (blockedRoads.has(String(edge.roadId))) {
        continue;
      }

      const congestionMultiplier = roadCongestionFactors
        ? (roadCongestionFactors[String(edge.roadId)] ?? 1.0)
        : 1.0;
      const edgeTime = (edge.travelTimeMinutes || 0.1) * congestionMultiplier;
      const newTime = currentTime + edgeTime;

      if (newTime < times[edge.node]) {
        times[edge.node] = newTime;
        previous[edge.node] = {
          node: currentNode,
          roadId: edge.roadId,
          travelTime: edgeTime,
        };
        queue.push({
          node: edge.node,
          distance: newTime,
        });
      }
    }
  }

  return { times, distances: times, previous };
}
