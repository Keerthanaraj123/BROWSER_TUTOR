// app.js

// 1. Import WebLLM (use CDN for simplicity in hackathon, or npm install @mlc-ai/web-llm for bundler)
import * as webllm from "https://esm.run/@mlc-ai/web-llm";

// Elements
const questionInput = document.getElementById('questionInput');
const solutionOutput = document.getElementById('solutionOutput');
const loadingIndicator = document.getElementById('loading');
const graphCanvas = document.getElementById('graphCanvas').getContext('2d');
const imageInput = document.getElementById('imageInput');
const statusDiv = document.getElementById('status'); // NEW: Reference to the status div
const loadAIModelBtn = document.getElementById('loadAIModelBtn'); // NEW: Reference to the load button

let synth = window.speechSynthesis;
let chartInstance = null;
let webLLMEngine = null; // Changed from webLLMChat to webLLMEngine
const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC"; // The smaller model we discussed

// 2. Initialize WebLLM Engine (asynchronous)
async function initializeWebLLMEngine() {
    if (webLLMEngine) {
        statusDiv.textContent = `Model "${selectedModel}" already loaded or loading.`;
        return; // Prevent re-initializing if already done
    }

    statusDiv.textContent = `Initializing WebLLM engine and loading model: ${selectedModel}...`;
    loadAIModelBtn.disabled = true; // Disable load button during process

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
        // You might want to enable buttons here if they depend on AI being ready
        // solveBtn.disabled = false; // Example: if solve needs AI, enable it here
        // testAIFallbackBtn.disabled = false;
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

        for await (const chunk of chunks) {
            fullLLMResponse += chunk.choices[0]?.delta?.content || "";
            // Update UI with streamed content as it comes
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


function setLoading(isLoading) {
    loadingIndicator.style.display = isLoading ? 'block' : 'none';
}

function clearGraph() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

// Plot function with Chart.js
function plotFunction(expr) {
    clearGraph();

    const xVals = [];
    const yVals = [];
    for (let x = -10; x <= 10; x += 0.2) {
        xVals.push(x.toFixed(2));
        try {
            // Evaluate function numerically with Algebrite.eval
            // Replace x in expression string with value, then evaluate
            let expStr = expr.replace(/x/g, `(${x})`);
            // Use math.evaluate for plotting, which is more robust for numbers
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
        return;
    }
    setLoading(true);
    clearGraph();

    // Handle plot command: plot sin(x) or plot x^2 + 1
    if (question.toLowerCase().startsWith('plot')) {
        const expr = question.substring(4).trim();
        plotFunction(expr);
        solutionOutput.innerText = `Plotted function: ${expr}`;
        setLoading(false);
        speakText(`Plotted function: ${expr}`);
        return;
    }

    let answer = '';
    let usedAI = false;

    try {
        // --- Try Algebrite first ---
        let algebriteResult = '';
        if (question.toLowerCase().startsWith('integrate(')) {
            const expr = question.match(/integrate\((.*)\)/)[1];
            algebriteResult = Algebrite.run(`integral(${expr})`).toString();
        } else if (question.toLowerCase().startsWith('derivative(')) {
            const expr = question.match(/derivative\((.*)\)/)[1];
            algebriteResult = Algebrite.run(`d(${expr})`).toString();
        } else if (question.toLowerCase().startsWith('solve(')) {
            const eqMatch = question.match(/solve\((.*)\)/)[1];
            // Algebrite solve can be tricky. Try specific forms.
            algebriteResult = Algebrite.run(`roots(${eqMatch})`).toString(); // For single variable equations like x^2 = 4
            if (algebriteResult === '[]' || algebriteResult === '()') {
                 algebriteResult = Algebrite.run(`solve(${eqMatch}, x)`).toString(); // Fallback to solve with variable hint
            }
        } else {
            // Try to evaluate numeric or symbolic expressions directly
            algebriteResult = Algebrite.run(question).toString();
        }

        // Check if Algebrite produced a meaningful answer
        if (algebriteResult && algebriteResult !== '()' && algebriteResult !== '[]' && algebriteResult !== 'undefined') {
            answer = `Algebrite Solution: ${algebriteResult}`;
        } else {
            // --- Fallback to AI using WebLLM ---
            usedAI = true;
            answer = await generateLLMAnswer(question);
        }

    } catch (e) {
        console.warn("Algebrite failed, falling back to AI:", e);
        // Fallback to AI if Algebrite throws an error
        usedAI = true;
        answer = await generateLLMAnswer(question);
    }

    solutionOutput.innerText = answer;
    speakText(answer);
    setLoading(false);
}

// Event listeners
document.getElementById('solveBtn').addEventListener('click', solveQuestion);
document.getElementById('speakBtn').addEventListener('click', startSpeechRecognition);
document.getElementById('uploadBtn').addEventListener('click', () => imageInput.click());
imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) handleImageUpload(e.target.files[0]);
});

// NEW Event Listener for the Load AI Model button
loadAIModelBtn.addEventListener('click', initializeWebLLMEngine);

// Modified Test AI Fallback Button
document.getElementById('testAIFallbackBtn').addEventListener('click', async () => {
    document.getElementById("solutionOutput").innerText = "Testing AI (will load model if not already)...";
    setLoading(true);
    try {
        const res = await generateLLMAnswer("What is the Pythagorean theorem?");
        document.getElementById("solutionOutput").innerText = res;
        speakText(res);
    } catch (err) {
        document.getElementById("solutionOutput").innerText = "AI test failed: " + err.message;
    } finally {
        setLoading(false);
    }
});

// Optional: Automatically load AI model on page load (can be slow, better with button)
// initializeWebLLMEngine();
// For a hackathon, letting the user explicitly click 'Load AI Model' is better for UX.