const client = require('prom-client');

const register = new client.Registry();

client.collectDefaultMetrics({ register });

/* ---------------- HTTP LATENCY ---------------- */

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

register.registerMetric(httpRequestDuration);

/* ---------------- HTTP REQUEST COUNT ---------------- */

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpRequestsTotal);

/* ---------------- HTTP ERRORS ---------------- */

const httpErrorsTotal = new client.Counter({
    name: 'http_errors_total',
    help: 'Total number of HTTP errors',
    labelNames: ['method', 'route', 'status'],
});

register.registerMetric(httpErrorsTotal);

/* ---------------- ACTIVE REQUESTS ---------------- */

const httpActiveRequests = new client.Gauge({
    name: 'http_active_requests',
    help: 'Number of active HTTP requests',
});

register.registerMetric(httpActiveRequests);

/* ---------------- RESPONSE SIZE ---------------- */

const httpResponseSize = new client.Histogram({
    name: 'http_response_size_bytes',
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status'],
    buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
});

register.registerMetric(httpResponseSize);

/* ---------------- REQUEST SIZE ---------------- */

const httpRequestSize = new client.Histogram({
    name: 'http_request_size_bytes',
    help: 'Size of HTTP request body',
    labelNames: ['method', 'route'],
    buckets: [100, 500, 1000, 5000, 10000, 50000],
});

register.registerMetric(httpRequestSize);

/* ---------------- MIDDLEWARE ---------------- */

function metricsMiddleware(req, res, next) {
    const end = httpRequestDuration.startTimer();

    httpActiveRequests.inc();

    const requestSize = req.headers['content-length'];
    if (requestSize) {
        httpRequestSize.observe(
            {
                method: req.method,
                route: req.path,
            },
            Number(requestSize)
        );
    }

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

        const responseSize = res.getHeader('content-length');
        if (responseSize) {
            httpResponseSize.observe(labels, Number(responseSize));
        }

        httpActiveRequests.dec();
    });

    next();
}

module.exports = {
    client,
    register,
    metricsMiddleware,
};