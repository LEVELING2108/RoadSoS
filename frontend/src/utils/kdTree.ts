export interface Point2D {
  lat: number;
  lon: number;
  [key: string]: any;
}

export class KDNode {
  point: Point2D;
  left: KDNode | null = null;
  right: KDNode | null = null;
  axis: number; // 0 for lat, 1 for lon

  constructor(point: Point2D, axis: number) {
    this.point = point;
    this.axis = axis;
  }
}

export class KDTree2D {
  root: KDNode | null = null;

  constructor(points: Point2D[] = []) {
    if (points.length > 0) {
      this.root = this.buildTree(points, 0);
    }
  }

  private buildTree(points: Point2D[], depth: number): KDNode | null {
    if (points.length === 0) return null;

    const axis = depth % 2;
    // Sort points along the current axis (0: lat, 1: lon)
    points.sort((a, b) => (axis === 0 ? a.lat - b.lat : a.lon - b.lon));

    const median = Math.floor(points.length / 2);
    const node = new KDNode(points[median], axis);

    node.left = this.buildTree(points.slice(0, median), depth + 1);
    node.right = this.buildTree(points.slice(median + 1), depth + 1);

    return node;
  }

  // Haversine distance helper
  private distance(p1: Point2D, p2: Point2D): number {
    const R = 6371;
    const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
    const dLon = (p2.lon - p1.lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const clampedA = Math.min(1.0, Math.max(0.0, a));
    return R * 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));
  }

  // Find Nearest Neighbor in O(log N) average time
  public findNearest(target: Point2D): { point: Point2D; distance: number } | null {
    if (!this.root) return null;

    let bestNode: KDNode | null = null;
    let bestDist = Infinity;

    const search = (node: KDNode | null) => {
      if (!node) return;

      const dist = this.distance(target, node.point);
      if (dist < bestDist) {
        bestDist = dist;
        bestNode = node;
      }

      const axis = node.axis;
      const targetVal = axis === 0 ? target.lat : target.lon;
      const nodeVal = axis === 0 ? node.point.lat : node.point.lon;

      const nearChild = targetVal < nodeVal ? node.left : node.right;
      const farChild = targetVal < nodeVal ? node.right : node.left;

      search(nearChild);

      // Check if we need to search the other branch (pruning heuristic)
      const diffDegrees = Math.abs(targetVal - nodeVal);
      const diffKm = diffDegrees * 111; // ~111 km per degree latitude
      if (diffKm < bestDist) {
        search(farChild);
      }
    };

    search(this.root);

    return bestNode ? { point: (bestNode as KDNode).point, distance: Math.round(bestDist * 10) / 10 } : null;
  }

  // Range Query: Find all points within radius (km) in O(log N + M) time
  public rangeSearch(target: Point2D, radiusKm: number): Point2D[] {
    const results: Point2D[] = [];
    if (!this.root) return results;

    const search = (node: KDNode | null) => {
      if (!node) return;

      const dist = this.distance(target, node.point);
      if (dist <= radiusKm) {
        results.push(node.point);
      }

      const axis = node.axis;
      const targetVal = axis === 0 ? target.lat : target.lon;
      const nodeVal = axis === 0 ? node.point.lat : node.point.lon;

      const diffDegrees = targetVal - nodeVal;
      const diffKm = Math.abs(diffDegrees) * 111;

      if (diffDegrees < 0) {
        search(node.left);
        if (diffKm <= radiusKm) search(node.right);
      } else {
        search(node.right);
        if (diffKm <= radiusKm) search(node.left);
      }
    };

    search(this.root);
    return results;
  }
}
