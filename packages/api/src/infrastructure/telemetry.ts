import { metrics } from '@opentelemetry/api';
import type { Meter } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

const prometheusExporter = new PrometheusExporter({
  port: 9464,
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  metricReader: prometheusExporter,
  instrumentations: [
  getNodeAutoInstrumentations(),
],
});

sdk.start();

const meter = metrics.getMeter('alentapp-api');

export function createREDMetrics(meter: Meter) {
  const requestCounter = meter.createCounter('http.requests.total', {
    description: 'Total de requests HTTP',
  });

  const errorCounter = meter.createCounter('http.requests.errors', {
    description: 'Total de errores HTTP',
  });

  const requestDuration = meter.createHistogram('http.request.duration', {
    description: 'Duracion de requests HTTP',
    unit: 'ms',
  });

  const activeRequests = meter.createUpDownCounter('http.requests.active', {
    description: 'Requests HTTP concurrentes',
  });

  const memoryUsage = meter.createObservableGauge('process.memory.usage', {
    description: 'Memoria usada por el proceso Node.js',
    unit: 'By',
  });

  memoryUsage.addCallback((result) => {
    result.observe(process.memoryUsage().rss);
  });

  return {
    requestCounter,
    errorCounter,
    requestDuration,
    activeRequests,
  };
}

export { sdk, meter, prometheusExporter };