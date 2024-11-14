const API_KEY = '555cdbd9d1c7962761eb6910e1e2c004';
const GEMINI_API_KEY = 'AIzaSyCzLh7nvUdAcynzCg-DvUUR2VM87e9Y0g8'; 
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const forecastBody = document.getElementById('forecast-body');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const locationName = document.getElementById('location-name');

const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

let forecastData = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentWeatherData = {}; 

// Suggested questions for users
const suggestedQuestions = [
    "What's the weather like today?",
    "How hot is it?",
    "Will it rain?",
    "What is the temperature in [city]?",
    "What's the weather forecast for this week?"
];

// Display suggested questions
function displaySuggestedQuestions() {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '<strong>Suggested Questions:</strong><br/>';
    suggestedQuestions.forEach(question => {
        const suggestionElement = document.createElement('div');
        suggestionElement.textContent = question;
        suggestionElement.className = 'suggestion';
        suggestionElement.onclick = () => {
            chatInput.value = question;
            sendButton.click(); 
        };
        suggestionsDiv.appendChild(suggestionElement);
    });
}

// Fetch weather data on search button click
searchBtn.addEventListener('click', () => {
    const city = cityInput.value;
    if (city) {
        fetchWeatherData(city);
    }
});

// Page navigation buttons
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        displayForecastData();
    }
});

nextPageBtn.addEventListener('click', () => {
    if (currentPage < Math.ceil(forecastData.length / itemsPerPage)) {
        currentPage++;
        displayForecastData();
    }
});

// Fetch weather data from OpenWeather API
async function fetchWeatherData(city = null, latitude = null, longitude = null) {
    try {
        document.getElementById('loading-spinner').style.display = 'block';

        let response;
        if (latitude && longitude) {
            response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`);
        } else if (city) {
            response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        } else {
            throw new Error("City name or coordinates must be provided");
        }

        const data = await response.json();

        if (data.city && data.city.name) {
            locationName.textContent = `Temperature Forecast for ${data.city.name}, ${data.city.country}`;
        } else {
            locationName.textContent = `Temperature Forecast for Coordinates (${latitude}, ${longitude})`;
        }

        forecastData = data.list;

        currentWeatherData = {
            temperature: forecastData[0].main.temp,
            description: forecastData[0].weather[0].description,
            city: data.city.name,
            country: data.city.country
        };

        currentPage = 1;
        displayForecastData();
    } catch (error) {
        console.error('Error fetching weather data:', error);
    }
    finally {
        document.getElementById('loading-spinner').style.display = 'none';
    }
}

// Display forecast data in the table
function displayForecastData() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = forecastData.slice(start, end);

    forecastBody.innerHTML = '';
    pageData.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.dt * 1000);
        row.innerHTML = `
            <td>${date.toLocaleDateString()}</td>
            <td>${date.toLocaleTimeString()}</td>
            <td>${item.main.temp.toFixed(1)}</td>
        `;
        forecastBody.appendChild(row);
    });

    pageInfo.textContent = `Page ${currentPage} of ${Math.ceil(forecastData.length / itemsPerPage)}`;
}

// Get user's location
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => fetchWeatherData(null, position.coords.latitude, position.coords.longitude),
            error => console.error('Error getting user location:', error)
        );
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
}
getUserLocation();
sendButton.addEventListener('click', async () => {
    const userMessage = chatInput.value.trim();
    if (userMessage) {
        addMessageToChat('User', userMessage);
        chatInput.value = '';

        if (/weather|temperature|rain|forecast|cold|hot/i.test(userMessage)) {
            let responseText;
            if (currentWeatherData.temperature) {
                if (/today/i.test(userMessage)) {
                    responseText = `Today in ${currentWeatherData.city}, ${currentWeatherData.country}, the temperature is ${currentWeatherData.temperature}°C with ${currentWeatherData.description}.`;
                } else if (/rain/i.test(userMessage)) {
                    const rainForecast = forecastData.some(item => item.weather[0].main.toLowerCase() === 'rain');
                    responseText = rainForecast
                        ? `Yes, it is expected to rain today in ${currentWeatherData.city}.`
                        : `No, it is not expected to rain today in ${currentWeatherData.city}.`;
                } else if (/hot|cold/i.test(userMessage)) {
                    responseText = `It's currently ${currentWeatherData.temperature}°C in ${currentWeatherData.city}.`;
                } else if (/forecast|next/i.test(userMessage)) {
                    responseText = `The temperature forecast for today in ${currentWeatherData.city} is ${currentWeatherData.temperature}°C with ${currentWeatherData.description}.`;
                } else {
                    responseText = `The weather in ${currentWeatherData.city} today is ${currentWeatherData.temperature}°C with ${currentWeatherData.description}.`;
                }
            } else {
                responseText = 'I currently do not have weather data available. Please try again later.';
            }
            addMessageToChat('Bot', responseText);
            return; 
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: userMessage 
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                console.error('Error with Gemini API:', errorMessage);
                addMessageToChat('Bot', 'Sorry, I encountered an error. Please try again later.');
                return;
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                const botResponse = data.candidates[0].content.parts[0].text || 'Sorry, I didn\'t get that.';
                addMessageToChat('Bot', botResponse);
            } else {
                addMessageToChat('Bot', 'Sorry, I didn\'t get that.');
            }
        } catch (error) {
            console.error('Error with Gemini API:', error);
            addMessageToChat('Bot', 'Sorry, I encountered an error. Please try again later.');
        }
    }
});

// Function to add messages to chat with wrapping
function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    messageElement.style.wordWrap = 'break-word'; 
    messageElement.style.maxWidth = '400px'; 
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
}


function sortTemperaturesAscending() {
    const sortedData = forecastData.slice(0,10).sort((a, b) => a.main.temp - b.main.temp);
    displaySortedData(sortedData);
}
function filterRainyDays() {
    const rainyDays = forecastData.filter(item => item.weather.some(weather => weather.main.toLowerCase() === 'rain'));
    displaySortedData(rainyDays);
}
function showHighestTemperatureDay() {
    const hottestDay = forecastData.reduce((prev, current) => (prev.main.temp > current.main.temp) ? prev : current);
    displaySortedData([hottestDay]); 
}
function sortTemperaturesDescending() {
    const sortedData = forecastData.slice(0,10).sort((a, b) => b.main.temp - a.main.temp);
    displaySortedData(sortedData);
}
document.getElementById('sort-asc-btn').addEventListener('click', sortTemperaturesAscending);
document.getElementById('sort-desc-btn').addEventListener('click', sortTemperaturesDescending);
document.getElementById('filter-rain-btn').addEventListener('click', filterRainyDays);
document.getElementById('hottest-day-btn').addEventListener('click', showHighestTemperatureDay);


// Utility Function to Display Data
function displaySortedData(data) {
    forecastBody.innerHTML = '';
    data.forEach(item => {
        const row = document.createElement('tr');
        const date = new Date(item.dt * 1000);
        row.innerHTML = `
            <td>${date.toLocaleDateString()}</td>
            <td>${date.toLocaleTimeString()}</td>
            <td>${item.main.temp.toFixed(1)}</td>
        `;
        forecastBody.appendChild(row);
    });

    pageInfo.textContent = `Showing ${data.length} results`;
}








// Call function to display suggested questions
displaySuggestedQuestions();
