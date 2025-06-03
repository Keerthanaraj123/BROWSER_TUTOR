// app.js

// 1. Import WebLLM
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Elements
const questionInput = document.getElementById('questionInput');
const solutionOutput = document.getElementById('solutionOutput');
const loadingIndicator = document.getElementById('loading');
const graphCanvasElement = document.getElementById('graphCanvas'); // Get the element itself
const graphCanvas = graphCanvasElement ? graphCanvasElement.getContext('2d') : null; // Get context only if element exists
const imageInput = document.getElementById('imageInput');
const statusDiv = document.getElementById('status');
const loadAIModelBtn = document.getElementById('loadAIModelBtn');

let synth = window.speechSynthesis;
let chartInstance = null;
let webLLMEngine = null;
const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";

// Helper function to show an element by removing the 'hidden' class
function showElement(element) {
    if (element) {
        element.classList.remove('hidden');
    }
}

// Helper function to hide an element by adding the 'hidden' class
function hideElement(element) {
    if (element) {
        element.classList.add('hidden');
    }
}

// 2. Initialize WebLLM Engine
async function initializeWebLLMEngine() {
    if (webLLMEngine) {
        statusDiv.textContent = `Model "${selectedModel}" already loaded or loading.`;
        showElement(statusDiv); // Ensure status is visible if already loaded
        return;
    }

    showElement(statusDiv); // Show status div when loading starts
    statusDiv.textContent = `Initializing WebLLM engine and loading model: ${selectedModel}...`;
    loadAIModelBtn.disabled = true;

    try {
        // Create a new MLCEngine instance
        webLLMEngine = new webllm.MLCEngine();

        // Set a progress callback for detailed loading status
        webLLMEngine.setInitProgressCallback((report) => {
            statusDiv.textContent = `Model loading: ${report.text}`;
            console.log("WebLLM Init Progress:", report);
        });

        // Load the selected model
        await webLLMEngine.reload(selectedModel);

        statusDiv.textContent = `Model "${selectedModel}" loaded successfully!`;
        // Optionally, hide statusDiv after success if you don't want it permanently visible
        // setTimeout(() => hideElement(statusDiv), 3000); // Hide after 3 seconds
    } catch (error) {
        statusDiv.textContent = `Error loading AI model: ${error.message}`;
        console.error("Error initializing WebLLM Engine:", error);
    } finally {
        loadAIModelBtn.disabled = false; // Re-enable button even on error for retry
    }
}

// 3. Generate LLM Answer (using the new engine)
async function generateLLMAnswer(prompt) {
    try {
        if (!webLLMEngine || !webLLMEngine.chat) { // Check if engine is loaded and ready
            solutionOutput.innerText = "AI model not loaded. Please click 'Load AI Model' first.";
            showElement(solutionOutput); // Show output if model not loaded
            console.error("WebLLM engine not initialized or model not loaded.");
            return "AI model not ready.";
        }

        // Use the chat.completions.create API (OpenAI style)
        const messages = [
            { role: "system", content: "You are a friendly and helpful math tutor bot. Explain concepts clearly. If a calculation is needed, phrase it in a way that can be easily parsed by a separate calculator (e.g., 'The sum is [CALCULATION: 2 + 2]', 'The solution for x is [SOLVE: 2*x + 5 = 11]'). Do not calculate yourself unless explicitly asked for a simple concept explanation." },
            { role: "user", content: prompt },
        ];

        let fullLLMResponse = "";
        // Use streaming for better UX
        const chunks = await webLLMEngine.chat.completions.create({
            messages,
            stream: true,
            temperature: 0.5,
            max_gen_len: 512, // Limit response length
        });

        solutionOutput.innerText = "AI thinking..."; // Show initial status
        showElement(solutionOutput); // Ensure solution output is visible when AI starts thinking

        for await (const chunk of chunks) {
            fullLLMResponse += chunk.choices[0]?.delta?.content || "";
            solutionOutput.innerText = fullLLMResponse + " (AI generating...)";
        }

        console.log("LLM Raw Response:", fullLLMResponse);

        // Process LLM response for math operations (Simplified for demo)
        let finalOutput = fullLLMResponse;
        const calcMatch = fullLLMResponse.match(/\[CALCULATION: (.*?)\]/);
        const solveMatch = fullLLMResponse.match(/\[SOLVE: (.*?)\]/); // Consistent tag

        if (calcMatch && calcMatch[1]) {
            try {
                // Use Math.js for calculation
                const result = math.evaluate(calcMatch[1]);
                finalOutput = finalOutput.replace(calcMatch[0], `**${result}**`);
            } catch (calcError) {
                console.error("Math.js calculation error:", calcError);
                finalOutput = finalOutput.replace(calcMatch[0], `(Error calculating: ${calcError.message})`);
            }
        } else if (solveMatch && solveMatch[1]) {
            try {
                // Use Algebrite for solving. Algebrite.run expects specific formats.
                // This is a simplified example; actual parsing might be complex.
                const equation = solveMatch[1];
                let algebriteResult = Algebrite.run(`solve(${equation}, x)`).toString();
                if (algebriteResult === '[]' || algebriteResult === '()') {
                    // Algebrite's solve can be finicky. Fallback to basic evaluate for simple cases if solve fails.
                    // This part needs more robust logic for a real tutor.
                    algebriteResult = `(Could not solve using Algebrite for now: ${equation})`;
                }
                finalOutput = finalOutput.replace(solveMatch[0], `**${algebriteResult}**`);
            } catch (solveError) {
                console.error("Algebrite solving error:", solveError);
                finalOutput = finalOutput.replace(solveMatch[0], `(Error solving: ${solveError.message})`);
            }
        }

        return finalOutput;

    } catch (error) {
        console.error("WebLLM chat error:", error);
        return "Sorry, the AI encountered an error.";
    }
}

// Function to control loading indicator visibility
function setLoading(isLoading) {
    if (isLoading) {
        showElement(loadingIndicator);
    } else {
        hideElement(loadingIndicator);
    }
}

// Function to clear graph and hide canvas
function clearGraph() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    hideElement(graphCanvasElement); // Hide graph canvas when cleared
}

// Plot function with Chart.js
function plotFunction(expr) {
    clearGraph(); // Clears any existing graph and hides the canvas

    if (!graphCanvasElement) {
        solutionOutput.innerText = "Error: Graph canvas element not found.";
        showElement(solutionOutput); // Show output if error
        return;
    }
    if (!graphCanvas) { // Check if getContext('2d') was successful
        solutionOutput.innerText = "Error: Could not get 2D context for graph canvas.";
        showElement(solutionOutput); // Show output if error
        return;
    }

    const xVals = [];
    const yVals = [];
    for (let x = -10; x <= 10; x += 0.2) {
        xVals.push(x.toFixed(2));
        try {
            let expStr = expr.replace(/x/g, `(${x})`);
            let y = math.evaluate(expStr);
            yVals.push(parseFloat(y));
        } catch {
            yVals.push(null);
        }
    }

    chartInstance = new Chart(graphCanvas, {
        type: 'line',
        data: {
            labels: xVals,
            datasets: [{
                label: expr,
                data: yVals,
                borderColor: 'blue',
                fill: false,
                spanGaps: true,
            }]
        },
        options: {
            responsive: false,
            scales: {
                x: { title: { display: true, text: 'x' } },
                y: { title: { display: true, text: 'y' } },
            }
        }
    });
    showElement(graphCanvasElement); // Show graph canvas after plotting
}

// Speak text
function speakText(text) {
    if (!text) return;
    if (synth.speaking) synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
}

// Voice recognition
function startSpeechRecognition() {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
        alert('Speech Recognition not supported in this browser.');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        questionInput.value = transcript;
        await solveQuestion();
    };

    recognition.onerror = (event) => {
        alert('Speech recognition error: ' + event.error);
    };

    recognition.start();
}

// OCR image upload
async function handleImageUpload(file) {
    if (!file) return;
    setLoading(true);
    try {
        const { data: { text } } = await Tesseract.recognize(file, 'eng');
        questionInput.value = text.trim();
        await solveQuestion();
    } catch (e) {
        alert('Failed to process image: ' + e.message);
        console.error("Image processing error:", e);
    } finally {
        setLoading(false);
    }
}

// Solve math or fallback to AI
async function solveQuestion() {
    const question = questionInput.value.trim();
    if (!question) {
        solutionOutput.innerText = 'Please enter a question.';
        showElement(solutionOutput); // Show output if no question
        hideElement(loadingIndicator); // Hide loading if empty
        return;
    }

    // Clear previous output and hide graph
    solutionOutput.innerText = '';
    hideElement(graphCanvasElement);
    showElement(solutionOutput); // Ensure solution output is visible for new answer
    setLoading(true); // Show loading indicator
    clearGraph(); // This already hides the graph canvas

    // Handle plot command: plot sin(x) or plot x^2 + 1
    if (question.toLowerCase().startsWith('plot')) {
        const expr = question.substring(4).trim();
        plotFunction(expr);
        solutionOutput.innerText = `Plotted function: ${expr}`;
        setLoading(false);
        speakText(`Plotted function: ${expr}`);
        solutionOutput.scrollIntoView({ behavior: 'smooth', block: 'end' });
        return;
    }

    let answer = '';
    let usedAI = false;

    try {
        let algebriteResult = '';
        if (question.toLowerCase().startsWith('integrate(')) {
            const expr = question.match(/integrate\((.*)\)/)[1];
            algebriteResult = Algebrite.run(`integral(${expr})`).toString();
        } else if (question.toLowerCase().startsWith('derivative(')) {
            const expr = question.match(/derivative\((.*)\)/)[1];
            algebriteResult = Algebrite.run(`d(${expr})`).toString();
        } else if (question.toLowerCase().startsWith('solve(')) {
            const eqMatch = question.match(/solve\((.*)\)/)[1];
            algebriteResult = Algebrite.run(`roots(${eqMatch})`).toString();
            if (algebriteResult === '[]' || algebriteResult === '()') {
                algebriteResult = Algebrite.run(`solve(${eqMatch}, x)`).toString();
            }
        } else {
            algebriteResult = Algebrite.run(question).toString();
        }

        if (algebriteResult && algebriteResult !== '()' && algebriteResult !== '[]' && algebriteResult !== 'undefined') {
            answer = `Algebrite Solution: ${algebriteResult}`;
        } else {
            usedAI = true;
            answer = await generateLLMAnswer(question);
        }

    } catch (e) {
        console.warn("Algebrite failed, falling back to AI:", e);
        usedAI = true;
        answer = await generateLLMAnswer(question);
    }

    solutionOutput.innerText = answer;
    speakText(answer);
    setLoading(false);
    solutionOutput.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// Event listeners
document.getElementById('solveBtn').addEventListener('click', solveQuestion);
document.getElementById('speakBtn').addEventListener('click', startSpeechRecognition);
document.getElementById('uploadBtn').addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageUpload(e.target.files[0]);
});

loadAIModelBtn.addEventListener('click', initializeWebLLMEngine);

document.getElementById('testAIFallbackBtn').addEventListener('click', async () => {
    solutionOutput.innerText = "Testing AI (will load model if not already)...";
    showElement(solutionOutput); // Ensure output is visible for test message
    hideElement(graphCanvasElement); // Hide graph during test
    setLoading(true);
    try {
        const res = await generateLLMAnswer("What is the Pythagorean theorem?");
        solutionOutput.innerText = res;
        speakText(res);
        solutionOutput.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } catch (err) {
        solutionOutput.innerText = "AI test failed: " + err.message;
    } finally {
        setLoading(false);
    }
});

// Initial state on page load: hide elements that should only appear later.
// The statusDiv is initially hidden in HTML and shown only when 'Load AI Model' is clicked
// or during AI processing.
hideElement(loadingIndicator);
hideElement(solutionOutput);
hideElement(graphCanvasElement);
