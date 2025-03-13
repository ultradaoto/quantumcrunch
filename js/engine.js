// Global variables for access across modules
let scene, camera, renderer;
let debugPanel, loadingInfo;
let cameraAngle = 0;
const cameraHeight = 10;
const minZoom = 5;
const maxZoom = 30;
let currentZoom = 12;

// Initialize logging and UI references
function initLogger() {
    debugPanel = document.getElementById('debug-panel');
    loadingInfo = document.getElementById('loading-info');
}

// Logging function for debug info
function log(message) {
    console.log(message);
    if (debugPanel) {
        // Only show last 20 messages to avoid overwhelming
        const messages = debugPanel.innerHTML.split('<br>');
        if (messages.length > 20) {
            messages.shift();
        }
        messages.push(message);
        debugPanel.innerHTML = messages.join('<br>');
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
}

// Update loading information
function updateLoadingInfo(message) {
    if (loadingInfo) {
        loadingInfo.innerHTML = message;
    }
}

// Initialize the 3D engine
function initEngine() {
    log('Setting up 3D engine...');
}

// Update camera position and orientation
function updateCamera() {
    if (player) {
        // Third-person camera following
        const relativeCameraOffset = new THREE.Vector3(
            Math.sin(cameraAngle) * currentZoom,
            cameraHeight,
            Math.cos(cameraAngle) * currentZoom
        );
        
        // Calculate world position
        const cameraPosition = player.position.clone().add(relativeCameraOffset);
        
        // Smooth camera movement with lerping
        camera.position.lerp(cameraPosition, 0.05);
        camera.lookAt(player.position);
    } else {
        // Use orbit camera until player is created
        cameraAngle += 0.003;
        camera.position.x = Math.sin(cameraAngle) * currentZoom;
        camera.position.z = Math.cos(cameraAngle) * currentZoom;
        camera.position.y = cameraHeight;
        camera.lookAt(0, 0, 0);
    }
}

// Update the scene (called on each animation frame)
function updateScene(time, delta) {
    // Update player movement
    if (player) {
        updatePlayerMovement();
    }
    
    // Update docking
    updateDocking(delta);
    
    // Update attachment points
    updateAttachmentPoints(time);
    
    // Update docking visuals
    if (window.developerMode) {
        updateDockingVisualization();
    }
    
    // Animate blue light demo
    animateBlueLightDemo(time);
    
    // Update all microtubule glow effects
    if (typeof updateMicrotubulesGlow === 'function') {
        updateMicrotubulesGlow(time);
    }
    
    // Check collisions with microtubules
    if (player && typeof checkMicrotubuleCollisions === 'function') {
        checkMicrotubuleCollisions();
    }
    
    // Log performance stats occasionally
    if (Math.random() < 0.01) {
        const fps = Math.round(1 / delta);
        log(`FPS: ${fps}`);
    }
}

// Function to update docking visualization in developer mode
function updateDockingVisualization() {
    if (!player) return;
    
    // Check for docking spots
    const microtubules = scene.children.filter(obj => 
        obj.userData && obj.userData.dockingSites);
    
    microtubules.forEach(model => {
        if (!model.userData.dockingSites) return;
        
        model.userData.dockingSites.forEach(site => {
            // Get world position of docking site
            const worldPos = new THREE.Vector3();
            model.localToWorld(
                worldPos.copy(site.position)
            );
            
            // Check distance to player
            const distance = worldPos.distanceTo(player.position);
            
            // If close, highlight the site
            if (distance < 5) {
                // Create highlight if it doesn't exist
                if (!site.highlight) {
                    const highlightGeom = new THREE.RingGeometry(
                        site.radius * 0.8, 
                        site.radius * 1.2, 
                        6
                    );
                    const highlightMat = new THREE.MeshBasicMaterial({
                        color: 0x00ffff,
                        transparent: true,
                        opacity: 0.5,
                        side: THREE.DoubleSide
                    });
                    
                    site.highlight = new THREE.Mesh(highlightGeom, highlightMat);
                    
                    // Position and orient the highlight
                    site.highlight.position.copy(site.position);
                    
                    // Create a look-at vector perpendicular to axis
                    const lookDir = new THREE.Vector3(
                        Math.cos(site.angle),
                        Math.sin(site.angle),
                        0
                    );
                    site.highlight.lookAt(
                        site.position.clone().add(lookDir)
                    );
                    
                    model.add(site.highlight);
                }
                
                // Pulse the highlight
                const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.2;
                site.highlight.scale.set(pulseScale, pulseScale, 1);
                site.highlight.material.opacity = 0.3 + Math.sin(Date.now() * 0.003) * 0.2;
            } else if (site.highlight) {
                // Remove highlight if too far
                model.remove(site.highlight);
                site.highlight = null;
            }
        });
    });
}

// Check for collisions with microtubule boundaries
function checkMicrotubuleCollisions() {
    if (!player) return;
    
    const playerPos = player.position.clone();
    
    // Check each microtubule boundary
    microtubuleBoundaries.forEach(boundary => {
        // NEVER collide with detection fields
        if (boundary.detectionField && boundary.detectionField === boundary.mesh) return;
        if (boundary.mesh && boundary.mesh.userData && 
            (boundary.mesh.userData.isNonCollider || boundary.mesh.userData.isAttractionField)) return;
        
        // Get microtubule position
        const tubePos = boundary.getWorldPosition(new THREE.Vector3());
        
        // Vector from tube to player
        const toPlayer = new THREE.Vector3().subVectors(playerPos, tubePos);
        
        // Get microtubule direction vector (along its length)
        const tubeDir = new THREE.Vector3(0, 0, 1);
        tubeDir.applyQuaternion(boundary.getWorldQuaternion(new THREE.Quaternion()));
        
        // Project onto tube axis to find closest point along axis
        const dot = toPlayer.dot(tubeDir);
        const closestPointOnAxis = new THREE.Vector3().addVectors(
            tubePos,
            tubeDir.clone().multiplyScalar(dot)
        );
        
        // Vector from closest point on axis to player (radial direction)
        const radialVector = new THREE.Vector3().subVectors(playerPos, closestPointOnAxis);
        
        // Distance from axis
        const radialDistance = radialVector.length();
        
        // Check if player is inside the cylinder
        if (radialDistance < boundary.radius) {
            // Calculate push vector to move player outside
            const pushDir = radialVector.normalize();
            const pushDist = boundary.radius - radialDistance;
            
            // Push player outward
            player.position.add(pushDir.multiplyScalar(pushDist));
        }
    });
} 