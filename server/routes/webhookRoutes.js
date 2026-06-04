const express = require('express');
const router = express.Router();

router.post('/chapa', (req, res) => {
  const signature = req.headers['x-chapa-signature'];

  if (signature !== process.env.CHAPA_WEBHOOK_SECRET) {
    return res.status(401).send('Invalid signature');
  }

  console.log('Chapa Webhook:', req.body);

  // TODO: update order payment status here if needed

  res.sendStatus(200);
});

module.exports = router;

// hi to udate