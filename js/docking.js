// Essential docking variables
console.log("🚀 DOCKING SYSTEM: Loading docking.js file");

let playerDocked = false;
let dockedTo = null;
let dockingTimer = 0;
let dockingDuration = 4; // 4 seconds for phosphorylation
let readyToDock = true;
let lastDockAttemptTime = 0; // Timestamp of last dock attempt

// Variables for attachment points and landing visuals
const dockingAttachmentPoints = []; // Will hold all attachment point objects
const landingMarkers = []; // Markers left after docking
const connections = []; // Lines connecting landing markers
let connectionMaterial = null; // Material for connection lines
let dockingSystemInitialized = false; // Track if system is properly initialized

// Initialize docking system
function initDockingSystem() {
    console.log("🚀 DOCKING SYSTEM: Initializing docking system");
    log("Initializing docking system");
    
    // Create material for connections between landing markers
    connectionMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000,
        linewidth: 3
    });
    
    // Display current key handlers for debugging
    console.log("🚀 DOCKING SYSTEM: Current key handlers:", window.keys);
    
    // Add attachment points to already loaded microtubules
    setTimeout(() => {
        console.log("🚀 DOCKING SYSTEM: Adding attachment points to microtubules");
        console.log("🚀 DOCKING SYSTEM: Microtubule boundaries:", microtubuleBoundaries ? microtubuleBoundaries.length : "undefined");
        addAttachmentPointsToAllMicrotubules();
    }, 2000); // Delay to ensure microtubules are loaded
    
    // Register our key handler with the window keyboard events
    console.log("🚀 DOCKING SYSTEM: Registering key handler for E key");
    window.addEventListener('keydown', handleDockingKeyPress);
    
    // Add this system to the animation loop
    if (typeof window.gameUpdateFunctions === 'undefined') {
        console.log("🚀 DOCKING SYSTEM: Creating gameUpdateFunctions array");
        window.gameUpdateFunctions = [];
    }
    window.gameUpdateFunctions.push(updateDocking);
    console.log("🚀 DOCKING SYSTEM: Added updateDocking to game loop");
    
    // Set initialization flag
    dockingSystemInitialized = true;
    
    log("Docking system initialized - press E to dock when near attachment points");
    console.log("🚀 DOCKING SYSTEM: Initialization complete - press E to dock");
}

// Add attachment points to all existing microtubules
function addAttachmentPointsToAllMicrotubules() {
    if (!microtubuleBoundaries) {
        console.error("🚀 DOCKING SYSTEM ERROR: microtubuleBoundaries is undefined");
        log("Error: Could not find microtubule boundaries");
        return;
    }
    
    console.log(`🚀 DOCKING SYSTEM: Adding attachment points to ${microtubuleBoundaries.length} microtubules`);
    log(`Adding attachment points to ${microtubuleBoundaries.length} microtubules`);
    
    let pointsAdded = 0;
    
    microtubuleBoundaries.forEach((boundary, index) => {
        if (boundary && boundary.mesh) {
            console.log(`🚀 DOCKING SYSTEM: Processing microtubule ${index}, type: ${boundary.mesh.type}`);
            // Check if this is a GLB-loaded model or a procedural microtubule
            if (boundary.mesh.type === "Group" || boundary.mesh.type === "Scene") {
                // GLB-loaded model
                addAttachmentPointsToGLBMicrotubule(boundary.mesh, boundary);
            } else {
                // Procedural microtubule
                addAttachmentPointsToProceduralMicrotubule(boundary.mesh, boundary);
            }
            pointsAdded++;
            log(`Added attachment points to microtubule ${index}`);
        } else {
            console.warn(`🚀 DOCKING SYSTEM: Skipping microtubule ${index} - no mesh found`);
        }
    });
    
    console.log(`🚀 DOCKING SYSTEM: Added attachment points to ${pointsAdded} microtubules, total points: ${dockingAttachmentPoints.length}`);
    log(`Added ${dockingAttachmentPoints.length} attachment points to ${pointsAdded} microtubules`);
}

// Add attachment points to a GLB-loaded microtubule model
function addAttachmentPointsToGLBMicrotubule(microtubuleModel, boundary) {
    // Compute the bounding box to determine the model's size
    const bbox = new THREE.Box3().setFromObject(microtubuleModel);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    // Identify the longest axis (main axis) and calculate radius
    let mainAxis = 'z'; // Default to z since most microtubules are oriented along this axis
    let radius = boundary.radius; // Use the boundary radius for consistency
    
    if (size.x > size.y && size.x > size.z) {
        mainAxis = 'x';
        radius = Math.min(size.y, size.z) / 2;
    } else if (size.y > size.x && size.y > size.z) {
        mainAxis = 'y';
        radius = Math.min(size.x, size.z) / 2;
    }
    
    // Add 5 attachment points along the main axis
    const numPoints = 5;
    const mainLength = boundary.height;
    
    // Store docking sites on the microtubule model for reference
    if (!microtubuleModel.userData) microtubuleModel.userData = {};
    microtubuleModel.userData.dockingSites = [];
    
    for (let i = 0; i < numPoints; i++) {
        const ratio = 0.1 + (i / (numPoints - 1)) * 0.8; // Spread points between 10% and 90%
        const offset = (ratio - 0.5) * mainLength;
        
        // Create a visual marker sphere with emissive glow
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 16, 16),
            new THREE.MeshPhongMaterial({
                color: 0xff9900,
                emissive: 0xff3300,
                shininess: 100,
                transparent: true,
                opacity: 0.7
            })
        );
        
        // Position marker based on the main axis
        let position = new THREE.Vector3();
        let normal = new THREE.Vector3();
        
        if (mainAxis === 'x') {
            position.set(offset, radius, 0);
            normal.set(0, 1, 0);
        } else if (mainAxis === 'y') {
            position.set(0, offset, radius);
            normal.set(0, 0, 1);
        } else { // z
            position.set(0, radius, offset);
            normal.set(0, 1, 0);
        }
        
        // Add a small offset to ensure marker is visible on surface
        marker.position.copy(position);
        
        // Create a subtle glow sphere around the marker
        const glowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xff6600,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })
        );
        marker.add(glowSphere);
        
        // Add to microtubule
        microtubuleModel.add(marker);
        
        // Store attachment point data
        const attachmentPoint = {
            visualizer: marker,
            glowSphere: glowSphere,
            microtubule: microtubuleModel,
            boundary: boundary,
            position: position.clone(), // Local position
            normal: normal.clone(),    // Direction from center
            used: false,               // Initially unused
            index: dockingAttachmentPoints.length
        };
        
        // Add to global attachment points array
        dockingAttachmentPoints.push(attachmentPoint);
        
        // Store in microtubule's userData for easy access
        microtubuleModel.userData.dockingSites.push({
            position: position.clone(),
            normal: normal.clone(),
            marker: marker,
            inUse: false,
            index: i
        });
    }
}

// Add attachment points to a procedurally created microtubule
function addAttachmentPointsToProceduralMicrotubule(microtubuleMesh, boundary) {
    const numAttachPoints = 5; // Default number of attachment points per microtubule
    const microtubuleLength = boundary.height;
    const radius = boundary.radius;
    
    // Store docking sites on the microtubule for reference
    if (!microtubuleMesh.userData) microtubuleMesh.userData = {};
    microtubuleMesh.userData.dockingSites = [];
    
    for (let j = 0; j < numAttachPoints; j++) {
        const ratio = j / (numAttachPoints - 1);
        const posY = (ratio - 0.5) * microtubuleLength;
        
        // Create marker with yellow color
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 16, 16),
            new THREE.MeshPhongMaterial({
                color: 0xffff00,
                emissive: 0x333300
            })
        );
        
        marker.position.set(0, radius, posY);
        
        // Create a subtle glow sphere around the marker
        const glowSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 16, 16),
            new THREE.MeshBasicMaterial({
                color: 0xffff00,
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide
            })
        );
        marker.add(glowSphere);
        
        // Add to microtubule mesh
        microtubuleMesh.add(marker);
        
        // Normal pointing outward from center
        const normal = new THREE.Vector3(0, 1, 0);
        
        // Store attachment point data
        const attachmentPoint = {
            visualizer: marker,
            glowSphere: glowSphere,
            microtubule: microtubuleMesh,
            boundary: boundary,
            position: new THREE.Vector3(0, radius, posY),
            normal: normal,
            used: false,
            index: dockingAttachmentPoints.length
        };
        
        // Add to global attachment points array
        dockingAttachmentPoints.push(attachmentPoint);
        
        // Store in microtubule's userData for easy access
        microtubuleMesh.userData.dockingSites.push({
            position: new THREE.Vector3(0, radius, posY),
            normal: normal,
            marker: marker,
            inUse: false,
            index: j
        });
    }
}

// Check if player is close to an attachment point for docking
function checkForDockingPoints() {
    if (playerDocked || !window.player) {
        console.log("🚀 DOCKING SYSTEM: checkForDockingPoints - Player already docked or player not found");
        return null;
    }
    
    // Only check docking if player is ready
    if (!readyToDock) {
        console.log("🚀 DOCKING SYSTEM: Not ready to dock yet");
        return null;
    }
    
    console.log(`🚀 DOCKING SYSTEM: Checking ${dockingAttachmentPoints.length} attachment points for docking`);
    
    const dockingDistance = 3; // Units for docking distance threshold
    let closestPoint = null;
    let closestDistance = Infinity;
    
    // Check each attachment point
    for (let i = 0; i < dockingAttachmentPoints.length; i++) {
        const point = dockingAttachmentPoints[i];
        if (point.used) continue; // Skip points already docked to
        
        // Get the world position of the attachment point
        const worldPos = new THREE.Vector3();
        point.visualizer.getWorldPosition(worldPos);
        
        // Player position
        const playerPos = window.player.position.clone();
        
        // Calculate distance between player and attachment point
        const distance = playerPos.distanceTo(worldPos);
        
        // Check if player is close enough to dock
        if (distance < dockingDistance && distance < closestDistance) {
            closestDistance = distance;
            closestPoint = point;
        }
    }
    
    if (closestPoint) {
        console.log(`🚀 DOCKING SYSTEM: Found docking point at distance ${closestDistance.toFixed(2)}`);
        // Visual feedback: Show docking is available
        showDockingAvailableCue(true);
        
        // Store the nearest docking point in player's userData
        if (!window.player.userData) window.player.userData = {};
        window.player.userData.nearestDockingPoint = closestPoint;
        window.player.userData.nearestMicrotubule = closestPoint.boundary;
        window.player.userData.attractionStrength = 1.0 - (closestDistance / dockingDistance);
        
        return closestPoint;
    } else {
        // Not near any docking point
        console.log("🚀 DOCKING SYSTEM: No docking points within range");
        showDockingAvailableCue(false);
        if (window.player.userData) {
            window.player.userData.nearestDockingPoint = null;
            window.player.userData.nearestMicrotubule = null;
            window.player.userData.attractionStrength = 0;
        }
        
        return null;
    }
}

// Try to dock to a nearby microtubule
function tryToDock() {
    console.log("🚀 DOCKING SYSTEM: Attempting to dock");
    
    // Throttle dock attempts to prevent too frequent calls
    const currentTime = Date.now();
    if (currentTime - lastDockAttemptTime < 500) { // 500ms cooldown
        console.log("🚀 DOCKING SYSTEM: Throttling dock attempt - too soon");
        return;
    }
    lastDockAttemptTime = currentTime;
    
    if (playerDocked) {
        console.log("🚀 DOCKING SYSTEM: Cannot dock - player already docked");
        return;
    }
    
    if (!readyToDock) {
        console.log("🚀 DOCKING SYSTEM: Cannot dock - not ready to dock");
        return;
    }
    
    // Check if near a docking point
    console.log("🚀 DOCKING SYSTEM: Checking for nearby docking points");
    const nearestPoint = checkForDockingPoints();
    if (!nearestPoint) {
        console.log("🚀 DOCKING SYSTEM: No valid docking points found nearby");
        return;
    }
    
    console.log("🚀 DOCKING SYSTEM: Valid docking point found - initiating docking sequence");
    log("🔵 Initiating docking sequence");
    
    // Store pre-dock state for later
    if (!window.player.userData) window.player.userData = {};
    window.player.userData.preDockPosition = window.player.position.clone();
    window.player.userData.preDockRotation = window.player.quaternion.clone();
    
    // Get the world position of the attachment point
    const worldPos = new THREE.Vector3();
    nearestPoint.visualizer.getWorldPosition(worldPos);
    
    // Move player to docking position
    window.player.position.copy(worldPos);
    
    // Visual feedback: Change attachment point color to indicate docking
    const originalColor = nearestPoint.glowSphere.material.color.clone();
    nearestPoint.glowSphere.material.color.set(0xff0000);
    setTimeout(() => {
        nearestPoint.glowSphere.material.color.copy(originalColor);
    }, 500);
    
    // Create a permanent landing marker
    createLandingMarker(worldPos);
    
    // Start docking process
    playerDocked = true;
    dockedTo = nearestPoint.boundary;
    nearestPoint.used = true;
    dockingTimer = 0;
    
    // Create docking visuals and connections
    createDockingEffect(nearestPoint.boundary);
    
    log('Successfully docked to attachment point');
    console.log("🚀 DOCKING SYSTEM: Docking successful");
}

// Create a landing marker at the docking position
function createLandingMarker(position) {
    // Create a red landing marker at the docking position
    const landingMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 32, 32),
        new THREE.MeshPhongMaterial({
            color: 0xff3333,
            emissive: 0x330000
        })
    );
    landingMarker.position.copy(position);
    scene.add(landingMarker);
    landingMarkers.push(landingMarker);
    
    // Create connection if this is the second or later landing marker
    if (landingMarkers.length >= 2) {
        createConnectionBetweenMarkers();
    }
}

// Create connection between the last two landing markers
function createConnectionBetweenMarkers() {
    if (landingMarkers.length < 2) return;
    
    const linePoints = [
        landingMarkers[landingMarkers.length - 2].position,
        landingMarkers[landingMarkers.length - 1].position
    ];
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const line = new THREE.Line(lineGeometry, connectionMaterial);
    scene.add(line);
    
    connections.push(line);
    log('Created connection between landing markers');
}

// Show/hide visual cue that docking is available
function showDockingAvailableCue(show) {
    // Create the cue if it doesn't exist and showing is requested
    if (!window.dockingCue && show && window.player) {
        const cueGeometry = new THREE.RingGeometry(1.3, 1.5, 16);
        const cueMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        window.dockingCue = new THREE.Mesh(cueGeometry, cueMaterial);
        window.dockingCue.rotation.x = Math.PI / 2;
        window.dockingCue.position.y = 1.5;
        window.player.add(window.dockingCue);
        
        // Add animation data
        window.dockingCue.userData = {
            startTime: Date.now(),
            pulseRate: 2
        };
        
        // Animate the cue
        animateDockingCue();
    } else if (window.dockingCue) {
        // Update visibility
        window.dockingCue.visible = show;
    }
}

// Animate the docking available cue
function animateDockingCue() {
    if (!window.dockingCue || !window.dockingCue.visible) return;
    
    const cue = window.dockingCue;
    const elapsed = (Date.now() - cue.userData.startTime) / 1000;
    
    // Pulse effect
    const scale = 1 + 0.2 * Math.sin(elapsed * cue.userData.pulseRate);
    cue.scale.set(scale, scale, scale);
    
    // Continue animation
    requestAnimationFrame(animateDockingCue);
}

// Create visual effect for successful docking
function createDockingEffect(tubeBoundary) {
    // Create a ripple effect
    const rippleGeometry = new THREE.RingGeometry(0.5, 2, 32);
    const rippleMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    });
    
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.position.copy(window.player.position);
    scene.add(ripple);
    
    // Animate the ripple
    const startTime = Date.now();
    function animateRipple() {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < 1.0) {
            ripple.scale.setScalar(1 + elapsed * 2);
            ripple.material.opacity = 0.7 * (1 - elapsed);
            requestAnimationFrame(animateRipple);
        } else {
            scene.remove(ripple);
        }
    }
    animateRipple();
    
    // Add visual connection between player and microtubule during docking
    createDockingConnections();
}

// Update visual indicator of docking progress
function updateDockingProgress(progress) {
    // Create progress indicator if it doesn't exist
    if (!window.dockingProgressIndicator && window.player) {
        const indicatorGeometry = new THREE.RingGeometry(1.2, 1.5, 32);
        const indicatorMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        window.dockingProgressIndicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        window.player.add(window.dockingProgressIndicator);
        
        // Position it above the player
        window.dockingProgressIndicator.position.set(0, 1.5, 0);
        window.dockingProgressIndicator.rotation.x = Math.PI / 2;
    }
    
    // Update progress visualization
    if (window.dockingProgressIndicator) {
        const indicator = window.dockingProgressIndicator;
        
        // Update the ring to show progress
        indicator.scale.setScalar(progress);
        
        // Change color based on progress (cyan to blue)
        const blueComponent = 1.0;
        const greenComponent = Math.max(0, 1.0 - progress * 0.5);
        indicator.material.color.setRGB(0, greenComponent, blueComponent);
        
        // Make it pulse
        const pulseRate = 2 + progress * 6; // Gets faster as we progress
        const pulseAmount = 0.1 + progress * 0.2;
        const pulse = 1 + Math.sin(Date.now() / 100 * pulseRate) * pulseAmount;
        
        // Apply pulse to the scale
        indicator.scale.setScalar(progress * pulse);
    }
}

// Create connections between player and microtubule
function createDockingConnections() {
    if (!window.player) return;
    
    // Initialize docking connections array if it doesn't exist
    if (!window.player.userData) window.player.userData = {};
    if (!window.player.userData.dockingConnections) {
        window.player.userData.dockingConnections = [];
    }
    
    // Clear any existing connections
    window.player.userData.dockingConnections.forEach(conn => {
        if (conn && conn.parent) {
            conn.parent.remove(conn);
        }
    });
    window.player.userData.dockingConnections = [];
    
    // Number of connection points
    const connectionCount = 6;
    
    // Get the direction from player to microtubule
    const toMicrotubule = new THREE.Vector3();
    if (dockedTo) {
        toMicrotubule.subVectors(
            dockedTo.getWorldPosition(new THREE.Vector3()),
            window.player.position
        ).normalize();
    } else {
        // Default direction if we don't have dockedTo
        toMicrotubule.set(0, -1, 0);
    }
    
    // Create connections distributed around the player
    for (let i = 0; i < connectionCount; i++) {
        const angle = (i / connectionCount) * Math.PI * 2;
        
        // Create perpendicular basis for distributing connections
        const perp1 = new THREE.Vector3(1, 0, 0);
        if (Math.abs(toMicrotubule.dot(perp1)) > 0.9) {
            perp1.set(0, 1, 0);
        }
        const perp2 = new THREE.Vector3().crossVectors(toMicrotubule, perp1).normalize();
        perp1.crossVectors(perp2, toMicrotubule).normalize();
        
        // Calculate offset position for connection
        const radius = 0.4; // Slightly larger spread
        const offsetPos = new THREE.Vector3()
            .addScaledVector(perp1, Math.cos(angle) * radius)
            .addScaledVector(perp2, Math.sin(angle) * radius);
        
        // Create connection visualization
        const connectionGeom = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
        const connectionMat = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.7
        });
        
        const connection = new THREE.Mesh(connectionGeom, connectionMat);
        
        // Position connection at player with offset
        connection.position.copy(offsetPos);
        
        // Orient connection toward microtubule
        const lookTarget = new THREE.Vector3()
            .addVectors(connection.position, toMicrotubule);
        connection.lookAt(lookTarget);
        
        // Offset position to start from player surface
        connection.translateZ(0.4);
        
        // Add a small light at end of connection
        const connLight = new THREE.PointLight(0x00ffff, 0.5, 1);
        connLight.position.set(0, 0, 0.6);
        connection.add(connLight);
        
        // Add to player
        window.player.add(connection);
        window.player.userData.dockingConnections.push(connection);
        connection.userData = {
            initialPosition: connection.position.clone(),
            initialRotation: connection.rotation.clone(),
            light: connLight
        };
    }
}

// Animate docking connections
function animateDockingConnections(progress) {
    if (!window.player || !window.player.userData || !window.player.userData.dockingConnections) return;
    
    // Make connections pulse with progress
    window.player.userData.dockingConnections.forEach(connection => {
        // Make the connection glow more intensely as we progress
        if (connection.userData && connection.userData.light) {
            // Pulsing effect with frequency increasing with progress
            const pulseRate = 2 + progress * 6; // Gets faster as we progress
            const pulseIntensity = 0.5 + progress * 1.5; // Gets brighter as we progress
            
            // Calculate pulsing value
            const pulse = Math.sin(Date.now() / 200 * pulseRate) * 0.5 + 0.5;
            
            // Apply to light intensity and connection opacity
            connection.userData.light.intensity = pulse * pulseIntensity;
            connection.material.opacity = 0.4 + pulse * 0.6;
            
            // Change color gradually from cyan to blue as progress increases
            const blueComponent = 1.0;
            const greenComponent = Math.max(0, 1.0 - progress * 0.5);
            connection.material.color.setRGB(0, greenComponent, blueComponent);
        }
    });
}

// Process docking progress and completion
function processDocking(delta) {
    // If not docked, nothing to do
    if (!playerDocked || !dockedTo) return;
    
    // Ensure docking connections animate while docked
    animateDockingConnections(dockingTimer / dockingDuration);
    
    // Update docking timer
    dockingTimer += delta;
    
    // Update visual indicator of progress
    updateDockingProgress(dockingTimer / dockingDuration);
    
    // Check if docking is complete
    if (dockingTimer >= dockingDuration) {
        // Docking complete!
        triggerPhosphorylation();
        
        // Undock
        undockPlayer();
    }
}

// Create a dramatic blue light effect during phosphorylation
function createPhosphorylationEffect() {
    if (!dockedTo || !window.player) return;
    
    // Create a blue flash of light
    const flashGeometry = new THREE.SphereGeometry(3, 32, 32);
    const flashMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(window.player.position);
    scene.add(flash);
    
    // Add an intense point light
    const flashLight = new THREE.PointLight(0x00ffff, 5, 10);
    flash.add(flashLight);
    
    // Animate the flash
    const startTime = Date.now();
    const flashDuration = 1.5; // 1.5 seconds
    
    function animateFlash() {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed < flashDuration) {
            flash.material.opacity = 0.8 * (1 - elapsed / flashDuration);
            flash.scale.setScalar(1 + elapsed * 3);
            flashLight.intensity = 5 * (1 - elapsed / flashDuration);
            requestAnimationFrame(animateFlash);
        } else {
            scene.remove(flash);
        }
    }
    
    // Start animation
    animateFlash();
}

// Trigger phosphorylation effect
function triggerPhosphorylation() {
    if (!dockedTo) return;
    
    log("🔵 PHOSPHORYLATION COMPLETE 🔵");
    
    // Create a dramatic visual effect
    createPhosphorylationEffect();
    
    // Set cooldown timer on this microtubule
    dockedTo.phosphorylationCooldown = 10; // 10 seconds cooldown
    
    log('Phosphorylation complete!');
}

// Clean up docking progress indicator
function cleanupDockingProgress() {
    if (window.dockingProgressIndicator) {
        if (window.dockingProgressIndicator.parent) {
            window.dockingProgressIndicator.parent.remove(window.dockingProgressIndicator);
        }
        window.dockingProgressIndicator = null;
    }
}

// Clean up any docking visuals
function cleanupDockingVisuals() {
    // Clean up docking connections
    if (window.player && window.player.userData && window.player.userData.dockingConnections) {
        window.player.userData.dockingConnections.forEach(conn => {
            if (conn.parent) {
                conn.parent.remove(conn);
            }
        });
        window.player.userData.dockingConnections = [];
    }
    
    // Clean up docking progress indicator
    cleanupDockingProgress();
    
    // Hide docking available cue
    showDockingAvailableCue(false);
}

// Undock the player
function undockPlayer() {
    if (!playerDocked) return;
    
    log('Undocking from microtubule');
    
    // Reset docking state
    playerDocked = false;
    dockedTo = null;
    dockingTimer = 0;
    
    // Clean up any docking visuals
    cleanupDockingVisuals();
    
    // Set a short cooldown on docking to prevent immediate re-docking
    readyToDock = false;
    setTimeout(() => {
        readyToDock = true;
    }, 500);
}

// Key press handler for docking
function handleDockingKeyPress(event) {
    // Support both KeyE and 'e' key codes for better cross-browser compatibility
    console.log(`🚀 DOCKING SYSTEM: Key pressed: ${event.key} (code: ${event.code})`);
    
    if (event.key.toLowerCase() === 'e' || event.code === 'KeyE') {
        console.log("🚀 DOCKING SYSTEM: E key detected - attempting to dock");
        log("E key pressed - attempting to dock");
        // Prevent default behavior
        event.preventDefault();
        tryToDock();
    }
}

// Check and process keyboard input for docking
function checkKeyboardForDocking() {
    // Check if 'e' key is pressed in the global keys object
    if (window.keys && (window.keys['e'] || window.keys['E'] || window.keys['KeyE'])) {
        console.log("🚀 DOCKING SYSTEM: E key state detected in window.keys");
        tryToDock();
        
        // Immediately reset the key state to prevent multiple triggers
        if (window.keys['e']) window.keys['e'] = false;
        if (window.keys['E']) window.keys['E'] = false;
        if (window.keys['KeyE']) window.keys['KeyE'] = false;
    }
}

// Update docking in animation loop
function updateDocking(delta) {
    // Log the first few calls to confirm it's running
    if (!window.dockingUpdateCount) {
        window.dockingUpdateCount = 0;
    }
    
    if (window.dockingUpdateCount < 5) {
        console.log(`🚀 DOCKING SYSTEM: updateDocking called (${window.dockingUpdateCount + 1})`);
        window.dockingUpdateCount++;
    }
    
    // Only run if the system is initialized
    if (!dockingSystemInitialized) {
        return;
    }
    
    // Check for keyboard input
    checkKeyboardForDocking();
    
    // Process active docking
    processDocking(delta);
    
    // Check for nearby docking points if not docked
    if (!playerDocked) {
        checkForDockingPoints();
    }
}

// Add docking system initialization to the environment setup
// This will be called after the environment is created in the main game setup
if (typeof window.onEnvironmentReady === 'undefined') {
    console.log("🚀 DOCKING SYSTEM: Creating onEnvironmentReady array");
    window.onEnvironmentReady = [];
}

// Add our initialization function to be called when environment is ready
console.log("🚀 DOCKING SYSTEM: Registering initDockingSystem callback");
window.onEnvironmentReady.push(initDockingSystem);

// Fallback initialization to ensure docking system is initialized even if callbacks fail
setTimeout(function() {
    console.log("🚀 DOCKING SYSTEM: Checking if initialization occurred");
    if (!dockingSystemInitialized) {
        console.log("🚀 DOCKING SYSTEM: Fallback initialization triggered");
        initDockingSystem();
    }
}, 5000); // Wait 5 seconds before fallback initialization

// Export global functions for use in other modules
window.tryToDock = tryToDock;
window.updateDocking = updateDocking;

// Immediately log to confirm script loaded
console.log("🚀 DOCKING SYSTEM: Docking system script loaded and ready");

// Add direct test function that can be called from console
window.testDocking = function() {
    console.log("🚀 DOCKING SYSTEM: Manual test initiated");
    console.log("🚀 DOCKING SYSTEM: tryToDock exists:", typeof window.tryToDock === 'function');
    console.log("🚀 DOCKING SYSTEM: Initialized:", dockingSystemInitialized);
    console.log("🚀 DOCKING SYSTEM: Attachment points:", dockingAttachmentPoints.length);
    
    // Try to dock
    if (typeof window.tryToDock === 'function') {
        console.log("🚀 DOCKING SYSTEM: Calling tryToDock()");
        window.tryToDock();
    } else {
        console.error("🚀 DOCKING SYSTEM: tryToDock is not a function!");
    }
};

// Add debug function to manually trigger docking (can be called from console)
window.debugDockingSystem = function() {
    console.log("🚀 DOCKING SYSTEM DEBUG:");
    console.log("• Initialization status:", dockingSystemInitialized);
    console.log("• Attachment points:", dockingAttachmentPoints.length);
    console.log("• Player docked:", playerDocked);
    console.log("• Ready to dock:", readyToDock);
    console.log("• E key in window.keys:", window.keys['e'] || window.keys['E'] || window.keys['KeyE']);
    
    if (window.player) {
        console.log("• Player exists:", !!window.player);
        console.log("• Player position:", window.player.position);
        
        if (dockingAttachmentPoints.length > 0) {
            const closest = findClosestAttachmentPoint();
            console.log("• Closest attachment point distance:", closest.distance);
            console.log("• Within docking range:", closest.distance < 3);
        }
    }
};

// Helper function to find the closest attachment point for debugging
function findClosestAttachmentPoint() {
    let closest = { point: null, distance: Infinity };
    
    if (!window.player || dockingAttachmentPoints.length === 0) {
        return closest;
    }
    
    for (const point of dockingAttachmentPoints) {
        if (point.used) continue;
        
        const worldPos = new THREE.Vector3();
        point.visualizer.getWorldPosition(worldPos);
        const distance = window.player.position.distanceTo(worldPos);
        
        if (distance < closest.distance) {
            closest = { point, distance };
        }
    }
    
    return closest;
}