const https = require('https');
const express = require('express');
const axios = require('axios');
const app = express();
const khmer = require('./khmer.js');
const slack = require('./slack.js');
const twitter = require('./twitter.js');
let done = false;
let lastUpdate;

async function repeating(interval) {
  setTimeout(() => {
    return new Promise((resolve, reject) => {
      console.log('call itself to keep active');
      const url = 'https://mpyk-covid-slack-alert.herokuapp.com/'
      https.get(url, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });
        resp.on('end', () => {
          return resolve(true);
        });
      }).on('error', (err) => {
        console.log(err);
        return reject(false);
      });
    }); 
  }, interval)
}

async function getData(url) {
  try {    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

function format(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function main() {

  try {
    
    // Interval
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    let interval = 15 * 60 * 1000;
    let result = '';
    let url;
    let data;

    if (done && lastUpdate && (
      lastUpdate.getFullYear() == year &&
      lastUpdate.getMonth() + 1 == month &&
      lastUpdate.getDate() == day
    )) {
      console.log('already update', lastUpdate);
    } else {
      done = false;
    }

    // Get Summary Data
    url = 'https://raw.githubusercontent.com/kaz-ogiwara/covid19/master/data/summary.csv';
    data = await getData(url);
    data = data.split("\n");
    // Year, month, day, PCR test positive number, number of PCR test performed, symptomatic person, asymptomatic person, 
    // confirming the presence or absence of symptoms, discharged, hospitalized in a ventilator or intensive care unit, 
    // dead, Dead (prefecture based), URL

    // 年,月,日,PCR検査陽性者,PCR検査実施人数,有症状者,無症状者,
    // 症状有無確認中,退院した者,人工呼吸器又は集中治療室に入院している者,
    // 死亡者,死亡者（都道府県の公表ベース）, URL
    const YEAR = 0;
    const MONTH = 1;
    const DAY = 2;
    const CASES = 3;
    const CONDUCT_TEST = 4;
    const SYMPTOMATIC = 5;
    const ASYMPTOMATIC = 6;
    const CHECKING = 7;
    const RECOVERED = 8;
    const SERIOUS_CASES = 9;
    const DEATH = 10;
    const DEATH_BASED_ON_PREFECTURE_DATA = 11;
    let record = data[data.length-1];
    let previous = data[data.length-2];
    record = record.split(",");
    previous = previous.split(",");
    const separator = '==============================';
    let tweetMsg = '';
    result += 
`

Japan:
${separator}
Conducting Test: ${format(record[CONDUCT_TEST])} (+${format(record[CONDUCT_TEST]-previous[CONDUCT_TEST])})
Cases: ${format(record[CASES])} (+${format(record[CASES]-previous[CASES])})
- Symptomatic: ${format(record[SYMPTOMATIC])} (+${format(record[SYMPTOMATIC]-previous[SYMPTOMATIC])})
  -- Serious Cases: ${format(record[SERIOUS_CASES])} (+${format(record[SERIOUS_CASES]-previous[SERIOUS_CASES])})
- Checking for Symptom: ${format(record[CHECKING])} (+${format(record[CHECKING]-previous[CHECKING])})
- Asymptomatic: ${format(record[ASYMPTOMATIC])} (+${format(record[ASYMPTOMATIC]-previous[ASYMPTOMATIC])})
Recovered: ${format(record[RECOVERED])} (+${format(record[RECOVERED]-previous[RECOVERED])})
Death: ${format(record[DEATH_BASED_ON_PREFECTURE_DATA])} (+${format(record[DEATH_BASED_ON_PREFECTURE_DATA]-previous[DEATH_BASED_ON_PREFECTURE_DATA])})
`;

    tweetMsg = result;
    // Get Top N
    url = 'https://raw.githubusercontent.com/kaz-ogiwara/covid19/master/data/data.json';
    data = await getData(url);
    let prefectures = data['prefectures-map'];
    prefectures.sort(function(a, b) {
      return b.value - a.value;
    });
    const TOP_N = 5;
    prefectures = prefectures.slice(0,TOP_N);
    result += `\nTOP ${TOP_N} \n`;
    result += `${separator} \n`;
    prefectures.forEach(prefecture => {
      result += `${prefecture.en}: ${format(prefecture.value)} \n`;
    });

    // Is the latest data is today
    if (!done && (year == record[YEAR] && month == record[MONTH] && day == record[DAY]) ) {
      console.log('send to slack');
      slack.send(result);
      console.log('tweet');
      await twitter.tweet(tweetMsg);
      lastUpdate = d;
      done = true;
    } else {
      console.log('>>>');
    }

    repeating(interval);

    return result;

  } catch (error) {
    
    console.log(error);
    slack.send('Something Error. Check Heroku Log');
    repeating(interval);

  }

}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
});

app.get('/', async (req, res) => {
  data = await main();
  res.send(data);
});

repeating(0);
// main();

// Fetch khmer data
khmer.fetch();
setInterval(async () => {
  await khmer.fetch();
}, 10 * 60 * 1000);

/*

[ { code: 1, ja: '北海道', en: 'Hokkaido', value: 302 },
  { code: 2, ja: '青森県', en: 'Aomori', value: 22 },
  { code: 3, ja: '岩手県', en: 'Iwate', value: 0 },
  { code: 4, ja: '宮城県', en: 'Miyagi', value: 65 },
  { code: 5, ja: '秋田県', en: 'Akita', value: 16 },
  { code: 6, ja: '山形県', en: 'Yamagata', value: 45 },
  { code: 7, ja: '福島県', en: 'Fukushima', value: 40 },
  { code: 8, ja: '茨城県', en: 'Ibaraki', value: 119 },
  { code: 9, ja: '栃木県', en: 'Tochigi', value: 39 },
  { code: 10, ja: '群馬県', en: 'Gunma', value: 107 },
  { code: 11, ja: '埼玉県', en: 'Saitama', value: 479 },
  { code: 12, ja: '千葉県', en: 'Chiba', value: 525 },
  { code: 13, ja: '東京都', en: 'Tokyo', value: 2457 },
  { code: 14, ja: '神奈川県', en: 'Kanagawa', value: 614 },
  { code: 15, ja: '新潟県', en: 'Niigata', value: 46 },
  { code: 16, ja: '富山県', en: 'Toyama', value: 54 },
  { code: 17, ja: '石川県', en: 'Ishikawa', value: 140 },
  { code: 18, ja: '福井県', en: 'Fukui', value: 100 },
  { code: 19, ja: '山梨県', en: 'Yamanashi', value: 39 },
  { code: 20, ja: '長野県', en: 'Nagano', value: 36 },
  { code: 21, ja: '岐阜県', en: 'Gifu', value: 128 },
  { code: 22, ja: '静岡県', en: 'Shizuoka', value: 47 },
  { code: 23, ja: '愛知県', en: 'Aichi', value: 350 },
  { code: 24, ja: '三重県', en: 'Mie', value: 20 },
  { code: 25, ja: '滋賀県', en: 'Shiga', value: 52 },
  { code: 26, ja: '京都府', en: 'Kyoto', value: 215 },
  { code: 27, ja: '大阪府', en: 'Osaka', value: 969 },
  { code: 28, ja: '兵庫県', en: 'Hyogo', value: 423 },
  { code: 29, ja: '奈良県', en: 'Nara', value: 53 },
  { code: 30, ja: '和歌山県', en: 'Wakayama', value: 37 },
  { code: 31, ja: '鳥取県', en: 'Tottori', value: 1 },
  { code: 32, ja: '島根県', en: 'Shimane', value: 13 },
  { code: 33, ja: '岡山県', en: 'Okayama', value: 16 },
  { code: 34, ja: '広島県', en: 'Hiroshima', value: 67 },
  { code: 35, ja: '山口県', en: 'Yamaguchi', value: 28 },
  { code: 36, ja: '徳島県', en: 'Tokushima', value: 3 },
  { code: 37, ja: '香川県', en: 'Kagawa', value: 20 },
  { code: 38, ja: '愛媛県', en: 'Ehime', value: 40 },
  { code: 39, ja: '高知県', en: 'Kochi', value: 62 },
  { code: 40, ja: '福岡県', en: 'Fukuoka', value: 433 },
  { code: 41, ja: '佐賀県', en: 'Saga', value: 17 },
  { code: 42, ja: '長崎県', en: 'Nagasaki', value: 15 },
  { code: 43, ja: '熊本県', en: 'Kumamoto', value: 31 },
  { code: 44, ja: '大分県', en: 'Oita', value: 50 },
  { code: 45, ja: '宮崎県', en: 'Miyazaki', value: 17 },
  { code: 46, ja: '鹿児島県', en: 'Kagoshima', value: 4 },
  { code: 47, ja: '沖縄県', en: 'Okinawa', value: 86 } ]

*/