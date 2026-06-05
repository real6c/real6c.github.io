const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
const statsCanvas = document.getElementById('stats-canvas');
const statsCtx = statsCanvas.getContext('2d');

let width, height;

function resize() {
    width = canvas.width = statsCanvas.width = window.innerWidth;
    height = canvas.height = statsCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function isMobile() {
    return window.innerWidth <= 768;
}


// --- Live Clock & Geolocation ---
function updateClock() {
    const now = new Date();
    const timeEl = document.getElementById('loc-time');
    const dateEl = document.getElementById('loc-date');
    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
    }
    if (dateEl) {
        dateEl.textContent = now.toLocaleDateString('en-GB', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
        });
    }
}
setInterval(updateClock, 1000);
updateClock();

// Robust Location fetching
async function fetchLocation() {
    try {
        let r = await fetch('https://ipapi.co/json/');
        if (r.ok) { let d = await r.json(); if (d.city) return d.city; }
    } catch(e) {}
    try {
        let r = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (r.ok) { let d = await r.json(); if (d.city) return d.city; }
    } catch(e) {}
    try {
        let r = await fetch('https://freeipapi.com/api/json');
        if (r.ok) { let d = await r.json(); if (d.cityName) return d.cityName; }
    } catch(e) {}
    return "unknown";
}

fetchLocation().then(city => {
    let el = document.getElementById('loc-city');
    if (el) el.innerText = city;
});



// --- Data Generation ---
const asciiArt = [
    "  _          _               ____            _ ",
    " | |   _   _| | ____ _ ___  |  _ \\ ___  __ _| |",
    " | |  | | | | |/ / _` / __| | |_) / _ \\/ _` | |",
    " | |__| |_| |   < (_| \\__ \\ |  _ <  __/ (_| | |",
    " |_____\\__,_|_|\\_\\__,_|___/ |_| \\_\\___|\\__,_|_|",
    "                                               "
];

const startupMessages = [
    "[  OK  ] Started System Logging Service.",
    "[  OK  ] Reached target System Initialization.",
    "[  OK  ] Listening on Load/Save RF Kill Switch Status /dev/rfkill Watch.",
    "[  OK  ] Started Daily Cleanup of Temporary Directories.",
    "[  OK  ] Started Dispatch Password Requests to Console Directory Watch.",
    "         Mounting FUSE Control File System...",
    "         Mounting Kernel Configuration File System...",
    "[  OK  ] Mounted FUSE Control File System.",
    "[  OK  ] Mounted Kernel Configuration File System.",
    "[  OK  ] Started udev Kernel Device Manager.",
    "[  OK  ] Started Show Plymouth Boot Screen.",
    "[  OK  ] Reached target Paths.",
    "[  OK  ] Reached target Basic System.",
    "         Starting WPA supplicant...",
    "         Starting User Login Management...",
    "[  OK  ] Started WPA supplicant.",
    "[  OK  ] Started User Login Management.",
    "[  OK  ] Reached target Network.",
    "         Starting Hostname Service...",
    "[  OK  ] Started Hostname Service."
];

const logs = [];
// Generate a massive repeating log of just the startup messages
for (let i = 0; i < 150; i++) {
    logs.push(...startupMessages);
}

// --- Interaction State ---
let mouse = { x: width / 2, y: height / 2 };
let lastMouse = { x: width / 2, y: height / 2 };
let scrollY = window.scrollY;
let lastScrollY = window.scrollY;
let disturbance = 0;

// Terminal printing variables
let targetScroll = 0;
let currentScroll = 0;
let lastLogTime = Date.now();
let nextLogDelay = 100;

// Navigation state
let showBgStats = true;
let statScaleTarget = 1.0;
let statScale = 1.0;
let currentStatOffsetX = null;

// --- System Stats Simulation ---
const sysStats = {
    cpu: Array(8).fill(0).map(() => ({ current: 0, target: 0 })),
    mem: { current: 16.0, target: 16.0, max: 64.0 },
    disk: { used: 616, total: 1000 },
    gpu: { utilCurrent: 0, utilTarget: 0, vramCurrent: 8.0, vramTarget: 8.0, vramMax: 32.0 },
    netTx: Array(25).fill(0),
    netRx: Array(25).fill(0)
};

setInterval(() => {
    // Smoothly interpolate CPU targets
    sysStats.cpu.forEach(c => {
        c.current += (c.target - c.current) * 0.2;
        if (Math.random() < 0.1) c.target = Math.random() * 100;
        else if (Math.random() < 0.05) c.target = 100; // Random spike
        else if (Math.random() < 0.05) c.target = 0; // Random drop
    });

    sysStats.mem.current += (sysStats.mem.target - sysStats.mem.current) * 0.1;
    if (Math.random() < 0.05) sysStats.mem.target = 16 + Math.random() * 32;

    sysStats.gpu.utilCurrent += (sysStats.gpu.utilTarget - sysStats.gpu.utilCurrent) * 0.2;
    if (Math.random() < 0.1) sysStats.gpu.utilTarget = Math.random() * 100;

    sysStats.gpu.vramCurrent += (sysStats.gpu.vramTarget - sysStats.gpu.vramCurrent) * 0.1;
    if (Math.random() < 0.05) sysStats.gpu.vramTarget = 8 + Math.random() * 16;

    // Network speeds (MB/s)
    let newTx = Math.random() < 0.2 ? Math.random() * 50 : Math.random() * 5;
    let newRx = Math.random() < 0.2 ? Math.random() * 100 : Math.random() * 10;
    
    sysStats.netTx.shift();
    sysStats.netTx.push(newTx);
    
    sysStats.netRx.shift();
    sysStats.netRx.push(newRx);
}, 100);

let customCursor = document.getElementById('custom-cursor');

// Hide custom cursor on touch/mobile devices
if ('ontouchstart' in window || isMobile()) {
    if (customCursor) customCursor.style.display = 'none';
}

window.addEventListener('mousemove', (e) => {
    if (isMobile()) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Update custom DOM cursor position
    if (customCursor) {
        customCursor.style.transform = `translate(${e.clientX - 10}px, ${e.clientY - 10}px)`;
    }
    
    // Trigger custom cursor (no more intense disruption)
});

document.addEventListener('mouseleave', () => {
    if (customCursor) customCursor.style.opacity = '0';
});

document.addEventListener('mouseenter', () => {
    if (customCursor) customCursor.style.opacity = '1';
});

// Add link hover effect to custom cursor
document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.menu-item')) {
        let lines = document.getElementById('cursor-lines');
        if (lines) {
            lines.style.opacity = '1';
            lines.style.transform = 'scale(1)';
        }
    }
    
    // Hide UI scanlines for clearer image viewing
    if (e.target.tagName === 'IMG' && e.target.closest('.project-images')) {
        let uiScanlines = document.querySelector('.scanlines-ui');
        if (uiScanlines) uiScanlines.style.opacity = '0';
    }
});

document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.menu-item')) {
        let lines = document.getElementById('cursor-lines');
        if (lines) {
            lines.style.opacity = '0';
            lines.style.transform = 'scale(0.5)';
        }
    }
    
    // Restore UI scanlines
    if (e.target.tagName === 'IMG' && e.target.closest('.project-images')) {
        let uiScanlines = document.querySelector('.scanlines-ui');
        if (uiScanlines) uiScanlines.style.opacity = '0.15';
    }
});

window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
});

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:',.<>?/`~";
function getRandomChar() {
    return chars[Math.floor(Math.random() * chars.length)];
}

// --- Render Loop ---
function draw() {
    // Clear with a dark muted blue background
    ctx.fillStyle = 'rgba(10, 33, 77, 1)'; 
    ctx.fillRect(0, 0, width, height);

    // Calculate velocities
    let dx = mouse.x - lastMouse.x;
    let dy = mouse.y - lastMouse.y;
    let vMouse = Math.sqrt(dx * dx + dy * dy);
    let vScroll = Math.abs(scrollY - lastScrollY);
    
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;
    lastScrollY = scrollY;
    
    // Increase disturbance based on velocity
    let frameVelocity = vMouse + vScroll * 1.5;
    disturbance += frameVelocity * 0.05;
    if (disturbance > 60) disturbance = 60; // Cap disturbance
    
    // Decay disturbance smoothly
    disturbance *= 0.92;
    if (disturbance < 0.1) disturbance = 0;

    ctx.font = '14px "Fira Code", monospace';
    ctx.textBaseline = 'top';
    
    const lineHeight = 20;
    
    // Simulate real terminal printing with bursts and pauses
    if (Date.now() - lastLogTime > nextLogDelay) {
        // Jump by a random number of lines instantly
        let linesToJump = Math.floor(Math.random() * 6) + 1;
        currentScroll += linesToJump * lineHeight;
        lastLogTime = Date.now();
        
        // Fully random delay for that authentic chaotic terminal feel
        let r = Math.random();
        if (r < 0.75) {
            nextLogDelay = Math.random() * 80 + 10;     // 75% chance: super fast (10-90ms)
        } else if (r < 0.95) {
            nextLogDelay = Math.random() * 300 + 100;   // 20% chance: slight pause (100-400ms)
        } else {
            nextLogDelay = Math.random() * 1000 + 500;  // 5% chance: heavy system hang (500-1500ms)
        }
    }
    
    const scrollOffset = scrollY * 0.5 + currentScroll; 
    const totalHeight = logs.length * lineHeight;

    for (let i = 0; i < logs.length; i++) {
        let line = logs[i];
        
        // Calculate Y with parallax, auto-scroll, and infinite wrap-around
        let rawY = (i * lineHeight) - scrollOffset;
        let y = ((rawY % totalHeight) + totalHeight) % totalHeight;
        
        // Only draw if visible on screen
        if (y > -lineHeight && y < height + lineHeight) {
            
            // --- Position ---
            let idleWarpX = Math.sin(Date.now() / 1500 + y * 0.02) * 15;
            let distToMouseY = Math.abs(y - mouse.y);
            let radius = 300; // Radius for glitch effects
            
            let finalX = 20 + idleWarpX; // Constant wave only
            let finalY = y;

            // Dimmer blue-white for background logs so the title stands out
            ctx.fillStyle = '#556688';
            ctx.shadowBlur = 0; 
            ctx.shadowColor = 'transparent';
            
            ctx.fillText(line, finalX, finalY);
        }
    }

    // --- Draw ASCII Art (Fixed at top, 1x size) ---
    const asciiLineHeight = 18;
    const asciiScrollOffset = scrollY * 0.3; // Slower parallax for the main title
    
    // Draw a dark semi-transparent underlay with a feathered gradient
    let bgHeight = 20 + (asciiArt.length * asciiLineHeight) + 20;
    let gradient = ctx.createLinearGradient(0, 0, 0, bgHeight);
    gradient.addColorStop(0, 'rgba(10, 33, 77, 0.95)'); // Solid dark top
    gradient.addColorStop(0.7, 'rgba(10, 33, 77, 0.7)'); // Still fairly dark
    gradient.addColorStop(1, 'rgba(10, 33, 77, 0)');    // Feather out to transparent
    
    ctx.fillStyle = gradient;
    ctx.shadowBlur = 0;
    ctx.fillRect(0, 0, width, bgHeight);

    // --- Draw Transparent Feathered Dark Shadow for Project View ---
    if (document.body.classList.contains('project-view')) {
        let paneRightEl = document.querySelector('.pane-right');
        if (paneRightEl) {
            let pRect = paneRightEl.getBoundingClientRect();
            let cx = pRect.left + pRect.width / 2;
            let cy = pRect.top + pRect.height / 2;
            
            // Replicate the CSS shadow: 300px spread + 300px blur = ~600px radius before scale
            let radius = 600 * statScale; 
            
            if (radius > 0) {
                let rGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                // Solid center, feathering out over the outer half
                rGrad.addColorStop(0, 'rgba(5, 10, 25, 0.85)');
                rGrad.addColorStop(0.5, 'rgba(5, 10, 25, 0.85)');
                rGrad.addColorStop(1, 'rgba(5, 10, 25, 0)');
                
                ctx.fillStyle = rGrad;
                ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
            }
        }
    }

    statsCtx.clearRect(0, 0, width, height);

    // --- Draw BG Stats (right side, underneath/behind globe) ---
    if (showBgStats && !isMobile()) {
        // Smoothly interpolate scale to match CSS transition
        statScale += (statScaleTarget - statScale) * 0.12;

        let globeEl = document.getElementById('globe-ascii');
        if (globeEl) {
            let rect = globeEl.getBoundingClientRect();
            
            // X Calculations
            let targetOffsetX = document.body.classList.contains('project-view') 
                ? (100 * statScale) 
                : (((width - rect.right) / 2) - (147 * statScale));
            
            if (currentStatOffsetX === null) {
                currentStatOffsetX = targetOffsetX;
            }
            
            // Smoothly interpolate the offset relative to the globe
            currentStatOffsetX += (targetOffsetX - currentStatOffsetX) * 0.12;
            
            let finalStatX = rect.right + currentStatOffsetX;

            // Y Calculations
            let globeCenterY = rect.top + (rect.height / 2);
            let statYBase = globeCenterY - (88 * statScale); 

            drawSystemStats(statsCtx, finalStatX, statYBase, statScale);
        }
    }

    requestAnimationFrame(draw);
}

// Start loop
draw();

// --- Spinning ASCII Globe (Three.js) ---
function initGlobe() {
  window.WIDTH = 48;
  window.HEIGHT = 48;
  window.scene = new THREE.Scene();
  window.camera = new THREE.PerspectiveCamera(1, window.WIDTH / window.HEIGHT, 0.1, 1000);
  window.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  window.renderer.setSize(window.WIDTH, window.HEIGHT);

  // Hide the WebGL canvas robustly using inline styles so it still renders for readPixels
  // but doesn't show up as a second gray globe.
  window.renderer.domElement.style.position = 'absolute';
  window.renderer.domElement.style.visibility = 'hidden';
  window.renderer.domElement.style.pointerEvents = 'none';
  window.renderer.domElement.style.zIndex = '-9999';

  // Add canvas to pane-globe
  document.querySelector('.pane-globe').appendChild(window.renderer.domElement);

  var texture = new THREE.TextureLoader().load('data:image/jpeg;base64,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');

  var geometry = new THREE.SphereGeometry( 3, 64, 48 );
  var material = new THREE.MeshStandardMaterial( {
    color: 0xffffff,
    emissive: 0x000000,
    roughness: 1,
    metalness: 1,
    map: texture
  });
  
  window.globe = new THREE.Mesh( geometry, material );
  window.globe.rotation.z = Math.PI;
  window.globe.rotation.y = 1.5;
  window.scene.add( window.globe );

  var light = new THREE.PointLight( 0xffffff, 3.33, 0 );
  light.position.set( 150, -150, 1500 );
  window.scene.add( light );
  
  var light2 = new THREE.PointLight(0xffffff, 2, 0);
  light2.position.set(-125, 100, -500);
  window.scene.add(light2);

  window.camera.position.z = 345;
  window.gl = window.renderer.context;
  window.pixels = new Uint8Array(window.gl.drawingBufferWidth * window.gl.drawingBufferHeight * 4);

  window.globeAsciiElement = document.getElementById("globe-ascii");
  window.ASCII = "   ·—+=##";
  
  renderGlobe();
}

function renderGlobe() {
  requestAnimationFrame(renderGlobe);
  window.globe.rotation.y -= 0.01;
  window.renderer.render(window.scene, window.camera);
  window.gl.readPixels(0, 0, window.WIDTH, window.HEIGHT, window.gl.RGBA, window.gl.UNSIGNED_BYTE, window.pixels);
  
  var text = grayscale10(window.pixels).map(asciify).join("");
  text = text.split("\n").map(reverseString).join("\n");
  window.globeAsciiElement.innerHTML = text;
}

function reverseString(str) {
  return str.split("").reverse().join("");
}

function grayscale10(pixels) {
  var length = pixels.length;
  var gsPixels = [];
  for (var i = 0; i < length; i += 4) {
    gsPixels.push(
      Math.floor(
        (pixels[i] + pixels[i+1] + pixels[i+2]) / 768 * window.ASCII.length
      )
    );
  }
  return gsPixels;
}

function asciify(val, index) {
  var br = "";
  if (index !== 0 && index % window.WIDTH === 0) {
    br = "\n";
  }
  return br + window.ASCII[val];
}

initGlobe();

// --- Typing Animation on Load ---
function initTypingAnimation() {
    const menuHelp = document.getElementById('menu-help');
    const menuItems = document.querySelectorAll('.menu-item');
    const bottomPrompt = document.getElementById('menu-prompt-bottom');
    
    if (!menuHelp || !bottomPrompt || menuItems.length === 0) return;
    
    // Extract original texts and hide items immediately to prevent flashes
    const itemsData = Array.from(menuItems).map(item => {
        const text = item.textContent.trim();
        item.textContent = "";
        item.style.visibility = 'hidden';
        return { element: item, text: text };
    });
    
    // Hide help text and bottom prompt initially
    menuHelp.style.opacity = '0';
    bottomPrompt.style.display = 'none';
    
    // 1. Fade in the help text after a brief initial pause
    setTimeout(() => {
        menuHelp.style.transition = 'opacity 0.3s ease';
        menuHelp.style.opacity = '1';
        
        // 2. Start typing the items sequentially
        typeItemsSequentially(itemsData, 0, () => {
            // 3. Show the bottom prompt after all items are typed
            setTimeout(() => {
                bottomPrompt.style.display = 'block';
            }, 300);
        });
    }, 500);
}

function typeItemsSequentially(itemsData, index, onComplete) {
    if (index >= itemsData.length) {
        if (onComplete) onComplete();
        return;
    }
    
    const { element, text } = itemsData[index];
    element.style.visibility = 'visible';
    element.textContent = "";
    
    let charIndex = 0;
    
    function typeChar() {
        if (charIndex < text.length) {
            element.textContent += text[charIndex];
            charIndex++;
            // Typing delay with slight randomness (15ms - 35ms)
            const delay = 15 + Math.random() * 20;
            setTimeout(typeChar, delay);
        } else {
            // Done typing this item, move to the next after a brief delay
            setTimeout(() => {
                typeItemsSequentially(itemsData, index + 1, onComplete);
            }, 80);
        }
    }
    
    typeChar();
}

// Start typing animation
initTypingAnimation();

// --- Navigation & Routing ---
const routeContentMap = {
    'web_scraped_dataset_proj': `<h2>> webScrapedDataset.py</h2><br>
        <div class="project-desc">
            <p><strong>Description:</strong> A dataset of 40k images created for a robot that sorts different types of recycle: paper, metal, plastic, glass. It achieved <strong>82.40% Top-1 Accuracy</strong> and <strong>97.32% Top-5 Accuracy</strong>.</p>
            <p>The entire dataset is scraped off Bing Images, and cleaned with multiple steps in the pipeline such as watermark removal, banner removal, and finally screened with a VLM model to ensure a clean background and the correct subject.</p>
            <p><strong>Key Learnings:</strong> Optimized CUDA hardware with batching and utilized efficient frameworks to speed up processing thousands of images.</p>
            <br>
            <p><a href="https://huggingface.co/datasets/lreal/BingRecycle40k" target="_blank" class="project-link">[🔗 View on HuggingFace: lreal/BingRecycle40k]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> execution_pipeline.log</h3>
        <pre class="ascii-flowchart">
[ INIT ] -> iCrawler scrapes Bing images of different recycle classes
                  |
                 [v]
[ PROC ] -> Remove duplicate images using MD5 hash comparison
                  |
                 [v]
[ PROC ] -> Remove watermark banners from bottom of images
                  |
                 [v]
[ INFR ] -> Run watermark detection inference on dataset and generate masks
                  |
                 [v]
[ PROC ] -> Remove watermarks using LAMA inpainting using masks
                  |
                 [v]
[ INFR ] -> Use local VLM with Ollama API to rate images pass/fail on 
            different criteria, generate json files for each image
                  |
                 [v]
[ EXPT ] -> Format dataset for YOLO cls and use json data to choose whether
            to keep image or use it in less quality-critical test dataset
        </pre>
        <br>
        <h3 style="color: #556688;">> output_visualizations/</h3>
        <div class="project-images">
            <img src="assets/web_scraped_dataset_proj/confusion_matrix_normalized.png" alt="Confusion Matrix">
            <img src="assets/web_scraped_dataset_proj/val_batch0_pred.jpg" alt="Validation Batch Predictions">
        </div>`,
    'deepstream_yolo_classification_proj': `<h2>> deepstreamYoloClassification.cpp</h2><br>
        <div class="project-desc">
            <p><strong>Description:</strong> A production-ready YOLO11x classification system for Jetson devices using NVIDIA DeepStream SDK 7.0, packaged in Docker for easy deployment and development.</p>
            <p>This system was specifically designed for inference with the <strong>BingRecycle40k</strong> dataset on a Jetson Orin Nano Super. It achieved an impressive <strong>30+ FPS</strong> on a single camera stream.</p>
            <p><strong>Technical Challenge:</strong> DeepStream SDK does not natively support YOLO classification out of the box (it only supports detection/bounding boxes). To achieve optimal hardware-accelerated inference runtime for this use case, I wrote a custom C++ parsing plugin from scratch.</p>
            <br>
            <p><a href="https://github.com/real6c/DeepstreamYoloClassify" target="_blank" class="project-link">[🔗 View on GitHub: real6c/DeepstreamYoloClassify]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> project_structure.tree</h3>
        <pre class="ascii-flowchart">
TrashBotDeepstreamYolo/
├── Dockerfile                          # DeepStream 7.0 container definition
├── build.sh                            # Build the Docker container
├── start.sh                            # Start the container with mounts
├── xServer.sh                          # X11 display setup for GUI
└── DeepStream-Yolo-Classification/     # Main classification system
    ├── run_classification.sh           # Production watchdog script
    ├── build_plugin.sh                 # Build the C++ plugin
    ├── nvdsinfer_custom_impl/          # Custom DeepStream C++ plugin source
    ├── deepstream_app_config.txt       # GStreamer pipeline config
    └── config_infer_primary.txt        # YOLO inference config
        </pre>
        <br>
        <h3 style="color: #556688;">> deployment_specs.json</h3>
        <pre class="ascii-flowchart" style="color: #aaccff; border-left: 2px solid #20dc80;">
{
    "hardware": "Jetpack l4t 36.4.4 Jetson Orin Nano Super",
    "base_image": "nvcr.io/nvidia/l4t-jetpack:r36.3.0",
    "cuda_version": "12.2",
    "tensorrt_version": "8.6",
    "deepstream_version": "7.0",
    "dependencies": [
        "OpenCV", "ONNX", "Ultralytics", 
        "GStreamer", "GLib 2.85.1", "librdkafka"
    ],
    "performance_tuning": {
        "precision": "FP16 Optimal",
        "engine_caching": true,
        "auto_restart_session_timeout": "2 hours"
    }
}
        </pre>`,
    'market_view_proj': `<h2>> marketView.swift</h2><br>
        <div class="project-desc">
            <p><strong>Description:</strong> A native macOS menu bar app for live stock prices and an interactive chart. Built entirely from scratch with Swift, SwiftUI, Swift Charts, and AppKit.</p>
            <p><strong>Motivation:</strong> I wanted the ability to quickly view how a stock was performing directly from my Mac's toolbar. The menu bar continually displays the selected ticker's price, a colored trend indicator, and a mini sparkline.</p>
            <p>Clicking the toolbar reveals a fully interactive popover chart where you can add/remove tickers, set time ranges (1D to 5Y), and click-and-drag across the chart to see the exact percentage change in price between two specific points.</p>
            <br>
            <p><a href="https://github.com/real6c/MarketView" target="_blank" class="project-link">[🔗 View on GitHub: real6c/MarketView]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> project_structure.tree</h3>
        <pre class="ascii-flowchart">
MarketView/
├── Sources/MarketView/
│   ├── main.swift
│   ├── AppDelegate.swift
│   ├── StockService.swift
│   ├── ChartView.swift
│   ├── SearchTickerView.swift
│   ├── SparklineRenderer.swift
│   └── Models.swift
├── Scripts/
│   └── round_icon.swift     # icon.png → rounded PNG (used by package.sh)
├── Package.swift
├── package.sh               # swift build -c release → .app + icon + sign
├── build.sh                 # package.sh, then open MarketView.app
└── MarketView.entitlements  # e.g. network client
        </pre>
        <br>
        <h3 style="color: #556688;">> demo_replays/</h3>
        <div class="project-images">
            <img src="assets/market_view_proj/interact.gif" alt="Interacting with Chart">
            <img src="assets/market_view_proj/addTicker.gif" alt="Adding a Ticker">
        </div>`,
    '3d_modeling_proj': `<h2>> 3D_Modeling.stl</h2><br>
        <div class="project-desc">
            <p><strong>Overview:</strong> Highly proficient in CAD modeling using Fusion 360 (sketching, analysis, generative design) and an expert in Fused Deposition Modeling (FDM) 3D printing. My experience includes dismantling, rebuilding, and heavily modifying 3D printers for maximum speed, as well as mastering various advanced filament materials and their precise slicing parameters.</p>
            <p><strong>MakerWorld Creator:</strong> I've found a successful niche designing custom protective cases for electronic development boards like the Jetson Orin Nano and various Raspberry Pi models. I am a consistently highly-rated creator on the platform.</p>
            <p><strong>Impact:</strong> My open-source hardware designs have accumulated over <strong>18,000+ downloads</strong> and have been successfully printed by over <strong>10,000+ users</strong> worldwide.</p>
            <br>
            <p><a href="https://makerworld.com/en/@lr_f3d" target="_blank" class="project-link">[🔗 View MakerWorld Profile: @lr_f3d]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> makerworld_metrics.json</h3>
        <pre class="ascii-flowchart" style="color: #aaccff; border-left: 2px solid #20dc80;">
{
    "platform": "MakerWorld",
    "username": "@lr_f3d",
    "specialty": "Embedded Hardware & SBC Enclosures",
    "software_stack": [
        "Autodesk Fusion 360",
        "OrcaSlicer / Bambu Studio"
    ],
    "hardware_expertise": [
        "FDM Printer Construction/Modification",
        "High-Speed Kinematics",
        "Advanced Material Parameterization"
    ],
    "metrics": {
        "total_downloads": "> 18,000",
        "successful_prints": "> 10,000",
        "rating": "Consistently Highly Rated"
    }
}
        </pre>
        <br>
        <h3 style="color: #556688;">> render_gallery/</h3>
        <div class="project-images">
            <img src="assets/3d_modeling_proj/jetson_case_cad.png" alt="Jetson Orin Nano CAD Design">
            <img src="assets/3d_modeling_proj/jetson_case.jpeg" alt="Jetson Orin Nano Physical Print">
            <img src="assets/3d_modeling_proj/rpi_5_case.png" alt="Raspberry Pi 5 Case">
            <img src="assets/3d_modeling_proj/rpi_zero_case.png" alt="Raspberry Pi Zero Case">
        </div>`,
    'experience': `<h2>> experience.csv</h2><br>
        <div class="project-desc">
            <h3 style="color: #556688; margin-bottom: 10px;">> parse_experience()</h3>
            <table class="csv-table">
                <tr><th>ROLE</th><th>ORGANIZATION</th><th>TIMELINE</th></tr>
                <tr><td class="hl-green">ML Operations Engineer</td><td>Spyglaz AI</td><td class="hl-dim">Mar 2025 - Present</td></tr>
                <tr><td colspan="3" class="desc-cell">Manage financial performance predictive pipeline for monthly deliverables. Oversee AWS security/integrity. Generate model performance reports. Assisted with agentic AI product (full-stack). Manage AWS DevOps and reduce spending.</td></tr>

                <tr><td class="hl-green">President and Founder</td><td>CSM Robotics</td><td class="hl-dim">Sep 2024 - May 2026</td></tr>
                <tr><td colspan="3" class="desc-cell">Founded and led a 20+ member robotics team, securing thousands in institutional funding. Engineered edge inference and architecture using NVIDIA Jetson Deepstream and ODrive. Developed automated data pipeline (web scraping, VLM screening) for 40k+ image dataset.</td></tr>

                <tr><td class="hl-green">Code Coach</td><td>The Coder School</td><td class="hl-dim">Apr 2024 - May 2026</td></tr>
                <tr><td colspan="3" class="desc-cell">Tutor students of all levels in Python and Scratch. Lead summer camp instructor and mentor for robotics/advanced projects.</td></tr>
                
                <tr><td class="hl-green">Software Lead / VP</td><td>Hillsdale High School Robotics</td><td class="hl-dim">Aug 2020 - May 2024</td></tr>
                <tr><td colspan="3" class="desc-cell">Vice President of Robotics Team. GCER international champions 2021. Software Lead.</td></tr>
            </table>
            <br>
            <h3 style="color: #556688; margin-bottom: 10px;">> parse_education()</h3>
            <table class="csv-table">
                <tr><th>DEGREE</th><th>INSTITUTION</th><th>TIMELINE</th></tr>
                <tr><td class="hl-green">B.S. Computer Engineering</td><td>UC San Diego</td><td class="hl-dim">Sep 2026 - Jun 2028</td></tr>
                <tr><td colspan="3" class="desc-cell">Incoming CSE transfer student starting Fall 2026.</td></tr>

                <tr><td class="hl-green">A.S. Computer & Info Sci, Math, Physics</td><td>College of San Mateo</td><td class="hl-dim">Jan 2021 - May 2026</td></tr>
                <tr><td colspan="3" class="desc-cell">3.91 GPA. Elected Associated Students Senator. Officer for Google Developer Group. Organized high-turnout STEM educational mixer.</td></tr>
            </table>
        </div>`,
    'skills': `<h2>> skills.txt</h2><br>
        <pre class="ascii-flowchart" style="white-space: pre-wrap; color: #aaccff; font-size: 0.9rem;">
[ LANGUAGES ]
Python, Java, C/C++ (Experience teaching these languages)

[ MACHINE LEARNING & CV ]
PyTorch, TensorFlow, Ultralytics YOLO.
Experience fine-tuning and deploying CV models.
Creating reliable ML training environments and custom datasets.

[ ROBOTICS & HARDWARE ]
Raspberry Pi, Arduino.
Circuits + FPGA experience.
NVIDIA SDK/hardware, optimized CUDA runtime.

[ CAD & MANUFACTURING ]
Fusion 360, 3D Printing (FDM).

[ SYSTEMS & DEVOPS ]
Linux-based systems.
AWS DevOps.

[ LEADERSHIP ]
Experienced leader in team coordination (robotics) and organizational governance (senate).
        </pre>`,
    'contact': `<h2>> contact.vcf</h2><br>
        <div class="project-desc">
            <h3 style="color: #556688; margin-bottom: 10px;">> parse_vcard("contact.vcf")</h3>
            <table class="csv-table" style="max-width: 600px;">
                <tr><td class="hl-green" style="width: 150px;">Name</td><td>Lukas Real</td></tr>
                <tr><td class="hl-green">Title</td><td>Computer Engineering Student (UCSD)</td></tr>
                <tr><td class="hl-green">Availability</td><td class="hl-dim">On-site in Copenhagen through mid August 2026</td></tr>
                <tr><td class="hl-green">Email</td><td><a href="mailto:lukashreal@gmail.com" class="project-link">lukashreal@gmail.com</a></td></tr>
            </table>
            <br><br>
            <h3 style="color: #556688; margin-bottom: 10px;">> get_network_links()</h3>
            <p>
                <a href="https://linkedin.com/in/lukas-real-763587346/" target="_blank" class="project-link" style="font-size: 1.1rem;">[🔗 LinkedIn Profile]</a><br><br>
                <a href="https://github.com/real6c" target="_blank" class="project-link" style="font-size: 1.1rem;">[🔗 GitHub Portfolio]</a><br><br>
                <a href="https://makerworld.com/en/@lr_f3d" target="_blank" class="project-link" style="font-size: 1.1rem;">[🔗 MakerWorld Models]</a>
            </p>
        </div>`,
    'rpi_usb_cam_proj': `<h2>> raspberryPiUSBCamera.sh</h2><br>
        <div class="project-desc">
            <p><strong>Description:</strong> Developed to transform a Raspberry Pi Zero and Pi Camera Module 3 into a plug-and-play, high-quality USB webcam.</p>
            <p>Through this project, I gained hands-on experience with Linux kernel modules (configfs, libcomposite), the UVC gadget driver architecture, and low-level systems programming. I successfully optimized the camera pipeline utilizing various encoding formats (such as YUV420p, MJPEG, NV12, and H.264) to achieve crystal-clear 1080p 60fps video quality.</p>
            <br>
            <p><a href="https://gist.github.com/real6c/391447b194af58e42ebbf5e1d2e018d9" target="_blank" class="project-link">[🔗 View Script Gist]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> install_rpi_uvc.sh</h3>
        <pre class="ascii-flowchart" style="color: #aaccff; border-left: 2px solid #20dc80; white-space: pre-wrap; font-size: 0.85rem;">
#!/bin/bash

RED='\\033[0;31m'
GREEN='\\033[0;32m'
PURPLE='\\033[0;35m'
NC='\\033[0m'
TARGET_USER=\$(logname)

# Check if running in bash
if [ -z "\$BASH_VERSION" ]; then
  echo -e "\${RED}Please run this script with bash.\${NC}" >&2
  exit 1
fi

# Check if running with root
if [[ "\$EUID" -ne 0 ]]; then
  echo -e "\${RED}Please run this script with sudo or as root.\${NC}" >&2
  exit 1
fi

echo -e "\${GREEN}You are root. Continuing...\${NC}"

# Update apt packages
echo -e "\${PURPLE}Updating apt packages...\${NC}"
sudo apt update
sudo apt full-upgrade -y

# Configure raspberry pi for OTG
echo -e "\${PURPLE}Configuring raspberry pi for OTG...\${NC}"
echo "dtoverlay=dwc2,dr_mode=otg" | sudo tee -a /boot/firmware/config.txt

# Install prerequisite packages
echo -e "\${PURPLE}Installing prerequisite packages...\${NC}"
sudo apt install git meson libcamera-dev libjpeg-dev -y

# Clone UVC repo and build/install
echo -e "\${PURPLE}Setting up UVC...\${NC}"
git clone https://gitlab.freedesktop.org/camera/uvc-gadget.git
cd uvc-gadget
make uvc-gadget
cd build
sudo meson install
sudo ldconfig

# Create startup script
echo -e "\${PURPLE}Creating startup script...\${NC}"
cat << 'ENDOFFILE' > /home/\$TARGET_USER/.rpi-uvc-gadget.sh
#!/bin/bash
# Variables we need to make things easier later on.
CONFIGFS="/sys/kernel/config"
GADGET="\$CONFIGFS/usb_gadget"
VID="0x0525"
PID="0xa4a2"
SERIAL="0123456789"
MANUF=\$(hostname)
PRODUCT="UVC Gadget"
BOARD=\$(strings /proc/device-tree/model)
UDC=\`ls /sys/class/udc\` # will identify the 'first' UDC
# Later on, this function is used to tell the usb subsystem that we want
# to support a particular format, framesize and frameintervals
create_frame() {
	# Example usage:
	# create_frame <function name> <width> <height> <format> <name> <intervals>
	FUNCTION=\$1
	WIDTH=\$2
	HEIGHT=\$3
	FORMAT=\$4
	NAME=\$5
	wdir=functions/\$FUNCTION/streaming/\$FORMAT/\$NAME/\${HEIGHT}p
	mkdir -p \$wdir
	echo \$WIDTH > \$wdir/wWidth
	echo \$HEIGHT > \$wdir/wHeight
	echo \$(( \$WIDTH * \$HEIGHT * 2 )) > \$wdir/dwMaxVideoFrameBufferSize
	cat <<EOF > \$wdir/dwFrameInterval
\$6
EOF
}
# This function sets up the UVC gadget function in configfs and binds us
# to the UVC gadget driver.
create_uvc() {
	CONFIG=\$1
	FUNCTION=\$2
	echo "	Creating UVC gadget functionality : \$FUNCTION"
	mkdir functions/\$FUNCTION
	create_frame \$FUNCTION 640 480 uncompressed u "333333
416667
500000
666666
1000000
1333333
2000000
"
	create_frame \$FUNCTION 1280 720 uncompressed u "1000000
1333333
2000000
"
	create_frame \$FUNCTION 1920 1080 uncompressed u "2000000"
	create_frame \$FUNCTION 640 480 mjpeg m "333333
416667
500000
666666
1000000
1333333
2000000
"
	create_frame \$FUNCTION 1280 720 mjpeg m "333333
416667
500000
666666
1000000
1333333
2000000
"
	create_frame \$FUNCTION 1920 1080 mjpeg m "333333
416667
500000
666666
1000000
1333333
2000000
"
	mkdir functions/\$FUNCTION/streaming/header/h
	cd functions/\$FUNCTION/streaming/header/h
	ln -s ../../uncompressed/u
	ln -s ../../mjpeg/m
	cd ../../class/fs
	ln -s ../../header/h
	cd ../../class/hs
	ln -s ../../header/h
	cd ../../class/ss
	ln -s ../../header/h
	cd ../../../control
	mkdir header/h
	ln -s header/h class/fs
	ln -s header/h class/ss
	cd ../../../
	# This configures the USB endpoint to allow 3x 1024 byte packets per
	# microframe, which gives us the maximum speed for USB 2.0. Other
	# valid values are 1024 and 2048, but these will result in a lower
	# supportable framerate.
	echo 2048 > functions/\$FUNCTION/streaming_maxpacket
	ln -s functions/\$FUNCTION configs/c.1
}
# This loads the module responsible for allowing USB Gadgets to be
# configured through configfs, without which we can't connect to the
# UVC gadget kernel driver
echo "Loading composite module"
modprobe libcomposite
# This section configures the gadget through configfs. We need to
# create a bunch of files and directories that describe the USB
# device we want to pretend to be.
if
[ ! -d \$GADGET/g1 ]; then
	echo "Detecting platform:"
	echo "  board : \$BOARD"
	echo "  udc   : \$UDC"
	echo "Creating the USB gadget"
	echo "Creating gadget directory g1"
	mkdir -p \$GADGET/g1
	cd \$GADGET/g1
	if
[ \$? -ne 0 ]; then
		echo "Error creating usb gadget in configfs"
		exit 1;
	else
		echo "OK"
	fi
	echo "Setting Vendor and Product ID's"
	echo \$VID > idVendor
	echo \$PID > idProduct
	echo "OK"
	echo "Setting English strings"
	mkdir -p strings/0x409
	echo \$SERIAL > strings/0x409/serialnumber
	echo \$MANUF > strings/0x409/manufacturer
	echo \$PRODUCT > strings/0x409/product
	echo "OK"
	echo "Creating Config"
	mkdir configs/c.1
	mkdir configs/c.1/strings/0x409
	echo "Creating functions..."
	create_uvc configs/c.1 uvc.0
	echo "OK"
	echo "Binding USB Device Controller"
	echo \$UDC > UDC
	echo "OK"
fi
# Run uvc-gadget. The -c flag sets libcamera as a source, arg 0 selects
# the first available camera on the system. All cameras will be listed,
# you can re-run with -c n to select camera n or -c ID to select via
# the camera ID.
uvc-gadget -c 0 uvc.0
ENDOFFILE

# Make script executable
echo -e "\${PURPLE}Configuring executable script...\${NC}"
sudo chmod +x /home/\$TARGET_USER/.rpi-uvc-gadget.sh

# Create startup service
echo -e "\${PURPLE}Creating startup service...\${NC}"
cat << EOF > /etc/systemd/system/uvc-gadget.service
[Unit]
Description=Start UVC Gadget on Boot
After=multi-user.target
[Service]
Type=simple
ExecStart=/home/\$TARGET_USER/.rpi-uvc-gadget.sh
Restart=on-failure
[Install]
WantedBy=multi-user.target
EOF

# Enable service and reboot
echo -e "\${PURPLE}Starting service and rebooting...\${NC}"
sudo systemctl enable uvc-gadget.service
sudo systemctl start uvc-gadget.service

echo -e "\${PURPLE}Rebooting in 5 seconds...\${NC}"
sleep 5

sudo reboot
        </pre>`,
    'csi_wifi_sense_proj': `<h2>> CSI_WiFi_Sense.py</h2><br>
        <div class="project-desc">
            <p><strong>Description:</strong> A proof-of-concept AI system that predicts the physical position of a human in a room using only Wi-Fi waves. Because the human body is mostly water, it noticeably absorbs and reflects Radio Frequency (RF) signals. By analyzing these interference patterns in Channel State Information (CSI) data, the neural network learns to map RF disruptions directly to physical room coordinates.</p>
            <p><strong>Methodology:</strong> I captured synchronized CSI data (via an ESP32) and webcam footage. A computer vision segmentation model extracted the human's "ground truth" position from the video. The network was then trained to predict this ground truth using strictly the raw, invisible CSI data.</p>
            <p><strong>Hardware Setup:</strong> A Wi-Fi router, an ESP32 receiver, and a packet transmitting device arranged in a static triangle configuration.</p>
            <br>
            <p><a href="https://github.com/real6c/WiFi-Sense" target="_blank" class="project-link">[🔗 View on GitHub: real6c/WiFi-Sense]</a></p>
        </div>
        <br>
        <h3 style="color: #556688;">> execution_pipeline.log</h3>
        <pre class="ascii-flowchart">
[ INIT ] -> Flash ESP32 and place Router, ESP32, & Tx Device in static triangle
              |
             [v]
[ SYNC ] -> Run collect_data.py to gather synchronized CSI & webcam feeds
              |
             [v]
[ CV   ] -> Run segmentation_infer.py to generate ground truth positioning
              |
             [v]
[ TRAIN] -> Train neural network mapping raw CSI data -> CV segmentation
              |
             [v]
[ INFR ] -> Real-time live inference of human position using only Wi-Fi waves
        </pre>
        <br>
        <h3 style="color: #556688;">> live_inference_demo.gif</h3>
        <div class="project-images">
            <img src="assets/csi_wifi_sense_proj/csi_sense_demo.gif" alt="CSI WiFi Sense Live Inference Demo">
        </div>`
};

function initNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const route = item.getAttribute('data-route');
            if (!route) return;
            
            if (route === 'home') {
                window.location.hash = '';
            } else {
                window.location.hash = '/' + route;
            }
        });
    });

    window.addEventListener('hashchange', handleRouteChange);
    
    // Check initial route
    setTimeout(handleRouteChange, 100);
}

function handleRouteChange() {
    const hash = window.location.hash.replace('#/', '');
    const contentContainer = document.getElementById('project-content-container');
    const projectPane = document.getElementById('pane-project-content');
    
    if (!hash || hash === '') {
        // Return home
        document.body.classList.remove('project-view');
        projectPane.style.opacity = '0';
        setTimeout(() => {
            projectPane.style.display = 'none';
        }, isMobile() ? 0 : 500);

        // On mobile, ensure pane-right is visible again
        if (isMobile()) {
            let paneRight = document.querySelector('.pane-right');
            if (paneRight) paneRight.style.display = '';
            window.scrollTo(0, 0);
        }
        
        statScaleTarget = 1.0;
        currentStatOffsetX = -200 * statScale; // Snap behind globe to slide out
    } else {
        // Navigate to project
        contentContainer.innerHTML = routeContentMap[hash] || '<h2>Not Found</h2><p>Project not found.</p>';

        if (isMobile()) {
            // Mobile: instant swap, hide menu, show project full-screen
            document.body.classList.add('project-view');
            projectPane.style.display = 'flex';
            projectPane.style.opacity = '1';
            window.scrollTo(0, 0);
        } else if (document.body.classList.contains('project-view')) {
            // Desktop: Already in project view, just swap content smoothly
            projectPane.style.opacity = '0';
            setTimeout(() => {
                contentContainer.innerHTML = routeContentMap[hash] || '<h2>Not Found</h2><p>Project not found.</p>';
                projectPane.style.opacity = '1';
            }, 500);
        } else {
            // Desktop: Animating from home to project
            document.body.classList.add('project-view');
            statScaleTarget = 0.65;
            currentStatOffsetX = -200 * statScale; // Snap behind globe to slide out
            projectPane.style.display = 'flex';
            // Slight delay to allow display: flex to apply before transitioning opacity
            setTimeout(() => {
                projectPane.style.opacity = '1';
            }, 50);
        }
    }
}

initNavigation();

// --- Dynamic System Stats Drawing Function ---
function drawSystemStats(ctx, x, y, scale = 1.0) {
    let fontSize = Math.round(10 * scale);
    ctx.font = `${fontSize}px "Fira Code", monospace`;
    ctx.fillStyle = '#20dc80';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(32, 220, 128, 0.6)';

    const lineHeight = 14 * scale;
    let currY = y;

    // Helper function to draw a progress bar
    const drawBar = (label, value, max, widthChars, formatVal, suffix) => {
        let percent = value / max;
        let filledChars = Math.round(percent * widthChars);
        let bar = '[';
        for (let i = 0; i < widthChars; i++) {
            bar += (i < filledChars) ? '|' : ' ';
        }
        bar += ']';
        
        let text = `${label.padEnd(5)} ${bar} ${formatVal(value)}${suffix}`;
        ctx.fillText(text, x, currY);
        currY += lineHeight;
    };

    ctx.fillText("SYSTEM MONITOR - LSI.ARCH", x, currY);
    currY += lineHeight * 1.5;

    // CPU (8 threads in 2 columns)
    for (let i = 0; i < 4; i++) {
        let c1 = sysStats.cpu[i].current;
        let c2 = sysStats.cpu[i+4].current;
        
        let p1 = Math.round((c1/100)*10);
        let b1 = '[' + '|'.repeat(p1) + ' '.repeat(10-p1) + ']';
        let t1 = `CPU0${i}   ${b1} ${Math.round(c1).toString().padStart(3, ' ')}%`;

        let p2 = Math.round((c2/100)*10);
        let b2 = '[' + '|'.repeat(p2) + ' '.repeat(10-p2) + ']';
        let t2 = `CPU0${i+4}   ${b2} ${Math.round(c2).toString().padStart(3, ' ')}%`;
        
        ctx.fillText(`${t1}   ${t2}`, x, currY);
        currY += lineHeight;
    }

    currY += lineHeight * 0.5;

    // Memory & Disk
    drawBar("MEM", sysStats.mem.current, sysStats.mem.max, 25, v => v.toFixed(1).padStart(4) + " / " + sysStats.mem.max.toFixed(1), " GB");
    drawBar("DSK", sysStats.disk.used, sysStats.disk.total, 25, v => v.toString().padStart(4) + " / " + sysStats.disk.total.toString(), " GB");

    currY += lineHeight * 0.5;

    // GPU
    drawBar("GPU", sysStats.gpu.utilCurrent, 100, 25, v => Math.round(v).toString().padStart(3), " %");
    drawBar("VRM", sysStats.gpu.vramCurrent, sysStats.gpu.vramMax, 25, v => v.toFixed(1).padStart(4) + " / " + sysStats.gpu.vramMax.toFixed(1), " GB");

    currY += lineHeight * 0.5;

    // Network Sparklines
    const sparkChars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    
    const drawSparkline = (label, dataArray) => {
        let maxVal = Math.max(...dataArray, 1); // Avoid div by 0
        let spark = '';
        for (let i = 0; i < dataArray.length; i++) {
            let idx = Math.floor((dataArray[i] / maxVal) * 7);
            spark += sparkChars[Math.min(idx, 7)];
        }
        let currentSpeed = dataArray[dataArray.length - 1].toFixed(1).padStart(5);
        ctx.fillText(`${label} [${spark}] ${currentSpeed} MB/s`, x, currY);
        currY += lineHeight;
    };

    drawSparkline("TX ", sysStats.netTx);
    drawSparkline("RX ", sysStats.netRx);
}
