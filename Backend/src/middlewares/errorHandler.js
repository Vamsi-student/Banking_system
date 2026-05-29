export function notFoundHandler(req, res) {
    res.status(404).json({
        error: {
            message: `Route ${req.method} ${req.originalUrl} not found`
        }
    })
}

export function globalErrorHandler(err, req, res, next) {
    const statusCode = err.statusCode || err.status || 500
    const message = err.isOperational ? err.message : "Internal server error"

    console.error(`[${new Date().toISOString()}] ${statusCode} - ${err.message}`)
    if (statusCode === 500) {
        console.error(err.stack)
    }

    res.status(statusCode).json({
        error: {
            message: process.env.NODE_ENV === "production" ? message : err.message,
            ...(process.env.NODE_ENV !== "production" && err.stack && { stack: err.stack })
        }
    })
}
