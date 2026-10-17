function notFound(req, res, next) {
  const err = new Error('Not found');
  err.status = 404;
  next(err);
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  const isServerError = status >= 500;

  if (process.env.NODE_ENV !== 'test') {
    if (process.env.NODE_ENV === 'production') {
      console.error(`[error] ${status} ${err.message}`);
    } else {
      console.error('[error]', err.stack || err);
    }
  }
  const message = isServerError
    ? 'Server error'
    : err.message || 'Request failed';

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };