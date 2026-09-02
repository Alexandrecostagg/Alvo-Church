/**
 * Rate limiter com contadores em memória.
 *
 * Funciona tanto no Next.js Edge Runtime (Worker) quanto no Node.js, pois
 * usa apenas Map e Date.now(). Cada entrada expira após `windowMs` milissegundos.
 *
 * Uso:
 *   const limiter = new RateLimiter({ max: 5, windowMs: 60_000 });
 *   const ok = limiter.tryGet(key); // true se dentro do limite, false se excedido
 */

interface RateLimiterOptions {
  /** Número máximo de requisições permitidas no janela de tempo. */
  max: number;
  /** Duração da janela em milissegundos. */
  windowMs: number;
}

interface RateLimitState {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private opts: RateLimiterOptions;
  private store = new Map<string, RateLimitState>();

  constructor(opts: RateLimiterOptions) {
    this.opts = { max: opts.max, windowMs: opts.windowMs };
  }

  /**
   * Verifica se a requisição está dentro do limite.
   * Retorna true se permitido, false se excedeu a cota.
   * Limpa entradas expiradas a cada chamada para evitar crescimento infinito.
   */
  tryGet(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.opts.windowMs;

    // Cleanup: remove entradas expiradas a cada ~100 chamadas para evitar
    // overhead constante em mapas grandes.
    if (this.store.size > 100 && Math.random() < 0.01) {
      for (const [k, v] of this.store) {
        if (v.windowStart < windowStart) this.store.delete(k);
      }
    }

    const existing = this.store.get(key);
    if (!existing || existing.windowStart < windowStart) {
      const state: RateLimitState = { count: 1, windowStart: now };
      this.store.set(key, state);
      return true;
    }

    existing.count++;
    return existing.count <= this.opts.max;
  }

  /**
   * Retorna os metadados do rate limit atual para headers (Retry-After, etc.).
   */
  getStatus(key: string): {
    remaining: number;
    resetAt: number;
    limit: number;
  } {
    const now = Date.now();
    const existing = this.store.get(key);
    if (!existing) {
      return {
        remaining: this.opts.max,
        resetAt: now + this.opts.windowMs,
        limit: this.opts.max,
      };
    }
    const remaining = Math.max(0, this.opts.max - existing.count);
    const resetAt = existing.windowStart + this.opts.windowMs;
    return { remaining, resetAt, limit: this.opts.max };
  }
}
