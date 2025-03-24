// Global variables
window.scene = null;
window.camera = null;
window.renderer = null;
window.player = null;
window.controls = null;
window.keys = {};
window.developerMode = false;
window.cameraDistance = 10;
window.cameraAngle = 0;
window.clock = new THREE.Clock(); // Clock for time-based animations
window.gameUpdateFunctions = []; // Array to store game update functions
window.onEnvironmentReady = []; // Callbacks for when environment is ready
let frameCount = 0; // For tracking animation frames

// Wait for window to fully load before initializing
window.addEventListener('load', function() {
    console.log("Window loaded - initializing game...");
    initGame();
});

// Initialize everything
function initGame() {
    console.log("Running game initialization");
    initScene();
    initCamera();
    initRenderer();
    setupEventListeners();
    
    // Initialize environment (this will set up lighting and create the game world)
    try {
        // Call the new environment initialization function
        initializeEnvironment();
        
        // Call any registered environment ready callbacks
        setTimeout(() => {
            if (window.onEnvironmentReady && window.onEnvironmentReady.length > 0) {
                log(`Calling ${window.onEnvironmentReady.length} environment ready callbacks`);
                for (const callback of window.onEnvironmentReady) {
                    try {
                        callback();
                    } catch (error) {
                        console.error("Error in environment ready callback:", error);
                        log("Error in environment ready callback: " + error.message);
                    }
                }
            }
        }, 1000); // Slight delay to ensure environment is fully set up
    } catch (error) {
        console.error("Error initializing environment:", error);
        log("Error initializing environment: " + error.message);
        createFallbackEnvironment();
    }
    
    // Start the animation loop
    animate();
    console.log("Game initialization complete");
}

// Set up the Three.js scene
function initScene() {
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
    log("Scene created");
}

// Set up the camera
function initCamera() {
    window.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);
    log("Camera created");
}

// Set up the renderer
function initRenderer() {
    window.renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Better shadow quality
    document.getElementById('game-container').appendChild(renderer.domElement);
    log("Renderer created");
}

// Create a fallback environment if loading fails
function createFallbackEnvironment() {
    log("Creating fallback environment...");
    
    // Create basic floor
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({ color: 0xaaffaa })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    scene.add(floor);
    
    // Create basic microtubule
    const tube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 10, 16),
        new THREE.MeshPhongMaterial({ color: 0x00aaff })
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 5, 0);
    scene.add(tube);
    
    // Add basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create fallback player
    createFallbackPlayer();
    
    log("Fallback environment created");
}

// Set up event listeners
function setupEventListeners() {
    // Window resize handler
    window.addEventListener('resize', function() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Keyboard input handling for player movement
    window.addEventListener('keydown', function(event) {
        // Debug logging for key presses
        console.log(`🎮 KEY EVENT: keydown - key: "${event.key}", code: "${event.code}"`);
        
        // Store in global keys object with both key and code for better compatibility
        window.keys[event.key.toLowerCase()] = true;
        if (event.code) {
            window.keys[event.code] = true;
        }
        
        // Special handling for E key - try to dock immediately
        if (event.key.toLowerCase() === 'e' || event.code === 'KeyE') {
            console.log('🎮 KEY EVENT: E key detected - attempting to dock');
            if (typeof window.tryToDock === 'function') {
                console.log('🎮 KEY EVENT: Calling window.tryToDock()');
                window.tryToDock();
            } else {
                console.warn('🎮 KEY EVENT: tryToDock function not found - docking.js may not be loaded correctly');
                // Log all available global functions for debugging
                console.log('🎮 KEY EVENT: Available global functions:', 
                    Object.keys(window).filter(key => typeof window[key] === 'function'));
            }
        }
        
        // Toggle developer mode with T key
        if (event.key.toLowerCase() === 't') {
            window.developerMode = !window.developerMode;
            if (typeof toggleDeveloperMode === 'function') {
                toggleDeveloperMode();
            } else {
                log("Developer mode: " + (window.developerMode ? "ON" : "OFF"));
            }
        }
    });
    
    window.addEventListener('keyup', function(event) {
        window.keys[event.key.toLowerCase()] = false;
        if (event.code) {
            window.keys[event.code] = false;
        }
    });
    
    // Add console command to help with debugging
    window.debugKeys = function() {
        console.log('🎮 Current key states:', window.keys);
    };
    
    log("Event listeners set up");
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Increment frame counter
    frameCount++;
    
    // Calculate delta time for smooth animations
    const delta = window.clock.getDelta();
    
    // Get elapsed time for animations
    const time = window.clock.getElapsedTime() * 1000; // Convert to milliseconds for consistency
    
    // Update microtubule glow effects if the function exists
    if (typeof updateMicrotubulesGlow === 'function') {
        updateMicrotubulesGlow(time);
    }
    
    // Update player if it exists
    if (window.player) {
        // Call functions from controls.js for input handling
        if (typeof processPlayerMovement === 'function') {
            processPlayerMovement();
        } else {
            // Fallback movement if controls.js function not available
            handleFallbackMovement();
        }
        
        // Call function from player.js for camera updates
        if (typeof updatePlayerCamera === 'function') {
            updatePlayerCamera();
        }
    }
    
    // Process any registered game update functions
    if (window.gameUpdateFunctions && window.gameUpdateFunctions.length > 0) {
        console.log("Processing " + window.gameUpdateFunctions.length + " game update functions");
        for (const updateFunc of window.gameUpdateFunctions) {
            try {
                // Log the function name if it's the first few frames
                if (frameCount < 5) {
                    console.log("Calling update function: " + updateFunc.name);
                }
                updateFunc(delta);
            } catch (error) {
                console.error("Error in game update function:", error);
            }
        }
    }
    
    // Render the scene
    renderer.render(scene, camera);
}

// Fallback movement handler
function handleFallbackMovement() {
    if (!window.player) return;
    
    const moveSpeed = 0.1;
    
    if (window.keys['w']) window.player.position.z -= moveSpeed;
    if (window.keys['s']) window.player.position.z += moveSpeed;
    if (window.keys['a']) window.player.position.x -= moveSpeed;
    if (window.keys['d']) window.player.position.x += moveSpeed;
    if (window.keys[' ']) window.player.position.y += moveSpeed;
    if (window.keys['shift']) window.player.position.y -= moveSpeed;
}

// Logging utility
function log(message) {
    const logOutput = document.getElementById('log-output');
    if (logOutput) {
        const logEntry = document.createElement('div');
        logEntry.textContent = message;
        logOutput.appendChild(logEntry);
        logOutput.scrollTop = logOutput.scrollHeight;
        
        // Limit log entries
        while (logOutput.children.length > 50) {
            logOutput.removeChild(logOutput.firstChild);
        }
    }
    console.log(message);
} 