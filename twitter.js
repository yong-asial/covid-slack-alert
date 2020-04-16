const Twitter = require('twitter');
const config = require('./twitter-config.js');

const twitter = new Twitter(config);
console.log(config);

async function tweet(msg) {
  return new Promise((resolve, reject) => {
    twitter.post('statuses/update', {status: msg})
      .then(function (tweet) {
        console.log('tweet success');
        resolve(tweet);
    })
      .catch(function (error) {
        if (error && error.code == 187) {
          console.log('same content');
        } else {
          console.log('tweet fail');
          console.log(error);
        }
    })
  }); 
}

module.exports = {
  tweet: tweet
}