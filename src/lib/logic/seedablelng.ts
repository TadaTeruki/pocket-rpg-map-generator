export class SeedableRng {
    state: number;
  
    constructor(seed: number) {
        if (seed === 0) {
            seed = 1;
        }
        this.state = seed;
    }
  
    next(): number {
        this.state ^= this.state << 13;
        this.state ^= this.state >>> 17;
        this.state ^= this.state << 5;
        return (this.state >>> 0) / 4294967296;
    }

    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min)) + min;
    }
}