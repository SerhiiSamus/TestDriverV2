const startButton = document.getElementById('start-button');
const gameArea = document.getElementById('game-area');
const timerElement = document.getElementById('timer');
const resultElement = document.getElementById('result');
const canvas = document.getElementById('canvas');
const video = document.createElement('video');

let currentNumber = 30;
let startTime;
let timerInterval;
let activeCircles = [];
let pausedTime = 0; // Time pause in milliseconds
let photoStartTime;
let photoEndTime;
let photoTime;
let photoData;
let videoStream;
let randomPhotoNumber;
let isTakingPhoto = false;
let userLocation = null;

async function startGame() {
  startButton.style.display = 'none';
  gameArea.style.display = 'block';
  currentNumber = 30;
  randomPhotoNumber = getRandomNumber(10, 20);
  startTime = new Date().getTime(); // Initial time in milliseconds
  timerInterval = setInterval(updateTimer, 100);
  createInitialCircles();
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateTimer() {
  if (isTakingPhoto) return; // Skip updating timer if taking photo

  const now = new Date().getTime(); // Current time in milliseconds
  const elapsedTime = now - startTime - pausedTime;
  const minutes = String(Math.floor(elapsedTime / 60000)).padStart(2, '0');
  const seconds = String(Math.floor((elapsedTime % 60000) / 1000)).padStart(
    2,
    '0'
  );
  const milliseconds = String(elapsedTime % 1000).padStart(3, '0');
  timerElement.textContent = `${minutes}:${seconds}:${milliseconds}`;
}

function createInitialCircles() {
  for (let i = 0; i < 5; i++) {
    createCircle(currentNumber - i);
  }
}

function createCircle(number) {
  const circle = document.createElement('div');
  circle.className = 'circle';
  circle.textContent = number;
  circle.style.top = `${Math.random() * 70}vh`;
  circle.style.left = `${Math.random() * 75}vw`;
  circle.style.zIndex = number;
  circle.addEventListener('click', () => handleCircleClick(circle, number));
  gameArea.appendChild(circle);
  activeCircles.push(circle);
}

function handleCircleClick(circle, number) {
  if (number === currentNumber) {
    if (number === randomPhotoNumber) {
      pauseGameForPhoto();
    } else {
      continueGameAfterPhoto(circle, number);
    }
  }
}

function continueGameAfterPhoto(circle, number) {
  gameArea.removeChild(circle);
  activeCircles = activeCircles.filter((c) => c !== circle);
  currentNumber--;
  if (currentNumber > 0) {
    if (currentNumber >= 5) {
      createCircle(currentNumber - 4);
    }
  } else {
    endGame();
  }
}

function pauseGameForPhoto() {
  isTakingPhoto = true;
  photoStartTime = new Date().getTime(); // Initial time for photo in milliseconds
  capturePhoto();
}

async function capturePhoto() {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0);
  photoEndTime = new Date().getTime(); // Time photo finished in milliseconds
  photoTime = photoEndTime - photoStartTime; // Time taken for photo in milliseconds
  photoData = canvas.toDataURL('image/png');
  pausedTime += photoTime; // Add photo time to paused time
  isTakingPhoto = false;

  // Get user location
  if (userLocation === null) {
    try {
      userLocation = await getUserLocation();
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  }

  const remainingCircle = activeCircles.find(
    (c) => c.textContent == currentNumber
  );
  continueGameAfterPhoto(remainingCircle, currentNumber);
}

function endGame() {
  clearInterval(timerInterval);
  gameArea.style.display = 'none';
  timerElement.style.display = 'none';
  resultElement.style.display = 'flex';

  const testTimeSeconds = calculateTimeInSeconds(timerElement.textContent);
  const photoTimeSeconds = Math.floor(photoTime / 1000);

  let resultText;
  if (testTimeSeconds < 27 && photoTimeSeconds < 6) {
    resultText =
      '<span style="color: green; font-weight: bold;">успішно</span>';
  } else {
    resultText =
      '<span style="color: red; font-weight: bold;">не пройдено</span>';
  }

  resultElement.innerHTML = `<p>Результат тесту: ${timerElement.textContent}</p> <p>Час на фото: ${photoTimeSeconds} сек</p> <p>${resultText}</p> <img src="${photoData}" alt="Фото" style="max-height:30vh; max-width: 90vw;">`;

  if (userLocation) {
    reverseGeocode(userLocation.coords.latitude, userLocation.coords.longitude)
      .then((location) => {
        resultElement.innerHTML += `<p>Місце проходження тесту: ${location}</p>`;
        console.log(location);
      })
      .catch((error) => {
        console.error('Error reverse geocoding location:', error);
      });
  }

  // Stop video stream after the game ends
  if (videoStream) {
    videoStream.getTracks().forEach((track) => track.stop());
  }
  video.remove();
}

function calculateTimeInSeconds(timerText) {
  const [minutes, seconds, milliseconds] = timerText.split(':').map(Number);
  return minutes * 60 + seconds;
}

startButton.addEventListener('click', startGame);

window.addEventListener('load', () => {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      videoStream = stream;
      video.style.display = 'none';
      document.body.appendChild(video);
      video.srcObject = stream;
      video.play();
    })
    .catch((error) => {
      console.error('Error accessing media devices.', error);
      alert(
        'Не вдалося отримати доступ до камери. Перевірте дозволи та спробуйте ще раз.'
      );
    });

  // Request location access
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = position;
    },
    (error) => {
      console.error('Error getting user location:', error);
      alert(
        'Не вдалося отримати доступ до місцезнаходження. Перевірте дозволи та спробуйте ще раз.'
      );
    }
  );
});

async function getUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

async function reverseGeocode(lat, lon) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
  );
  const data = await response.json();
  return data.display_name;
}
