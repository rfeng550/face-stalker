# Face Stalker - Developer Log
## 2025-11-25

## Project Overview
**Face Stalker** is a web application that uses real-time computer vision to track a user's face via webcam and displays a dynamic, floating information card next to it. The app features a premium "cyberpunk/sci-fi" aesthetic and includes speech-to-text capabilities.

## Development Timeline

### 1. Initialization & Core Tech
-   **Stack**: Vite (Vanilla JS), CSS3.
-   **Vision Library**: Integrated `@mediapipe/tasks-vision` for robust face landmark detection.
-   **Basic Flow**: Implemented webcam stream access and a canvas/DOM overlay system to draw tracking boxes.

### 2. UI/UX Evolution
-   **Initial Design**: Started with a "Target Acquired" bounding box surrounding the face.
-   **Refinement**: Refactored into a "Side Label" style (floating card) to avoid obstructing the user's face, creating a more sophisticated look.
-   **Aesthetics**: Applied a dark mode theme with neon green accents (`#00ff9d`), glassmorphism effects, and smooth CSS transitions.

### 3. Feature Implementation
-   **Screenshot Capability**: Added a dedicated button to capture the current video frame along with the DOM overlay, rendering them into a single downloadable image using an off-screen canvas.
-   **Speech-to-Text**: Integrated the **Web Speech API** (`webkitSpeechRecognition`) to transcribe user speech in real-time.
    -   **Constraints**: Implemented logic to auto-clear text after 2 seconds of silence and refresh the text box if content exceeds 5 lines.
    -   **Optimization**: Refined the recognition logic to use a "windowed" approach for better real-time performance and removed the language toggle to focus on English support as requested.

## Current State
-   **Face Tracking**: Stable and smooth.
-   **Speech Recognition**: Real-time, English-only, with auto-refresh and silence detection.
-   **Visuals**: Premium dark UI with responsive tracking.
-   **Tools**: Screenshot functionality working correctly.

## 2025-11-26

### 4. Bug Fixes & Optimization
-   **Speech Sensitivity**: Fixed a race condition in the speech recognition logic where text would sometimes disappear prematurely or fail to appear if the user spoke during a clear event.
-   **Reliability**: Added a session reset mechanism to ensure speech recognition continues to function correctly after automatic restarts or network interruptions.
-   **Tuning**: Adjusted silence timeout to 1.5 seconds for better user experience.
