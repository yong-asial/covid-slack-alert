const axios = require('axios');
const jsdom = require("jsdom");
const slack = require('./slack.js');

const { JSDOM } = jsdom;

let globalTotalCases = null;

const provinceIds = {
  SIHANOUK: '18',
  PHNOMPENH: '12',
  KOMPONGCHAM: '03',
  BATTAMBONG: '02',
  SIEMREAP: '17',
  KEP: '23',
  TBOUNGKHMOUNG: '25',
  BANTEAYMEANCHEY: '01',
  KOMPONGCHNANG: '04',
  KANDAL: '08',
  KOHKONG: '09',
  KOMPOT: '07',
  PREAHVIHEA: '13',
};
const provinceNames = {
  SIHANOUK: "ព្រះសីហនុ",
  PHNOMPENH: "ភ្នំពេញ",
  KOMPONGCHAM: "កំពង់ចាម",
  BATTAMBONG: "បាត់ដំបង",
  SIEMREAP: "សៀមរាប",
  KEP: "កែប",
  TBOUNGKHMOUNG: "ត្បូងឃ្មុំ",
  BANTEAYMEANCHEY: "បន្ទាយមានជ័យ",
  KOMPONGCHNANG: "កំពង់ឆ្នាំង",
  KANDAL: "កណ្ដាល",
  KOHKONG: "កោះកុង",
  KOMPOT: "កំពត",
  PREAHVIHEA: "ព្រះវិហារ",
};

function format(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function getData(url) {
  try {    
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(error);
  }
}

async function fetchKhmerData() {

  try {

    let shouldUpdate = false;

    const url = 'https://covid19-map.cdcmoh.gov.kh/';
    const data = await getData(url);
    const dom = new JSDOM(data);
    const document = dom.window.document;
    const confirmedCase = parseInt(document.querySelector("#confirmed-case").textContent);
    const activeCase = parseInt(document.querySelector("#active-case").textContent);
    const recoveredCase = parseInt(document.querySelector("#recovered-case").textContent);
    const fatalCase = parseInt(document.querySelector("#fatal-case").textContent);


    const content = document.getElementById(provinceIds.SIHANOUK)
      .getElementsByClassName("area-total")[0]
      .textContent;

    if (!globalTotalCases) {
      shouldUpdate = true;
      globalTotalCases = {};
    } else if (globalTotalCases && (
      globalTotalCases.ACTIVE_CASES !== activeCase || 
      globalTotalCases.FATAL_CASES !== fatalCase || 
      globalTotalCases.RECOVERED_CASES !== recoveredCase ||
      globalTotalCases.CONFIRMED_CASES !== confirmedCase
    )) {
      shouldUpdate = true;
    }

    globalTotalCases = {
      CONFIRMED_CASES: confirmedCase,
      ACTIVE_CASES: activeCase,
      RECOVERED_CASES: recoveredCase,
      FATAL_CASES: fatalCase,
    }

    let globalProvinceCases = [];
    Object.keys(provinceIds).forEach(province => {
      let provinceCase = 0;
      const provinceId = provinceIds[province];
      const provinceName = provinceNames[province];
      try {
        provinceCase = parseInt(document.getElementById(provinceId).getElementsByClassName("area-total")[0].textContent); 
      } catch (error) {
        console.log(error);
      }
      globalProvinceCases.push(`- ${provinceName}: ${format(provinceCase)}\n`);
    });

    if (shouldUpdate) {

      let msg = '';
      msg += 
`

Cambodia:
==============================
Cases: ${format(globalTotalCases.CONFIRMED_CASES)}
Active Cases: ${format(globalTotalCases.ACTIVE_CASES)}
Recovered Cases: ${format(globalTotalCases.RECOVERED_CASES)}
Death: ${format(globalTotalCases.FATAL_CASES)}
`;
      msg += 
`
Provinces:
==============================
`;
      globalProvinceCases.forEach(province => {
        msg += province
      });
  
      slack.send(msg);
  
    } else {
      console.log('No update yet');
    }

  } catch (error) {

    console.log(error);

  }

}

module.exports = {
  fetch: fetchKhmerData
}
