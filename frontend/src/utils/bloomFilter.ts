export class BloomFilter {
  private size: number;
  private bitArray: Uint8Array;
  private hashCount: number;

  constructor(expectedItems = 1000, falsePositiveRate = 0.01) {
    // Optimal size m = - (n * ln(p)) / (ln(2)^2)
    this.size = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / (Math.LN2 * Math.LN2));
    // Optimal hash count k = (m / n) * ln(2)
    this.hashCount = Math.round((this.size / expectedItems) * Math.LN2);
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  private hashFNV1a(str: string, seed: number): number {
    let hash = 0x811c9dc5 ^ seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % this.size;
  }

  public add(item: string): void {
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hashFNV1a(item, i * 31);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.bitArray[byteIndex] |= (1 << bitOffset);
    }
  }

  public contains(item: string): boolean {
    for (let i = 0; i < this.hashCount; i++) {
      const bitIndex = this.hashFNV1a(item, i * 31);
      const byteIndex = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.bitArray[byteIndex] & (1 << bitOffset)) === 0) {
        return false; // Definitely not in set
      }
    }
    return true; // Might be in set
  }
}
