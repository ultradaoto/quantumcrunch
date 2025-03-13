// Camera and input controls - this file handles input processing
// using camera-relative movement for more intuitive controls

// Global control variables
const MIN_ZOOM = 5;      // Minimum zoom distance (closer to player)
const MAX_ZOOM = 30;     // Maximum zoom distance (farther from player)
const CAMERA_HEIGHT = 5; // Default camera height above player

// Process keyboard input for camera controls
function processCameraControls() {
    // Camera orbit with arrow keys
    if (window.keys['ArrowLeft'] || window.keys['arrowleft']) {
        window.cameraAngle += 0.03;
    }
    if (window.keys['ArrowRight'] || window.keys['arrowright']) {
        window.cameraAngle -= 0.03;
    }
    
    // Camera zoom with up/down arrow keys
    if ((window.keys['ArrowUp'] || window.keys['arrowup']) && window.cameraDistance > MIN_ZOOM) {
        window.cameraDistance -= 0.3;
        log(`Zooming in: ${window.cameraDistance.toFixed(1)}`);
    }
    if ((window.keys['ArrowDown'] || window.keys['arrowdown']) && window.cameraDistance < MAX_ZOOM) {
        window.cameraDistance += 0.3;
        log(`Zooming out: ${window.cameraDistance.toFixed(1)}`);
    }
}

// Process all player input
function processPlayerMovement() {
    // First handle camera controls
    processCameraControls();
    
    // Handle player movement with camera-relative controls
    movePlayerWithCameraRelativeControls();
    
    // Check for E key press to dock with microtubules
    checkForDockingKeyPress();
}

// Check for docking key press (E key)
function checkForDockingKeyPress() {
    // Check if the E key is pressed and the tryToDock function exists
    if ((window.keys['KeyE'] || window.keys['e'] || window.keys['E'])) {
        console.log("CONTROLS: E key detected - attempting to dock from controls.js");
        log("E key pressed - attempting to dock from controls.js");
        
        // Check if tryToDock exists before calling it
        if (typeof window.tryToDock === 'function') {
            console.log("CONTROLS: Calling window.tryToDock()");
            window.tryToDock();
        } else {
            console.warn("CONTROLS: window.tryToDock function not found! Is docking.js loaded?");
            // Log the available window functions for debugging
            console.log("CONTROLS: Available global functions:", 
                Object.keys(window).filter(key => typeof window[key] === 'function'));
        }
        
        // Reset key state to prevent multiple triggers
        if (window.keys['e']) window.keys['e'] = false;
        if (window.keys['E']) window.keys['E'] = false;
        if (window.keys['KeyE']) window.keys['KeyE'] = false;
    }
}

// Move player using camera-relative coordinate system for more intuitive controls
function movePlayerWithCameraRelativeControls() {
    if (!window.player) return;
    
    const moveSpeed = 0.2;     // Horizontal movement speed
    const liftSpeed = 0.15;    // Vertical movement speed
    const boostMultiplier = window.keys['Control'] || window.keys['control'] ? 2 : 1; // Speed boost
    
    // Calculate forward and right vectors based on camera angle
    const forwardX = -Math.sin(window.cameraAngle);
    const forwardZ = -Math.cos(window.cameraAngle);
    const rightX = Math.cos(window.cameraAngle);
    const rightZ = -Math.sin(window.cameraAngle);
    
    // Reset movement vector
    let moveX = 0;
    let moveZ = 0;
    
    // WASD keys for movement relative to camera orientation
    if (window.keys['KeyW'] || window.keys['w']) {
        moveX += forwardX;
        moveZ += forwardZ;
    }
    if (window.keys['KeyS'] || window.keys['s']) {
        moveX -= forwardX;
        moveZ -= forwardZ;
    }
    if (window.keys['KeyA'] || window.keys['a']) {
        moveX -= rightX;
        moveZ -= rightZ;
    }
    if (window.keys['KeyD'] || window.keys['d']) {
        moveX += rightX;
        moveZ += rightZ;
    }
    
    // Normalize movement vector if moving diagonally
    if (moveX !== 0 || moveZ !== 0) {
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        moveX = moveX / length * moveSpeed * boostMultiplier;
        moveZ = moveZ / length * moveSpeed * boostMultiplier;
        
        // Apply movement
        window.player.position.x += moveX;
        window.player.position.z += moveZ;
        
        // Rotate player to face movement direction if it has children
        if (window.player.children && window.player.children.length > 0) {
            // Calculate target rotation based on movement direction
            const targetRotation = Math.atan2(moveX, moveZ);
            
            // Smoothly interpolate rotation with easing
            const rotationSpeed = 0.1;
            const currentRotation = window.player.rotation.y;
            window.player.rotation.y = currentRotation + 
                (targetRotation - currentRotation) * rotationSpeed;
        }
    }
    
    // Space and Shift for vertical movement
    if (window.keys['Space'] || window.keys[' ']) {
        window.player.position.y += liftSpeed * boostMultiplier;
    }
    if (window.keys['ShiftLeft'] || window.keys['shift']) {
        window.player.position.y -= liftSpeed * boostMultiplier;
    }
}

// Legacy function for backwards compatibility
function handleBasicMovement() {
    movePlayerWithCameraRelativeControls();
} 