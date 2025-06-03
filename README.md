# 🧠 Browser Tutor

## Project Description

Browser Tutor is an innovative web-based application designed to assist users with math problems directly within their browser. Leveraging the power of WebLLM for AI-driven explanations and a suite of JavaScript libraries for precise mathematical calculations, graphing, and image processing, this tutor bot provides comprehensive assistance without requiring any backend server. It's built for a hackathon with a focus on entirely client-side execution.

## Features

* **In-Browser AI Tutoring (WebLLM):** Utilizes a large language model (Phi-3-mini) running directly in your web browser to provide natural language explanations and guidance for math concepts. This enables offline capability and enhanced privacy.
* **Precise Math Solving (Algebrite.js & Math.js):** Handles a wide range of mathematical operations including:
    * Arithmetic calculations
    * Symbolic integration (e.g., `integrate(x^2)`)
    * Symbolic differentiation (e.g., `derivative(sin(x))`)
    * Equation solving (e.g., `solve(2*x+5=11)`)
* **Function Plotting (Chart.js):** Visualize mathematical functions by simply typing `plot [your_expression]` (e.g., `plot sin(x)`).
* **Speech Recognition:** Speak your questions aloud for hands-free input.
* **Image to Text (Tesseract.js):** Upload images containing math problems, and the tutor will extract the text using OCR.
* **Text-to-Speech:** Listen to the tutor's answers for an auditory learning experience.
* **Intelligent Fallback:** If the symbolic math engine cannot solve a problem, the AI model provides a helpful explanation.

## Technologies Used

* **WebLLM (`@mlc-ai/web-llm`):** For running the large language model (Phi-3-mini-4k-instruct-q4f16_1-MLC) entirely in the browser.
* **Algebrite.js:** A JavaScript library for symbolic mathematics (algebra, calculus).
* **Math.js:** A comprehensive math library for JavaScript.
* **Chart.js:** For creating dynamic graphs and visualizations.
* **Tesseract.js:** JavaScript library for OCR (Optical Character Recognition) in the browser.
* **Native Browser APIs:** Web Speech API (Speech Recognition, Speech Synthesis), File API.
* **HTML, CSS, JavaScript**

## Setup and Running the Project

Since this project runs entirely in the browser, you just need a local web server to serve the files.

### Prerequisites

* **Node.js:** Make sure you have Node.js installed (includes `npm`). You can download it from [nodejs.org](https://nodejs.org/).
* **Modern Browser:** Use Google Chrome or Microsoft Edge for best compatibility and WebGPU support.
* **Sufficient Disk Space:** Ensure you have at least **10-15 GB of free disk space** on your primary drive for the WebLLM model to be cached.

### Steps

1.  **Clone or Download the Project:**
    (Assuming you have your project files in a folder, if using Git, clone the repository):
    ```bash
    git clone <your-repo-url>
    cd browser-tutor
    ```
    (Otherwise, just navigate to your project folder).

2.  **Install `http-server` (if you haven't already):**
    Open your terminal or command prompt and run:
    ```bash
    npm install -g http-server
    ```

3.  **Start the Local Web Server:**
    Navigate to your project's root directory (where `index.html` and `app.js` are located) in your terminal/command prompt and run:
    ```bash
    http-server
    ```
    You will see output indicating the local server address (e.g., `http://127.0.0.1:8080` or `http://localhost:8080`).

4.  **Open in Browser & Prepare:**
    * Open your browser (preferably Chrome or Edge) in a **new Incognito/Private window**.
    * Go to the address provided by `http-server` (e.g., `http://127.0.0.1:8080`).
    * **Open your browser's Developer Tools (F12).** Keep the "Console" and "Network" tabs open for monitoring.
    * **Important: Ensure WebGPU is enabled** in your browser flags (`chrome://flags` or `edge://flags` -> search for "WebGPU" -> set to "Enabled" -> Relaunch browser).

## How to Use

1.  **Load the AI Model:**
    * When the page loads, the AI model (Phi-3-mini) is **not immediately loaded** due to its large size.
    * Click the **"Load AI Model"** button.
    * Monitor the "Status" div on the page and your browser's console. You will see progress messages as the model (approx. 1.5-2 GB) downloads and initializes. This can take several minutes depending on your internet speed and system.
    * Wait until the status displays: `"Model 'Phi-3-mini-4k-instruct-q4f16_1-MLC' loaded successfully!"`

2.  **Ask a Math Question:**
    * Type your question into the text area.
    * **For direct math solving (Algebrite):**
        * `2 + 2 * 5`
        * `integrate(x^2)`
        * `derivative(sin(x))`
        * `solve(2*x+5=11)`
    * **For plotting:**
        * `plot sin(x)`
        * `plot x^2 + 1`
    * **For AI-driven explanations (fallback or general knowledge):**
        * `What is the Pythagorean theorem?`
        * `Explain integrals.`
        * Any question that Algebrite cannot directly solve.
        * You can also click the **"Test AI Fallback"** button to directly query the AI.

3.  **Click "Solve"** (or use other buttons):
    * The solution will appear in the "Solution Output" area.
    * If the AI is used, you'll see it update token by token.

4.  **Additional Features:**
    * Click **"🎤 Speak"** to input your question using voice.
    * Click **"📷 Upload Image"** to select an image containing text, and it will be transcribed into the input field for solving.
    * Click **"🎤 Speak"** again after a solution appears to hear the answer.

## Troubleshooting

* **"Error loading model: caches is not defined"**: This means you're trying to open `index.html` directly from your file system (`file:///`). You **must** serve the files using a local web server (like `http-server`).
* **"Error loading model: Failed to execute 'add' on 'Cache': Quota exceeded."**: Your browser has run out of space to store the large LLM model.
    1.  **Clear ALL browser cache and site data** for `localhost` (or your server's address) in your browser settings (Advanced -> All time -> `Cached images and files`, `Hosted app data`, `Site settings`).
    2.  **Check your physical disk space.** Ensure you have at least 10-15 GB free.
    3.  Restart your browser and `http-server`.
* **"Error: Model not loaded before trying to complete ChatCompletionRequest."**: You are trying to use the AI before it has finished loading. Click the "Load AI Model" button and wait for the status to confirm it's loaded successfully.
* **LLM is Slow**: This is expected. Running a multi-billion-parameter model on client-side hardware is computationally intensive. The speed depends on your CPU/GPU. Ensure WebGPU is enabled and your graphics drivers are up to date.

---

Enjoy your Browser Tutor!
