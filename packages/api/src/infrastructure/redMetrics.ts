import type { FastifyRequest } from 'fastify';
import { createREDMetrics, meter } from './telemetry.js';

const {
  requestCounter,
  errorCounter,
  requestDuration,
  activeRequests,
} = createREDMetrics(meter);

type RequestWithMetrics = FastifyRequest & {
  redMetricStart?: bigint;
  redMetricPath?: string;
};

function getRoute(request: FastifyRequest): string {
  return request.routeOptions?.url || request.url.split('?')[0];
}

export function startREDMetric(request: FastifyRequest) {
  const req = request as RequestWithMetrics;

  req.redMetricStart = process.hrtime.bigint();
  req.redMetricPath = getRoute(request);

  activeRequests.add(1, {
    method: request.method,
    route: req.redMetricPath,
  });
}

export function finishREDMetric(request: FastifyRequest, statusCode: number) {
  const req = request as RequestWithMetrics;

  const start = req.redMetricStart ?? process.hrtime.bigint();
  const route = req.redMetricPath ?? getRoute(request);
  const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;

  const labels = {
    method: request.method,
    route,
    status: String(statusCode),
  };

  requestCounter.add(1, labels);

  if (statusCode >= 400) {
    errorCounter.add(1, labels);
  }

  requestDuration.record(durationMs, {
    method: request.method,
    route,
  });

  activeRequests.add(-1, {
    method: request.method,
    route,
  });
}