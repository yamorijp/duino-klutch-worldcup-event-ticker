const cron = require('cron')
const ticker = require('./ticker')

const job = new cron.CronJob({
  cronTime: '0,30 * * * * *',
  start: false,
  timeZone: 'Asia/Tokyo',
  context: ticker,
  onTick: ticker.onTick
})

ticker.update().then(() => job.start())
