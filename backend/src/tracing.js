'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'idurar-erp-crm';
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||  'http://localhost:4318/v1/traces';

const sdk = new NodeSDK({
  serviceName: SERVICE_NAME,
  traceExporter: new OTLPTraceExporter({ url: OTLP_ENDPOINT, timeoutMillis: 5000 }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': { enabled: true },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-mongodb': { enabled: true },
      '@opentelemetry/instrumentation-mongoose': { enabled: true },
      '@opentelemetry/instrumentation-fs': { enabled: false }, // too noisy
    }),
  ],
});

try {
  sdk.start();
  console.log(
    `[tracing] OpenTelemetry started — service="${SERVICE_NAME}" endpoint="${OTLP_ENDPOINT}"`
  );
} catch (err) {
  console.error('[tracing] Failed to start OpenTelemetry SDK:', err);
}

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('[tracing] SDK shut down'))
    .catch((err) => console.error('[tracing] Shutdown error:', err))
    .finally(() => process.exit(0));
});
