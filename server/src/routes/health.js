const router = require('express').Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'apres-api',
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;