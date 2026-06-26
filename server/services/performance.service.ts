import os from 'os';

// Simple in-memory metrics store for tracking performance items
interface PerformanceMetrics {
  failedRequestsCount: number;
  totalRequestsCount: number;
  responseTimes: number[];
  slowQueriesCount: number;
  javascriptErrors: string[];
}

const metrics: PerformanceMetrics = {
  failedRequestsCount: 0,
  totalRequestsCount: 0,
  responseTimes: [],
  slowQueriesCount: 0,
  javascriptErrors: [],
};

/**
 * Tracks a completed request
 */
export function recordRequestMetrics(responseTimeMs: number, statusCode: number) {
  metrics.totalRequestsCount += 1;
  metrics.responseTimes.push(responseTimeMs);
  
  // Cap the size of the rolling response times array to prevent memory leaks
  if (metrics.responseTimes.length > 1000) {
    metrics.responseTimes.shift();
  }

  if (statusCode >= 400) {
    metrics.failedRequestsCount += 1;
  }
}

/**
 * Record database slow query occurrences
 */
export function recordSlowQuery() {
  metrics.slowQueriesCount += 1;
}

/**
 * Log runtime errors
 */
export function recordJavascriptError(errorMsg: string) {
  metrics.javascriptErrors.push(`${new Date().toISOString()}: ${errorMsg}`);
  if (metrics.javascriptErrors.length > 100) {
    metrics.javascriptErrors.shift();
  }
}

/**
 * Compiles and returns current performance stats
 */
export function getPerformanceHealthStats() {
  const memUsage = process.memoryUsage();
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  
  // Calculate average response time
  const avgResponseTime = metrics.responseTimes.length > 0
    ? metrics.responseTimes.reduce((sum, t) => sum + t, 0) / metrics.responseTimes.length
    : 0;

  return {
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    memory: {
      rss: memUsage.rss,
      heapTotal: memUsage.heapTotal,
      heapUsed: memUsage.heapUsed,
      external: memUsage.external,
      systemFreeBytes: freeMem,
      systemTotalBytes: totalMem,
    },
    cpu: {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      loadAvg: os.loadavg(),
    },
    api: {
      totalRequests: metrics.totalRequestsCount,
      failedRequests: metrics.failedRequestsCount,
      failureRatePercentage: metrics.totalRequestsCount > 0
        ? (metrics.failedRequestsCount / metrics.totalRequestsCount) * 100
        : 0,
      averageResponseTimeMs: avgResponseTime,
      slowQueriesCount: metrics.slowQueriesCount,
      javascriptErrorsCount: metrics.javascriptErrors.length,
      recentErrors: metrics.javascriptErrors,
    }
  };
}
