// Global variables for environment
const attachmentPoints = [];
const microtubuleBoundaries = [];
const debugVisualizers = []; // Array to hold all debug visualization meshes
let showBoundaries = false; // Set to true to visualize collision boundaries
let developerMode = false; // Testing/Developer mode toggle

/**
 * Creates the cell membrane - the outer boundary of the game world.
 * This is a large, transparent sphere that contains the entire environment.
 */
function createCellMembrane() {
    console.log("Creating cell membrane");
    const cellMembrane = new THREE.Mesh(
        new THREE.SphereGeometry(50, 32, 16),
        new THREE.MeshBasicMaterial({
            color: 0xffdddd,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        })
    );
    
    // Store reference for collision detection
    window.cellMembrane = cellMembrane;
    
    scene.add(cellMembrane);
    log("Cell membrane created");
    return cellMembrane;
}

/**
 * Creates the nucleus - a key cellular component for visual reference.
 * The nucleus is a purple sphere positioned in the environment.
 */
function createNucleus() {
    console.log("Creating nucleus");
    const nucleus = new THREE.Mesh(
        new THREE.SphereGeometry(15, 32, 32),
        new THREE.MeshPhongMaterial({ 
            color: 0x6a5acd,
            transparent: true,
            opacity: 0.7
        })
    );
    
    // Position the nucleus away from center to create space for gameplay
    nucleus.position.set(-20, 0, -15);
    
    // Store reference for collision detection
    window.nucleus = nucleus;
    
    scene.add(nucleus);
    log("Nucleus created");
    return nucleus;
}

/**
 * Creates the floor - a reference plane for orientation.
 * This helps users understand the 3D space better.
 */
function createFloor() {
    console.log("Creating floor");
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshPhongMaterial({
            color: 0xaaffaa,
            transparent: true,
            opacity: 0.5
        })
    );
    
    // Rotate and position to form a horizontal plane below the scene
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -10;
    
    // Enable floor to receive shadows for better visual depth
    floor.receiveShadow = true;
    
    scene.add(floor);
    log("Floor created");
    return floor;
}

/**
 * Sets up lighting for the scene.
 * Uses multiple light sources for better visual quality.
 */
function setupLighting() {
    console.log("Setting up lighting");
    
    // Ambient light provides overall illumination
    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.4);
    scene.add(ambientLight);
    
    // Main directional light for primary shadows and highlights
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1, 1, 1);
    dirLight.castShadow = true;
    
    // Configure shadow properties for better quality
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    
    scene.add(dirLight);
    
    // Secondary directional light to soften shadows and add dimension
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, 0.5, -1);
    scene.add(directionalLight2);
    
    // Add a spotlight to highlight the central play area
    const spotlight = new THREE.SpotLight(0xffffff, 0.7);
    spotlight.position.set(0, 20, 0);
    spotlight.angle = Math.PI / 6;
    spotlight.penumbra = 0.2;
    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 1024;
    spotlight.shadow.mapSize.height = 1024;
    scene.add(spotlight);
    
    log("Lighting setup complete");
}

/**
 * Creates a single enhanced microtubule at the specified position and rotation.
 * Microtubules are the primary structures for player interaction.
 * @param {THREE.Vector3} position - The position to place the microtubule
 * @param {THREE.Euler} rotation - The rotation of the microtubule
 */
function createEnhancedMicrotubule(position, rotation) {
    console.log("Creating enhanced microtubule at", position);
    
    // First create a temporary placeholder for immediate visualization
    const tempGeometry = new THREE.CylinderGeometry(0.5, 0.5, 10, 16);
    const tempMaterial = new THREE.MeshPhongMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
    });
    
    const tempMicrotubule = new THREE.Mesh(tempGeometry, tempMaterial);
    tempMicrotubule.rotation.x = Math.PI / 2;
    tempMicrotubule.position.copy(position);
    tempMicrotubule.castShadow = true;
    tempMicrotubule.receiveShadow = true;
    scene.add(tempMicrotubule);
    
    log("Temporary microtubule created, loading detailed model...");
    
    // Load the actual model
    try {
        const loader = new THREE.GLTFLoader();
        console.log("Loading microtubule model from assets/models/microtubule.glb");
        
        loader.load(
            'assets/models/microtubule.glb',
            function(gltf) {
                console.log("Microtubule model loaded successfully");
                const model = gltf.scene;
                
                // Set scale appropriate for the game world
                model.scale.set(0.01, 0.01, 0.01);
                
                // Set position and rotation
                model.position.copy(position);
                model.rotation.copy(rotation);
                
                // Enable shadows for better visual quality
                model.traverse(function(child) {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Remove temporary placeholder once the real model is ready
                if (tempMicrotubule && tempMicrotubule.parent) {
                    scene.remove(tempMicrotubule);
                }
                
                // Add to scene
                scene.add(model);
                
                // Add glow effect for better visibility
                addMicrotubuleGlow(model, position);
                
                // Create collision boundary for the microtubule
                const boundary = {
                    radius: 0.5,
                    height: 10,
                    mesh: model,
                    getWorldPosition: function(target) {
                        if (!target) target = new THREE.Vector3();
                        model.getWorldPosition(target);
                        return target;
                    },
                    getWorldQuaternion: function(target) {
                        if (!target) target = new THREE.Quaternion();
                        model.getWorldQuaternion(target);
                        return target;
                    }
                };
                microtubuleBoundaries.push(boundary);
                
                log('Microtubule created successfully');
                
                // Create player after microtubule is loaded if it doesn't exist yet
                if (!window.player) {
                    createPlayer();
                }
            },
            // Progress callback 
            function(xhr) {
                if (xhr.lengthComputable) {
                    const percentComplete = (xhr.loaded / xhr.total) * 100;
                    log('Loading microtubule: ' + percentComplete.toFixed(2) + '%');
                }
            },
            // Error callback
            function(error) {
                console.error("Error loading microtubule:", error);
                log("Error loading microtubule model - keeping placeholder");
                
                // Keep the placeholder if loading fails
                // Add basic collision boundary
                const boundary = {
                    radius: 0.5,
                    height: 10,
                    mesh: tempMicrotubule,
                    getWorldPosition: function(target) {
                        if (!target) target = new THREE.Vector3();
                        tempMicrotubule.getWorldPosition(target);
                        return target;
                    },
                    getWorldQuaternion: function(target) {
                        if (!target) target = new THREE.Quaternion();
                        tempMicrotubule.getWorldQuaternion(target);
                        return target;
                    }
                };
                microtubuleBoundaries.push(boundary);
                
                // Create player even if microtubule fails to load
                if (!window.player) {
                    createPlayer();
                }
            }
        );
    } catch (error) {
        console.error("Exception in microtubule creation:", error);
        log("Exception in microtubule creation: " + error.message);
        
        // Keep using the temp microtubule as fallback
        const boundary = {
            radius: 0.5,
            height: 10,
            mesh: tempMicrotubule,
            getWorldPosition: function(target) {
                if (!target) target = new THREE.Vector3();
                tempMicrotubule.getWorldPosition(target);
                return target;
            },
            getWorldQuaternion: function(target) {
                if (!target) target = new THREE.Quaternion();
                tempMicrotubule.getWorldQuaternion(target);
                return target;
            }
        };
        microtubuleBoundaries.push(boundary);
        
        // Create player even with fallback microtubule
        if (!window.player) {
            createPlayer();
        }
    }
}

/**
 * Adds a glow effect to microtubules.
 * Enhances visibility and provides visual feedback.
 * @param {THREE.Object3D} model - The microtubule model
 * @param {THREE.Vector3} position - The position of the microtubule
 */
function addMicrotubuleGlow(model, position) {
    // Create a point light for the glow effect
    const glowLight = new THREE.PointLight(0x00ffff, 0.5, 10);
    glowLight.position.copy(position);
    scene.add(glowLight);
    
    // If we don't have a storage array for glow effects, create one
    if (!window.microtubuleGlows) {
        window.microtubuleGlows = [];
    }
    
    // Store the glow effect for later animation
    window.microtubuleGlows.push({
        light: glowLight,
        offset: Math.random() * 10, // Random offset for varied animation
        model: model
    });
}

/**
 * Creates multiple microtubules throughout the environment.
 * This provides more gameplay opportunities and creates a richer world.
 */
function createMicrotubules() {
    log("Creating additional microtubules...");
    
    // Define positions for additional microtubules
    const positions = [
        new THREE.Vector3(-5, 3, -5),
        new THREE.Vector3(5, 2, 5),
        new THREE.Vector3(10, 5, -10),
        new THREE.Vector3(-8, 8, 8),
        new THREE.Vector3(12, 1, 3)
    ];
    
    // Define rotations for varied orientation
    const rotations = [
        new THREE.Euler(Math.PI/2, 0, 0),
        new THREE.Euler(Math.PI/2, Math.PI/4, 0),
        new THREE.Euler(Math.PI/2, -Math.PI/6, 0),
        new THREE.Euler(Math.PI/2, Math.PI/3, Math.PI/6),
        new THREE.Euler(Math.PI/2, -Math.PI/4, Math.PI/8)
    ];
    
    // Create each microtubule with unique position and rotation
    positions.forEach((position, index) => {
        const rotation = rotations[index % rotations.length];
        setTimeout(() => {
            createEnhancedMicrotubule(position, rotation);
        }, index * 200); // Stagger creation to reduce load spikes
    });
}

/**
 * Updates the glow effects on microtubules during animation.
 * @param {number} time - The current time for animation purposes
 */
function updateMicrotubulesGlow(time) {
    if (!window.microtubuleGlows || window.microtubuleGlows.length === 0) return;
    
    window.microtubuleGlows.forEach(item => {
        // Create a subtle pulsing effect
        const pulseRate = 0.8; // Pulse speed
        const pulseIntensity = 0.2; // Pulse depth
        
        // Calculate pulse based on time and offset
        const pulseValue = Math.sin((time * 0.001 + item.offset) * pulseRate) * pulseIntensity + 0.85;
        
        // Apply pulse to light intensity
        item.light.intensity = 0.5 * pulseValue;
    });
}

/**
 * Toggles developer mode visualization.
 * Displays collision boundaries and debug information.
 */
function toggleDeveloperMode() {
    window.developerMode = !window.developerMode;
    log(`Developer mode: ${window.developerMode ? 'ENABLED' : 'DISABLED'}`);
    
    // Create debug visualizers the first time
    if (window.developerMode && !window.debugObjects) {
        createDebugVisualizers();
    }
    
    // Toggle all debug objects
    if (window.debugObjects) {
        window.debugObjects.forEach(obj => {
            if (obj) obj.visible = window.developerMode;
        });
        log(`Set visibility of ${window.debugObjects.length} debug objects to ${window.developerMode}`);
    }
    
    // Toggle axis helper
    if (window.developerMode) {
        if (!window.axisHelper) {
            window.axisHelper = new THREE.AxesHelper(10);
            scene.add(window.axisHelper);
        }
    } else {
        if (window.axisHelper) {
            scene.remove(window.axisHelper);
            window.axisHelper = null;
        }
    }
}

/**
 * Creates debug visualizers for microtubule boundaries.
 * Helps with understanding collision detection during development.
 */
function createDebugVisualizers() {
    log('Creating debug visualizers for all microtubules');
    
    // Clear any existing visualizers
    if (window.debugObjects) {
        window.debugObjects.forEach(obj => {
            if (obj) scene.remove(obj);
        });
    }
    
    // Create a new array for debug objects
    window.debugObjects = [];
    
    // For each microtubule boundary, create a visible wireframe
    microtubuleBoundaries.forEach((boundary, index) => {
        if (!boundary || !boundary.getWorldPosition) return;
        
        // Get world position and orientation
        const pos = boundary.getWorldPosition(new THREE.Vector3());
        
        // Create a very obvious wireframe cylinder
        const radius = boundary.radius;
        const height = boundary.height;
        
        // Use EdgesGeometry for clearer wireframes
        const cylinderGeom = new THREE.CylinderGeometry(radius, radius, height, 16, 4);
        const edges = new THREE.EdgesGeometry(cylinderGeom);
        const wireframe = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ 
                color: 0xff0000, 
                linewidth: 3,
                opacity: 1,
                transparent: false
            })
        );
        
        // Position in world space
        wireframe.position.copy(pos);
        
        // Rotate to match the microtubule orientation
        wireframe.rotation.x = Math.PI / 2;
        wireframe.rotation.z = Math.PI / 2;
        
        // Add to scene
        scene.add(wireframe);
        
        // Store for later
        window.debugObjects.push(wireframe);
        
        // Default visibility
        wireframe.visible = window.developerMode || false;
        
        log(`Added debug wireframe for microtubule ${index}`);
    });
    
    // Also create a cell membrane wireframe
    if (window.cellMembrane) {
        const membraneWireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.SphereGeometry(50, 16, 12)),
            new THREE.LineBasicMaterial({
                color: 0xffaaaa,
                linewidth: 1,
                opacity: 0.5,
                transparent: true
            })
        );
        scene.add(membraneWireframe);
        window.debugObjects.push(membraneWireframe);
        membraneWireframe.visible = window.developerMode || false;
        log('Added debug wireframe for cell membrane');
    }
}

/**
 * Initializes the game environment.
 * Creates all necessary elements for the first phase of the game.
 */
function initializeEnvironment() {
    // Create the basic cell structure
    createCellMembrane();
    createNucleus();
    createFloor();
    
    // Set up lighting
    setupLighting();
    
    // Create initial microtubule
    createEnhancedMicrotubule(new THREE.Vector3(0, 0, 0), new THREE.Euler(Math.PI/2, 0, 0));
    
    // Create additional microtubules
    setTimeout(() => {
        createMicrotubules();
    }, 1000); // Delay to reduce initial load
    
    log("Environment initialization complete");
} 