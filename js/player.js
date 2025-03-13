// Player variables
let player;
let playerSpeed = 0.2; // Increased from 0.1 to 0.2 for better responsiveness
let playerRotationSpeed = 0.05;
let playerVelocity = new THREE.Vector3();
let targetVelocity = new THREE.Vector3();
let playerDirection = new THREE.Vector3(0, 0, -1);
let playerBoundary; // Reference to the player's collision boundary
let playerBoundarySize = 1.2; // Size of the player's hexagonal boundary
let lastPosition = new THREE.Vector3(); // Track previous position for collision recovery

// Create the player character
function createPlayer() {
    // Create a temporary placeholder for the player
    const tempGeometry = new THREE.SphereGeometry(1, 16, 16);
    const tempMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tempPlayer = new THREE.Mesh(tempGeometry, tempMaterial);
    tempPlayer.position.set(0, 5, 5);
    scene.add(tempPlayer);
    
    log("Temporary player created, loading CaMKII model...");
    
    // Load the actual CaMKII model
    try {
        const loader = new THREE.GLTFLoader();
        loader.load(
            'assets/models/camkii.glb',
            function(gltf) {
                log("CaMKII model loaded successfully");
                
                // Remove temporary player if it exists
                if (tempPlayer && tempPlayer.parent) {
                    scene.remove(tempPlayer);
                }
                
                // Set up the model
                const model = gltf.scene;
                
                // FIXED: Proper scaling for CaMKII model (adjusted from 0.001)
                model.scale.set(0.01, 0.01, 0.01); // 10x larger for better visibility
                model.position.set(0, 0, 0);
                
                // Define the "front" orientation of the model
                model.rotation.set(0, Math.PI, 0); // Rotate 180 degrees to define front
                
                // Create a group to hold the model and enable rotation
                const playerGroup = new THREE.Group();
                playerGroup.add(model);
                
                // Add a point light to the model to ensure it's always lit
                const modelLight = new THREE.PointLight(0xffffff, 1.2, 5); // Increased intensity
                modelLight.position.set(0, 1, 0); // Positioned slightly above the model
                playerGroup.add(modelLight);
                
                // Position the player group at the desired location
                playerGroup.position.set(0, 5, 5);
                scene.add(playerGroup);
                
                // Make the group the player
                window.player = playerGroup;
                
                // Store initial position for collision recovery
                lastPosition.copy(playerGroup.position);
                
                // Add player boundary visualization
                addPlayerBoundary();
                
                log("CaMKII model added as player");
            },
            // Progress callback
            function(xhr) {
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    log('Loading player model: ' + percentComplete.toFixed(2) + '%');
                }
            },
            function(error) {
                log("Error loading CaMKII model: " + error.message);
                console.error("Error loading player model:", error);
                // Keep using the temp player if loading fails
                window.player = tempPlayer;
                
                // Add boundary for the temp player too
                lastPosition.copy(tempPlayer.position);
                addPlayerBoundary();
                
                log("Using fallback player");
            }
        );
    } catch (error) {
        console.error("Exception in player creation:", error);
        log("Exception in player creation: " + error.message);
        
        // Use the temporary player as fallback
        window.player = tempPlayer;
        lastPosition.copy(tempPlayer.position);
        addPlayerBoundary();
        log("Using temporary player as fallback");
    }
}

// Add a hexagonal boundary to the player
function addPlayerBoundary() {
    if (!window.player) return;
    
    // Create a hexagonal prism shape for CaMKII
    const hexRadius = playerBoundarySize;
    const hexHeight = playerBoundarySize * 0.4;
    
    // Create just the boundary data object for collision detection
    playerBoundary = {
        radius: hexRadius,
        height: hexHeight
    };
    
    // Create a visible debug wireframe for the player boundary
    createPlayerDebugVisualizer(hexRadius, hexHeight);
    
    log('Added hexagonal boundary to player');
}

// Create a visible debug wireframe for the player boundary
function createPlayerDebugVisualizer(radius, height) {
    if (!window.player) return null;
    
    // Create a hexagonal wireframe
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 6, 2);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        wireframe: true,
        depthTest: false // Make sure it's always visible
    });
    
    const visualizer = new THREE.Mesh(geometry, wireframeMaterial);
    visualizer.rotation.x = Math.PI / 2;
    
    // Add axis helper to the visualizer
    const playerAxis = new THREE.AxesHelper(radius * 2);
    visualizer.add(playerAxis);
    
    // Add to player
    window.player.add(visualizer);
    
    // Initially hidden unless in developer mode
    visualizer.visible = window.developerMode || false;
    
    // Store globally for toggling
    window.playerVisualizer = visualizer;
    
    // Add to global debug visualizers if it exists
    if (typeof debugVisualizers !== 'undefined') {
        debugVisualizers.push(visualizer);
    }
    
    return visualizer;
}

// Create fallback player if model fails to load
function createFallbackPlayer() {
    log("Creating fallback player...");
    
    // Simple player representation
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshPhongMaterial({ color: 0xff00ff });
    const fallbackPlayer = new THREE.Mesh(playerGeometry, playerMaterial);
    fallbackPlayer.position.set(0, 5, 5);
    
    // Add a spotlight to the player to make it more visible
    const playerLight = new THREE.PointLight(0xff00ff, 1, 5);
    playerLight.position.set(0, 0.5, 0);
    fallbackPlayer.add(playerLight);
    
    // Add ring marker
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.1, 16, 32),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1;
    fallbackPlayer.add(ring);
    
    scene.add(fallbackPlayer);
    window.player = fallbackPlayer;
    lastPosition.copy(fallbackPlayer.position);
    
    log('Using fallback player model');
    return fallbackPlayer;
}

// Update player position and rotation based on inputs
// NOTE: This function is no longer the primary movement controller
// It now serves as a backup and is called from controls.js if needed
function processPlayerMovement() {
    // This function is kept for legacy compatibility
    // The actual movement logic is now in controls.js in the movePlayerWithCameraRelativeControls function
    if (typeof window.movePlayerWithCameraRelativeControls === 'function') {
        window.movePlayerWithCameraRelativeControls();
    } else {
        // Fallback to basic movement if the controls.js function isn't available
        legacyPlayerMovement();
    }
    
    // Store position for collision recovery
    if (window.player) {
        // After movement, update last valid position if no collision
        const collisionResult = checkMicrotubuleCollisions();
        if (!collisionResult.collision) {
            lastPosition.copy(window.player.position);
        } else {
            // Restore position on collision
            window.player.position.copy(collisionResult.position);
        }
    }
}

// Legacy movement function as fallback
function legacyPlayerMovement() {
    if (!window.player) return;
    
    const moveSpeed = 0.2; // Base movement speed
    const boostMultiplier = window.keys['control'] ? 3 : 1; // Speed boost with Ctrl key
    
    const movingForward = window.keys['w'] || window.keys['KeyW'];
    const movingBackward = window.keys['s'] || window.keys['KeyS'];
    const movingLeft = window.keys['a'] || window.keys['KeyA'];
    const movingRight = window.keys['d'] || window.keys['KeyD'];
    
    // Calculate movement vector (direction)
    let moveVector = new THREE.Vector3(0, 0, 0);
    if (movingForward) moveVector.z -= 1;
    if (movingBackward) moveVector.z += 1;
    if (movingLeft) moveVector.x -= 1;
    if (movingRight) moveVector.x += 1;
    
    // Normalize and apply movement
    if (moveVector.length() > 0) {
        moveVector.normalize();
        moveVector.multiplyScalar(moveSpeed * boostMultiplier);
        
        // Apply movement
        window.player.position.x += moveVector.x;
        window.player.position.z += moveVector.z;
        
        // Rotate player to face movement direction
        if (window.player.children && window.player.children.length > 0) {
            // Calculate target rotation based on movement direction
            const targetRotation = Math.atan2(moveVector.x, moveVector.z);
            
            // Get current rotation
            let currentRotation = window.player.rotation.y;
            
            // Smoothly interpolate rotation (easing)
            const rotationSpeed = 0.1;
            window.player.rotation.y = currentRotation + (targetRotation - currentRotation) * rotationSpeed;
        }
    }
    
    // Up/down movement
    if (window.keys[' '] || window.keys['Space']) {
        window.player.position.y += moveSpeed * boostMultiplier;
    }
    if (window.keys['shift'] || window.keys['ShiftLeft']) {
        window.player.position.y -= moveSpeed * boostMultiplier;
    }
}

// Update the camera even if player isn't fully loaded yet
function updatePlayerCamera() {
    if (!window.player) {
        // If no player exists yet, use a default location for camera
        const defaultPosition = new THREE.Vector3(0, 5, 0);
        
        // Default camera behavior
        const x = defaultPosition.x + Math.sin(window.cameraAngle) * window.cameraDistance;
        const z = defaultPosition.z + Math.cos(window.cameraAngle) * window.cameraDistance;
        
        // Smooth camera height change based on player height
        const cameraHeight = 5; // Constant camera height above player
        const y = defaultPosition.y + cameraHeight;
        
        // Update camera
        window.camera.position.set(x, y, z);
        window.camera.lookAt(defaultPosition);
        return;
    }
    
    // Get player position
    const playerPosition = window.player.position.clone();
    
    // Camera position calculation is based on player position and global camera angle/distance
    const x = playerPosition.x + Math.sin(window.cameraAngle) * window.cameraDistance;
    const z = playerPosition.z + Math.cos(window.cameraAngle) * window.cameraDistance;
    
    // Smooth camera height change based on player height
    const cameraHeight = 5; // Constant camera height above player
    const y = playerPosition.y + cameraHeight;
    
    // Update camera
    window.camera.position.set(x, y, z);
    window.camera.lookAt(playerPosition);
}

// Check for collisions with microtubules
function checkMicrotubuleCollisions() {
    // Create result object
    const result = {
        collision: false,
        position: player.position.clone(),
        normal: new THREE.Vector3()
    };
    
    // Get player world position
    const playerPos = player.position.clone();
    const playerRadius = playerBoundarySize;
    
    // Check against each microtubule
    for (let i = 0; i < microtubuleBoundaries.length; i++) {
        const boundary = microtubuleBoundaries[i];
        const tubePos = boundary.getWorldPosition();
        
        // Project player onto tube axis
        const tubeDir = new THREE.Vector3(0, 0, 1);
        tubeDir.applyQuaternion(boundary.getWorldQuaternion());
        
        // Vector from tube to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, tubePos);
        
        // Project onto tube axis to find closest point
        const dot = toPlayer.dot(tubeDir);
        const axisPoint = new THREE.Vector3().addVectors(
            tubePos,
            tubeDir.clone().multiplyScalar(dot)
        );
        
        // Check if within tube length
        const halfHeight = boundary.height / 2;
        const distanceAlongAxis = Math.abs(dot);
        
        if (distanceAlongAxis <= halfHeight) {
            // Calculate radial distance
            const radialVector = new THREE.Vector3().subVectors(playerPos, axisPoint);
            const radialDistance = radialVector.length();
            
            // Check if within combined radii
            const combinedRadii = boundary.radius + playerRadius;
            
            if (radialDistance < combinedRadii) {
                // Collision detected!
                result.collision = true;
                
                // Calculate penetration distance
                const penetration = combinedRadii - radialDistance;
                
                // Set normal (away from tube)
                result.normal.copy(radialVector).normalize();
                
                // Calculate push-out position
                result.position = playerPos.clone().add(
                    result.normal.clone().multiplyScalar(penetration * 1.05)
                );
                
                // Exit at first collision (can be enhanced to find closest)
                break;
            }
        }
    }
    
    return result;
} 