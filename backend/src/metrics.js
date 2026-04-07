const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestDuration);

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestsTotal);

const httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpErrorsTotal);

const httpResponseSize = new client.Histogram({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status'],
    buckets: [100, 500, 1000, 5000, 10000, 50000],
});

register.registerMetric(httpResponseSize);

const httpActiveRequests = new client.Gauge({
    name: 'http_active_requests',
    help: 'Number of active HTTP requests',
});

register.registerMetric(httpActiveRequests);

function metricsMiddleware(req, res, next) {
    const end = httpRequestDuration.startTimer();

    httpActiveRequests.inc();

    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode,
        };

        end(labels);
        httpRequestsTotal.inc(labels);

        if (res.statusCode >= 400) {
            httpErrorsTotal.inc(labels);
        }

        httpActiveRequests.dec();
    });

    next();
}

module.exports = { register, metricsMiddleware };
