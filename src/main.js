import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

const video = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const overlay = document.getElementById('face-overlay');
const trackingBox = document.querySelector('.tracking-box');
const enableButton = document.getElementById('enable-cam');

let faceLandmarker;
let runningMode = 'VIDEO';
let lastVideoTime = -1;
let results = undefined;

// Initialize FaceLandmarker
async function createFaceLandmarker() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
      delegate: 'GPU'
    },
    outputFaceBlendshapes: true,
    runningMode,
    numFaces: 1
  });
}

createFaceLandmarker();

// Enable Webcam
function enableCam(event) {
  if (!faceLandmarker) {
    console.log('Wait! faceLandmarker not loaded yet.');
    return;
  }

  const constraints = {
    video: {
      width: 1280,
      height: 720
    }
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
    enableButton.classList.add('hidden');
    screenshotBtn.classList.remove('hidden');
    // langToggle.classList.remove('hidden'); // Removed
    startSpeechRecognition();
  });
}

let recognition;
let silenceTimer;
const MAX_LINES = 5;
const SILENCE_TIMEOUT = 2000; // 2 seconds
let resultStartIndex = 0;

function startSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) {
    console.warn('Speech recognition not supported');
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  const contentDiv = trackingBox.querySelector('.content');
  contentDiv.textContent = '';

  recognition.onresult = (event) => {
    let transcript = '';

    // Build transcript from the current start index
    for (let i = resultStartIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }

    contentDiv.textContent = transcript;

    // Check line count
    const lineHeight = 24;
    const height = contentDiv.clientHeight;
    const lines = height / lineHeight;

    if (lines > MAX_LINES) {
      // Refresh: Move start index to current length
      // This effectively hides all previous results
      resultStartIndex = event.results.length;
      contentDiv.textContent = '';

      // If the current result itself is huge (unlikely but possible), we might still overflow.
      // But typically we overflow by accumulating small results.
    }

    // Reset silence timer
    clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      // On silence, we also "refresh" by moving the start index
      // or just clearing the visual text. 
      // If we just clear visual text, the next result will append to the OLD results if we don't update index.
      // So we should update the index.
      resultStartIndex = event.results.length;
      contentDiv.textContent = '';
    }, SILENCE_TIMEOUT);
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
  };

  recognition.onend = () => {
    recognition.start();
  };

  recognition.start();
}

// Removed language toggle logic

enableButton.addEventListener('click', enableCam);

async function predictWebcam() {
  // Resize the video to match the stream size
  // video.style.width = video.videoWidth + 'px';
  // video.style.height = video.videoHeight + 'px';

  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = faceLandmarker.detectForVideo(video, startTimeMs);
  }

  if (results.faceLandmarks) {
    for (const landmarks of results.faceLandmarks) {
      drawTrackingBox(landmarks);
    }
    if (results.faceLandmarks.length === 0) {
      trackingBox.style.display = 'none';
    }
  }

  window.requestAnimationFrame(predictWebcam);
}

function drawTrackingBox(landmarks) {
  // Calculate bounding box
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const landmark of landmarks) {
    if (landmark.x < minX) minX = landmark.x;
    if (landmark.x > maxX) maxX = landmark.x;
    if (landmark.y < minY) minY = landmark.y;
    if (landmark.y > maxY) maxY = landmark.y;
  }

  // MediaPipe coordinates are normalized [0, 1]
  // Video is mirrored via CSS transform: scaleX(-1)
  // To position correctly on a mirrored video:
  // 1. Get the face bounding box in normalized coords
  // 2. Calculate the "visual" right side of the face.
  //    Since it's mirrored, the "visual right" corresponds to the "source left" (minX).
  //    Wait, let's trace:
  //    Source Image:  [Left Ear ... Right Ear]
  //    Landmarks:     minX (Left Ear) ... maxX (Right Ear)
  //    Mirrored View: [Right Ear ... Left Ear]
  //    
  //    If I want the box to be on the "visual right" of the face (user's left shoulder):
  //    That is the Right Ear side in the mirrored view.
  //    Which corresponds to maxX in the source image.
  //    
  //    Let's calculate the position in % relative to the container.
  //    
  //    Visual Left of Face (on screen) = (1 - maxX) * 100
  //    Visual Right of Face (on screen) = (1 - minX) * 100

  const visualRight = (1 - minX) * 100;
  const visualTop = minY * 100;

  // Position the box slightly to the right of the face
  const left = visualRight + 2; // 2% offset
  const top = visualTop;

  trackingBox.style.left = `${left}%`;
  trackingBox.style.top = `${top}%`;
  trackingBox.style.width = 'auto'; // Let content define width
  trackingBox.style.height = 'auto';
  trackingBox.style.display = 'block';

  // Update content if needed (optional, for now static)
  // trackingBox.querySelector('.label').textContent = "USER DETECTED";
}

// Screenshot functionality
const screenshotBtn = document.getElementById('screenshot-btn');

screenshotBtn.addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // Set canvas size to video size
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw video frame
  // Note: Video is mirrored in CSS, but drawImage draws the raw frame (not mirrored).
  // To match the visual output, we need to mirror the context before drawing.
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw overlay if visible
  if (trackingBox.style.display !== 'none') {
    // Get computed styles to match the look
    const boxStyle = window.getComputedStyle(trackingBox);
    const labelStyle = window.getComputedStyle(trackingBox.querySelector('.label'));
    const contentStyle = window.getComputedStyle(trackingBox.querySelector('.content'));

    // Parse positions
    // The positions in style are %, we need to convert to pixels
    const leftPercent = parseFloat(trackingBox.style.left);
    const topPercent = parseFloat(trackingBox.style.top);

    const boxX = (leftPercent / 100) * canvas.width;
    const boxY = (topPercent / 100) * canvas.height;

    // We need to estimate width/height since it's auto in CSS
    // For the screenshot, we can measure the actual element size and scale it
    const rect = trackingBox.getBoundingClientRect();
    const videoRect = video.getBoundingClientRect();

    // Scale factor between screen pixels and canvas pixels
    const scaleX = canvas.width / videoRect.width;
    const scaleY = canvas.height / videoRect.height;

    const boxWidth = rect.width * scaleX;
    const boxHeight = rect.height * scaleY;

    // Draw Box Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeStyle = '#00ff9d';
    ctx.lineWidth = 2;

    // Round rect helper
    roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Draw Label
    ctx.fillStyle = '#00ff9d';
    ctx.font = 'bold 24px Inter, sans-serif'; // Hardcoded size for canvas
    ctx.fillText('SUBJECT IDENTIFIED', boxX + 25, boxY + 40);

    // Draw Content
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('ID: 8472-A', boxX + 25, boxY + 70);
    ctx.fillText('STATUS: TRACKING', boxX + 25, boxY + 95);
    ctx.fillText('THREAT: LOW', boxX + 25, boxY + 120);
  }

  // Download
  const link = document.createElement('a');
  link.download = `face-stalker-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
