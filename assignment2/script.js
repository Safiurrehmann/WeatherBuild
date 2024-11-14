const API_KEY = '555cdbd9d1c7962761eb6910e1e2c004';
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const cityName = document.getElementById('city-name');
const weatherInfo = document.getElementById('weather-info');
const weatherWidget = document.getElementById('weather-widget');
const unitToggle = document.getElementById('unit-toggle');  

let tempChart, conditionsChart, tempTrendChart;
let isFahrenheit = false;
let currentCity = null;
let currentLat = null;
let currentLon = null;

searchBtn.addEventListener('click', () => {
    const city = cityInput.value;
    if (city) {
        fetchWeatherData(city);
    }
});

unitToggle.addEventListener('change', () => {
    isFahrenheit = unitToggle.checked; 
    if (currentCity || (currentLat && currentLon)) {
        fetchWeatherData(currentCity, currentLat, currentLon);
    }
});

// Fetch weather data function
async function fetchWeatherData(city = null, latitude = null, longitude = null) {
    try {
        document.getElementById('loading-spinner').style.display = 'block';

        let currentWeatherResponse, forecastResponse;
        const unit = isFahrenheit ? 'imperial' : 'metric'; 

        if (latitude && longitude) {
            currentWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`);
            forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=${unit}`);
            currentLat = latitude;
            currentLon = longitude;
            currentCity = null;
        } else if (city) {
            currentWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${unit}`);
            forecastResponse = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=${unit}`);
            currentCity = city;
            currentLat = null;
            currentLon = null;
        } else {
            throw new Error("City name or coordinates must be provided");
        }

        if (!currentWeatherResponse.ok || !forecastResponse.ok) {
            throw new Error(`Failed to fetch weather data: ${currentWeatherResponse.statusText}`);
        }

        const currentWeatherData = await currentWeatherResponse.json();
        const forecastData = await forecastResponse.json();

        updateWeatherInfo(currentWeatherData);
        updateCharts(forecastData);

    } catch (error) {
        console.error('Error fetching weather data:', error);
        weatherInfo.innerHTML = `<p>Error fetching weather data: ${error.message}. Please try again.</p>`;
    }finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

// Update weather information
function updateWeatherInfo(data) {
    cityName.textContent = data.name;
    const temperature = data.main.temp;
    const unitLabel = isFahrenheit ? '°F' : '°C'; 

    weatherInfo.innerHTML = `
        <p>Temperature: ${temperature} ${unitLabel}</p>
        <p>Humidity: ${data.main.humidity}%</p>
        <p>Wind Speed: ${data.wind.speed} ${isFahrenheit ? 'miles/h' : 'm/s'}</p>
        <p>Weather: <strong>${data.weather[0].description}</strong></p>
    `;
    updateWidgetBackground(data.weather[0].main);
}

// Update widget background
function updateWidgetBackground(weatherCondition) {
    const backgrounds = {
        Clear: 'url("clear.jpg")', 
        Clouds: 'url("clouds.jpeg")',
        Rain: 'url("rain.jpg")', 
        Snow: 'url("snow.jpg")', 
        Thunderstorm: 'url("thunderstorm.jpg")', 
        Drizzle: 'url("drizzle.jpg")', 
        Mist: 'url("mist.jpeg")' ,
        Smoke:'url(smoke.jpeg)'
    };

    weatherWidget.style.backgroundImage = backgrounds[weatherCondition] || 'url("images/default.jpg")';
    weatherWidget.style.backgroundSize = 'cover';
    weatherWidget.style.backgroundPosition = 'center'; 
    weatherWidget.style.backgroundRepeat = 'no-repeat'; 
}

// Update charts functionality
function updateCharts(forecastData) {
    const next5Days = forecastData.list.filter((item, index) => index % 8 === 0).slice(0, 5);
    
    const tempUnit = isFahrenheit ? '°F' : '°C'; 
    
    const tempData = {
        labels: next5Days.map(day => new Date(day.dt * 1000).toLocaleDateString()),
        datasets: [{
            label: `Temperature (${tempUnit})`, 
            data: next5Days.map(day => day.main.temp),
            backgroundColor: 'rgba(0, 128, 0, 0.5)',
            borderColor: 'rgb(0, 200, 0)',
            borderWidth: 1
        }]
    };

    const conditionsCount = next5Days.reduce((acc, day) => {
        const condition = day.weather[0].main;
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});

    const conditionsData = {
        labels: Object.keys(conditionsCount),
        datasets: [{
            data: Object.values(conditionsCount),
            backgroundColor: [
                'rgba(255, 99, 132, 0.5)',
                'rgba(54, 162, 235, 0.5)',
                'rgba(255, 206, 86, 0.5)',
                'rgba(75, 192, 192, 0.5)',
                'rgba(153, 102, 255, 0.5)'
            ],
            borderColor: [
                'rgb(255, 99, 132)',
                'rgb(54, 162, 235)',
                'rgb(255, 206, 86)',
                'rgb(75, 192, 192)',
                'rgb(153, 102, 255)'
            ],
            borderWidth: 1
        }]
    };

    const tempTrendData = {
        labels: next5Days.map(day => new Date(day.dt * 1000).toLocaleDateString()),
        datasets: [{
            label: `Temperature (${tempUnit})`, 
            data: next5Days.map(day => day.main.temp),
            borderWidth: 0.5,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };

    if (tempChart) tempChart.destroy();
    if (conditionsChart) conditionsChart.destroy();
    if (tempTrendChart) tempTrendChart.destroy();

    tempChart = new Chart(document.getElementById('temp-chart'), {
        type: 'bar',
        data: tempData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    bodyFont: {
                        size: 3
                    },
                    titleFont: {
                        size: 3
                    }
                }
            },
            animation: {
                y: {
                    duration: 2000,
                    easing: 'easeOutBounce'
                }
            }
        }
    });

    conditionsChart = new Chart(document.getElementById('conditions-chart'), {
        type: 'doughnut',
        data: conditionsData,
        options: {
            responsive: true,
            animation: {
                delay: (context) => {
                    return context.dataIndex * 300;
                }
            }
        }
    });

    tempTrendChart = new Chart(document.getElementById('temp-trend-chart'), {
        type: 'line',
        data: tempTrendData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            animation: {
                y: {
                    duration: 2000,
                    easing: 'easeOutBounce'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 8
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    bodyFont: {
                        size: 3
                    },
                    titleFont: {
                        size: 3
                    }
                }
            }
        }
    });
}




// Initial geolocation weather loading functionality
function successCallback(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    fetchWeatherData(null, latitude, longitude);
}

function errorCallback(error) {
    console.error("Error getting location:", error);
    weatherInfo.innerHTML = '<p>Unable to retrieve your location. Please check your browser settings.</p>';
}

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
} else {
    console.error("Geolocation is not supported by this browser.");
}
