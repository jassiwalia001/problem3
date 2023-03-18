const fs = require('fs');

function getWeeksOfCurrentMonth() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const startDate = new Date(currentYear, currentMonth, 1);
  const endDate = new Date(currentYear, currentMonth + 1, 0);

	const weekRanges = [];
	

  if (startDate.getDay() !== 0) {
    const firstWeekStartDate = new Date(startDate);
    const firstWeekEndDate = new Date(startDate);

    firstWeekEndDate.setDate(
      firstWeekEndDate.getDate() + (6 - startDate.getDay())
    );
    weekRanges.push(
      `${moment(firstWeekStartDate).format('YYYY-MM-DD')} to ${moment(
        firstWeekEndDate
      ).format('YYYY-MM-DD')}`
    );
  }

  for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) {
      const weekStartDate = new Date(d);
      const weekEndDate = new Date(d);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekRanges.push(
        `${moment(weekStartDate).format('YYYY-MM-DD')} to ${moment(
          weekEndDate
        ).format('YYYY-MM-DD')}`
      );
    }
  }

  return weekRanges;
}

function appendWeekRangesInSelectTag(weekRanges, selectElement) {
  for (const weekRange of weekRanges) {
    const option = document.createElement('option');
    option.value = weekRange;
    option.text = weekRange;
    selectElement.add(option);
  }
}

let weekRanges = getWeeksOfCurrentMonth();

let selectTagForWeeks = document.getElementById('weeks-select');
selectTagForWeeks.addEventListener('change', function (e) {
  selectedWeek = e.target.value;
});

let startTrackingButton = document.getElementById('start-tracking');
startTrackingButton.addEventListener('click', getWeatherDetails);

appendWeekRangesInSelectTag(weekRanges, selectTagForWeeks);

function appendDataInWeatherTable(tbodyElement, dayObj) {
  let newRow = document.createElement('tr');

  let dayCell = document.createElement('td');
  let dateCell = document.createElement('td');
  let minTemperatureCell = document.createElement('td');
  let maxTemperatureCell = document.createElement('td');

  dayCell.textContent = dayObj.day;
  dateCell.textContent = dayObj.date;
  minTemperatureCell.textContent = dayObj.minTemperature;
  maxTemperatureCell.textContent = dayObj.maxTemperature;

  newRow.appendChild(dayCell);
  newRow.appendChild(dateCell);
  newRow.appendChild(minTemperatureCell);
  newRow.appendChild(maxTemperatureCell);

  tbodyElement.appendChild(newRow);
}

var jsonData = [];
var selectedWeek = selectTagForWeeks.value;

async function getWeatherDetails(updateDom = true) {
  if (selectedWeek) {
    let startDateOfWeek = selectedWeek.split('to')[0];
    let endDateOfWeek = selectedWeek.split('to')[1];

    let weatherTableElement = document.getElementById('weather-details-table');
    let weatherTableBodyElement =
      weatherTableElement.getElementsByTagName('tbody')[0];
    let weatherErrorElement = document.getElementById('weather-details-error');

    startTrackingButton.disabled = true;
    try {
      let { data } = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&timezone=America/New_York&daily=temperature_2m_max,temperature_2m_min&start_date=${startDateOfWeek.trim()}&end_date=${endDateOfWeek.trim()}`
      );

      if (data) {
        jsonData = [];

        if (updateDom) {
          weatherTableBodyElement.innerHTML = '';
        }

        data.daily.time.forEach((value, index) => {
          let dayObj = {
            day: moment(value, 'YYYY-MM-DD').format('dddd'),
            date: value,
            minTemperature: data.daily.temperature_2m_min[index],
            maxTemperature: data.daily.temperature_2m_max[index],
          };

          if (updateDom) {
            appendDataInWeatherTable(weatherTableBodyElement, dayObj);
          }
          jsonData.push(dayObj);
        });

        if (updateDom) {
          weatherErrorElement.classList.add('d-none');
          weatherTableElement.classList.remove('d-none');
        }
        generateXmlButton.classList.remove('d-none');
        return jsonData;
      }
    } catch (error) {
      weatherTableElement.classList.add('d-none');
      generateXmlButton.classList.add('d-none');
      weatherErrorElement.classList.remove('d-none');
    } finally {
      startTrackingButton.disabled = false;
    }
  }
}

let generateXmlButton = document.getElementById('generate-xml');
generateXmlButton.addEventListener('click', generateXml);

async function generateXml() {
  if (jsonData.length >= 1) {
    jsonData = await getWeatherDetails(false);
  }

  let xml = '<temperatures>';
  jsonData.forEach((data) => {
    xml += `<temperature>
      <day>${data.day}</day>
      <date>
        <dateValue>${data.date}</dateValue>
        <dateFormat>YYYY-MM-dd</dateFormat>
      </date>
      <min>${data.minTemperature}</min>
      <max>${data.maxTemperature}</max>
      </temperature> `;
  });

  xml += '</temperatures>';
  let fileName = selectedWeek.trim().replaceAll(' ', '_') + '.xml';
  writeFile(fileName, xml);
}

window.requestFileSystem =
  window.requestFileSystem || window.webkitRequestFileSystem;

function writeFile(fileName, blob) {
  try {
    fs.writeFileSync(fileName, blob);
    showChartButton.classList.remove('d-none');
    console.log('File has been saved!');
  } catch (err) {
    showChartButton.classList.add('d-none');
    console.log('Error occurred while saving the file', err);
  }
}

function readFile(fileName) {
  try {
    let data = fs.readFileSync(fileName, 'utf8');
    return data;
  } catch (err) {
    console.log(
      'Error occurred while reading the file, generating new file',
      err
    );
    generateXml();
  }
}

let showChartButton = document.getElementById('show-chart');
showChartButton.addEventListener('click', showChart);

async function showChart() {
  let fileName = selectedWeek.trim().replaceAll(' ', '_') + '.xml';
  let xmlData = await readFile(fileName);

  if (xmlData) {
    let parser = new DOMParser();
    let xml = parser.parseFromString(xmlData, 'application/xml');

    let xmlForChart = `<chart theme="fusion" caption="" xaxisname="Days" yaxisname="Temperature In Celcius" plotfillalpha="80" divlineisdashed="1" divlinedashlen="1" divlinegaplen="1">\n`;

    let temperaturesFromXml = xml.getElementsByTagName('temperature');

    xmlForChart += `<categories>\n`;
    for (let temperature of temperaturesFromXml) {
      let dayName = temperature.getElementsByTagName('day')[0].innerHTML;
      xmlForChart += `<category label="${dayName}" />\n`;
    }
    xmlForChart += `</categories>\n`;

    xmlForChart += `<dataset seriesname="Min Temperature">\n`;
    for (let temperature of temperaturesFromXml) {
      let minTemperature = temperature.getElementsByTagName('min')[0].innerHTML;
      xmlForChart += `<set value="${minTemperature}" />\n`;
    }
    xmlForChart += `</dataset>\n`;

    xmlForChart += `<dataset seriesname="Max Temperature">\n`;
    for (let temperature of temperaturesFromXml) {
      let maxTemperature = temperature.getElementsByTagName('max')[0].innerHTML;
      xmlForChart += `<set value="${maxTemperature}" />\n`;
    }
    xmlForChart += `</dataset>\n`;

    xmlForChart += `</chart>`;

    document.getElementById('chart-container').classList.remove('d-none');
    FusionCharts.ready(function () {
      var chartObj = new FusionCharts({
        type: 'mscolumn2d',
        renderAt: 'chart-container',
        width: '100%',
        height: '390',
        dataFormat: 'xml',
        dataSource: xmlForChart,
      });
      chartObj.render();
    });
  }
}
