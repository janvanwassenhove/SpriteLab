declare module "gif.js" {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: number | null;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(image: CanvasRenderingContext2D | HTMLCanvasElement | ImageData, options?: AddFrameOptions): void;
    on(event: "finished", callback: (blob: Blob) => void): void;
    on(event: "error", callback: (error: Error) => void): void;
    render(): void;
  }

  export default GIF;
}
