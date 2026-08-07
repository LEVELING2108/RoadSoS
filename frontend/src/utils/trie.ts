export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEndOfWord: boolean = false;
  metadata: any[] = [];
}

export class PrefixTrie {
  root: TrieNode = new TrieNode();

  public insert(word: string, data?: any): void {
    if (!word) return;
    let current = this.root;
    const normalized = word.toLowerCase().trim();

    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }
      current = current.children.get(char)!;
    }

    current.isEndOfWord = true;
    if (data !== undefined) {
      current.metadata.push(data);
    }
  }

  // O(L) prefix search
  public searchPrefix(prefix: string): any[] {
    if (!prefix) return [];
    let current = this.root;
    const normalized = prefix.toLowerCase().trim();

    for (const char of normalized) {
      if (!current.children.has(char)) {
        return []; // Prefix not found
      }
      current = current.children.get(char)!;
    }

    // Collect all words starting with this prefix
    const results: any[] = [];
    this.collectAll(current, results);
    return results;
  }

  private collectAll(node: TrieNode, results: any[]): void {
    if (node.isEndOfWord) {
      results.push(...node.metadata);
    }

    for (const childNode of node.children.values()) {
      this.collectAll(childNode, results);
    }
  }
}
