export interface HeapItem<T> {
  priority: number; // e.g. distance or composite score
  data: T;
}

export class PriorityQueue<T> {
  private heap: HeapItem<T>[] = [];
  private isMaxHeap: boolean;

  constructor(isMaxHeap = false) {
    this.isMaxHeap = isMaxHeap;
  }

  public size(): number {
    return this.heap.length;
  }

  public peek(): HeapItem<T> | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  private compare(a: number, b: number): boolean {
    return this.isMaxHeap ? a > b : a < b;
  }

  public push(priority: number, data: T): void {
    this.heap.push({ priority, data });
    this.bubbleUp(this.heap.length - 1);
  }

  public pop(): HeapItem<T> | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const bottom = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  public replaceTop(priority: number, data: T): void {
    if (this.heap.length === 0) {
      this.push(priority, data);
      return;
    }
    this.heap[0] = { priority, data };
    this.sinkDown(0);
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index].priority, this.heap[parentIndex].priority)) {
        [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftIndex = 2 * index + 1;
      const rightIndex = 2 * index + 2;
      let swapIndex = index;

      if (leftIndex < length && this.compare(this.heap[leftIndex].priority, this.heap[swapIndex].priority)) {
        swapIndex = leftIndex;
      }
      if (rightIndex < length && this.compare(this.heap[rightIndex].priority, this.heap[swapIndex].priority)) {
        swapIndex = rightIndex;
      }

      if (swapIndex !== index) {
        [this.heap[index], this.heap[swapIndex]] = [this.heap[swapIndex], this.heap[index]];
        index = swapIndex;
      } else {
        break;
      }
    }
  }

  public toArraySorted(): T[] {
    const sorted = [...this.heap].sort((a, b) => (this.isMaxHeap ? b.priority - a.priority : a.priority - b.priority));
    return sorted.map(item => item.data);
  }
}

/**
 * Top-K selection algorithm running in O(N log K) time
 */
export function getTopKItems<T>(items: T[], k: number, priorityFn: (item: T) => number): T[] {
  if (items.length <= k) {
    return [...items].sort((a, b) => priorityFn(a) - priorityFn(b));
  }

  // Use a Max-Heap of size K to retain the smallest K elements
  const heap = new PriorityQueue<T>(true);

  for (const item of items) {
    const priority = priorityFn(item);
    if (heap.size() < k) {
      heap.push(priority, item);
    } else {
      const top = heap.peek();
      if (top && priority < top.priority) {
        heap.replaceTop(priority, item);
      }
    }
  }

  return heap.toArraySorted();
}
