const https = require('https');

async function sendToSlack(message) {
  const data = JSON.stringify({
    text: message
  })
  const API = process.env.SLACK_URL;
  const options = {
    hostname: 'hooks.slack.com',
    port: 443,
    path: `/services/${API}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    }
  }

  return new Promise((resolve, reject) => {    
    const req = https.request(options, (res) => {
      res.on('data', (d) => {
        // DO NOTHING
      })
    })
    req.on('error', (error) => {
      return reject(error);
    })
    req.write(data, (err) => {
      if (err) return reject(err);
    })
    req.end(() => {
      return resolve(true);
    })
  });

}

module.exports = {
  send: sendToSlack,
}