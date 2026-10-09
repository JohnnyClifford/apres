function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  if (process.env.NODE_ENV !== 'test') {
    console.error('[error]', err.message);
  }
  res.status(status).json({ error: err.message || 'Server error' });
}

module.exports = { notFound, errorHandler };