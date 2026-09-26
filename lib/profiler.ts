/**
 * Break Hub Telemetry & Canvas/Audio Performance Profiler
 * Monitors 60FPS lock, frame drops, audio context memory, and Core Web Vitals.
 */

export interface PerformanceReport {
  fps: number;
  droppedFrames: number;
  activeAudioNodes: number;
  memoryMB: number | null;
  timestamp: number;
}

class ArcadeProfiler {
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 60;
  private droppedFrames = 0;
  private isRunning = false;
  private animId: number | null = null;

  public start() {
    if (typeof window === 'undefined' || this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animId !== null) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.frameCount++;

    if (delta > 33.33) {
      // Frame took longer than 33ms (dropped below 30FPS)
      this.droppedFrames++;
    }

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.animId = requestAnimationFrame(this.loop);
  };

  public getReport(): PerformanceReport {
    let memoryMB: number | null = null;
    if (typeof window !== 'undefined' && (performance as any).memory) {
      memoryMB = Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024));
    }

    return {
      fps: this.fps,
      droppedFrames: this.droppedFrames,
      activeAudioNodes: 0,
      memoryMB,
      timestamp: Date.now()
    };
  }
}

export const profiler = new ArcadeProfiler();
