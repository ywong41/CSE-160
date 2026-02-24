/**
 * Reference: I used ChatGPT as a learning and debugging assistant while building this project.
 * Specifically, I asked ChatGPT to guide me through camera math and help me understand the UI logic.
 * I also asked ChatGPT for guidance on creating a simple “air wall” boundary to make the world feel
 * more game-like. Moreover, I asked ChatGPT to brainstorm gameplay features and ways to improve
 * the atmosphere and visuals, which helped me implement features such as distance fog and a simple
 * day/night cycle. Also, I learned learned multiple ways to improve code efficiency; for example, 
 * reducing per-frame allocations by reusing matrices and objects.
 * Overall, code implementation and testing were done by me.
 */

var VERTEX_SHADER = `
    precision mediump float;
    attribute vec4 a_Position;
    attribute vec2 a_UV;
    attribute vec3 a_Normal;

    varying vec2 v_UV;
    varying vec3 v_Normal;
    varying vec3 v_WorldPos;

    uniform mat4 u_ModelMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;
    uniform mat4 u_GlobalRotateMatrix;

    void main() {
    v_UV = a_UV;
    vec4 worldPos = u_GlobalRotateMatrix * u_ModelMatrix * vec4(a_Position, 1.0);
    v_WorldPos = worldPos.xyz;
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * worldPos;

    v_Normal = a_Normal;
}`


var FRAGMENT_SHADER = `
    precision mediump float;

    varying vec2 v_UV;
    varying vec3 v_Normal;
    varying vec3 v_WorldPos;

    uniform vec4 u_FragColor;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    uniform sampler2D u_Sampler2;   // diamond texture
    uniform sampler2D u_Sampler3;   // wood texture
    uniform sampler2D u_Sampler4;   // purple diamond texture

    uniform int u_whichTexture;

    uniform float u_texColorWeight;

    uniform vec3 u_CameraPos;
    uniform vec4 u_FogColor;
    uniform float u_FogNear;
    uniform float u_FogFar;
    uniform int u_useFog;

    void main() {
    vec4 baseColor = u_FragColor;
    vec4 outColor;

    if (u_whichTexture == -2) {
        outColor = baseColor;
    }else if (u_whichTexture == -1) {
        outColor = vec4(v_UV, 1.0, 1.0);
    } else if (u_whichTexture == 0) {
        vec4 texColor = texture2D(u_Sampler0, v_UV);
        float t = clamp(u_texColorWeight, 0.0, 1.0);
        outColor = mix(baseColor, texColor, t);
    } else if (u_whichTexture == 1) {
        vec4 texColor = texture2D(u_Sampler1, v_UV);
        float t = clamp(u_texColorWeight, 0.0, 1.0);
        outColor = mix(baseColor, texColor, t);
    } else if (u_whichTexture == 2) {                 // diamond texture
        vec4 texColor = texture2D(u_Sampler2, v_UV);
        float t = clamp(u_texColorWeight, 0.0, 1.0);
        outColor = mix(baseColor, texColor, t);
    } else if (u_whichTexture == 3) {
        vec4 texColor = texture2D(u_Sampler3, v_UV);
        float t = clamp(u_texColorWeight, 0.0, 1.0);
        outColor = mix(baseColor, texColor, t);
    }else if (u_whichTexture == 4) {
        vec4 texColor = texture2D(u_Sampler4, v_UV);
        float t = clamp(u_texColorWeight, 0.0, 1.0);
        outColor = mix(baseColor, texColor, t);
    }else {
        outColor = vec4(1.0, 0.2, 0.2, 1.0);
    }

    // FOG distance based
    if (u_useFog == 1) {
        float d = distance(u_CameraPos, v_WorldPos);
        float fogT = clamp((d - u_FogNear) / (u_FogFar - u_FogNear), 0.0, 1.0);
        outColor = mix(outColor, u_FogColor, fogT);
    }

    gl_FragColor = outColor;
}`

// Globals
let canvas, gl;

// Attributes
let a_Position, a_UV;

// Uniforms
let u_FragColor, u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix, u_GlobalRotateMatrix, u_texColorWeight;

let u_whichTexture, u_Sampler0;
let u_Sampler1, u_Sampler2, u_Sampler3, u_Sampler4;

// Textures (stone, sky, diamond, wood, purple diamond)
let g_texture0 = null, g_texture1 = null, g_texture2 = null, g_texture3 = null, g_texture4 = null;

// fog globals
let u_CameraPos, u_FogColor, u_FogNear, u_FogFar, u_useFog;

// Camera
let g_camera;

let g_globalAngle = 0;
let g_mouseXAngle = 0;
let g_mouseYAngle = 0;

let g_targetYaw = 0;
let g_targetPitch = 0;
let g_yaw = 0;
let g_pitch = 0;

// FPS
let g_lastFrameMS = performance.now();
let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;
let g_fpsBuffer = [];
let g_msBuffer = [];
let g_fpsSMA = 0;
let g_msSMA = 0;

// Map
const MAP_SIZE = 32;
let g_map = [];

// ==== Collision constants ====
const PLAYER_RADIUS = 0.18;
const PLAYER_EYE_Y = 0.30;  // keep camera above ground

function worldToCell(wx, wz) {
    const half = MAP_SIZE / 2;
    const mx = Math.floor(wx + half);
    const mz = Math.floor(wz + half);
    return { x: mx, z: mz };
}

// add air wall to block outside map
function isBlockedAtXZ(wx, wz) {
    const c = worldToCell(wx, wz);
    if (c.x < 0 || c.x >= MAP_SIZE || c.z < 0 || c.z >= MAP_SIZE) return true;
    return g_map[c.z][c.x] > 0; // any column > 0 blocks
}

// check 4 corners of a player circle that can stand at
function canStandAt(wx, wz) {
    const r = PLAYER_RADIUS;
    return !(
        isBlockedAtXZ(wx - r, wz - r) ||
        isBlockedAtXZ(wx + r, wz - r) ||
        isBlockedAtXZ(wx - r, wz + r) ||
        isBlockedAtXZ(wx + r, wz + r)
    );
}

// reuse cube for map rendering
let g_tempCube = null;

// Block Selection
let g_placeBrush = 1;   // block selection: 1/2/3
// user options includes 1 = original, 2 = wood, 3 = purple diamond
let g_blockType = [];
const BLOCKTYPE_ORIGINAL = 1;
const BLOCKTYPE_WOOD = 2;
const BLOCKTYPE_PURPDIAM = 3;

// Collect Diamond quest global
const DIAMOND_GOAL = 8; // user required to find 8 diamond block from map
const DIAMOND_SPAWN_COUNT = 20; // spawn 20 diamond 
let g_diamonds = [];
let g_diamondCollected = 0;
let g_readyToTurnIn = false;
let g_winShown = false;
let g_diamondCube = null;

// terrain global
const USE_SIMPLE_TERRAIN = true;

// bigger STEP = fewer tiles = faster. 4 => 8x8 tiles, 2 => 16x16 tiles.
const TERRAIN_STEP = 4;

const BASE_GROUND_Y = -0.75;
const BASE_GROUND_THICK = 0.02;
// set how tall each “level” is
const TERRAIN_UNIT_H = 0.30;
let g_groundHeights = []; // 2D array


// Croc WIN animation (shake -> explode -> cash)
let g_crocWinActive = false;
let g_crocWinStart = 0;

const WIN_TOTAL = 2.5;        // total seconds before showing win screen
const WIN_EXPLODE_AT = 0.55;  // when croc disappears and cash appears

let g_cash = [];              // particles

// set croc location
const CROC_POS = [2, -0.72, 2];

window.onload = () => main();

// globals for animal
const CROC_DARK = [0.18, 0.259, 0.102, 1.0];
const CROC_MID = [0.29, 0.392, 0.176, 1.0];
const CROC_LIGHT = [0.24, 0.392, 0.176, 1.0];
const CROC_BELLY = [0.624, 0.643, 0.396, 1.0];
const CROC_EYE = [0.78, 0.76, 0.09, 1.0];
const CROC_IRIS = [0.05, 0.05, 0.05, 1.0];

let g_crocCube = null;
let g_crocJaw = 0;
let g_crocTail1 = 0;
let g_crocTail2 = 0;

// reuse matrices to avoid per-frame allocations
let croc_base, croc_body, croc_belly, croc_tailJ1, croc_tail1, croc_tailJ2, croc_tail2;
let croc_head, croc_snout, croc_jawJ, croc_jaw, croc_eye1, croc_eye2, croc_iris1, croc_iris2;
let croc_hip, croc_thigh, croc_knee, croc_calf, croc_ankle, croc_foot;
let tail1 = g_crocTail1, tail2 = g_crocTail2, jaw = g_crocJaw;

function initCrocMatrices() {
    croc_base = new Matrix4();
    croc_body = new Matrix4();
    croc_belly = new Matrix4();
    croc_tailJ1 = new Matrix4();
    croc_tail1 = new Matrix4();
    croc_tailJ2 = new Matrix4();
    croc_tail2 = new Matrix4();
    croc_head = new Matrix4();
    croc_snout = new Matrix4();
    croc_jawJ = new Matrix4();
    croc_jaw = new Matrix4();
    croc_eye1 = new Matrix4();
    croc_eye2 = new Matrix4();
    croc_iris1 = new Matrix4();
    croc_iris2 = new Matrix4();
    croc_hip = new Matrix4();
    croc_thigh = new Matrix4();
    croc_knee = new Matrix4();
    croc_calf = new Matrix4();
    croc_ankle = new Matrix4();
    croc_foot = new Matrix4();
}

function main() {
    setupWebGL();
    connectVariablesToGLSL();
    addActionsForHtmlUI();
    g_camera = new Camera(canvas);

    //set starting point
    g_camera.eye = new Vector3([0, 0.3, 3]);
    g_camera.at = new Vector3([0, 0.3, 2]);
    g_camera.viewMatrix.setLookAt(
        g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
        g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
        g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]
    );

    initMouseLookFromCamera();
    uiInit();
    // always show story when page loads
    uiOpen("story", 0);
    initBrushSelect();
    updateBrushHud();

    if (!localStorage.getItem("seenIntro")) {
        uiOpen("start", 0);
        localStorage.setItem("seenIntro", "1");
    }

    document.onkeydown = keydown;
    addMouseControl();

    initTextures();
    buildMap32();
    buildSimpleTerrain();

    spawnDiamonds();

    g_diamondCube = new Cube();

    // background clear color 
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    g_tempCube = new Cube();

    g_crocCube = new Cube();
    initCrocMatrices();

    requestAnimationFrame(tick);
}

// Set up action for the HTML UI elements
function addActionsForHtmlUI(){

    // Slider Events
    // document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = parseFloat(this.value); renderScene(); });
    // document.getElementById('tail1Slide').addEventListener('input', function() { g_tail1Angle = parseFloat(this.value); renderScene(); });
    // document.getElementById('tail2Slide').addEventListener('input', function() { g_tail2Angle = parseFloat(this.value); renderScene(); });
    // document.getElementById('jawSlide').addEventListener('input', function() { g_jawAngle = parseFloat(this.value); renderScene(); });
    // document.getElementById('thighSlide').addEventListener('input', function () { g_thigh = parseFloat(this.value); renderScene(); });
    // document.getElementById('calfSlide').addEventListener('input', function () { g_calf = parseFloat(this.value); renderScene(); });
    // document.getElementById('footSlide').addEventListener('input', function () { g_foot = parseFloat(this.value); renderScene(); });

    // Button Events
    document.getElementById('normalOn').onclick = function() {g_normalOn = true; };
    document.getElementById('normalOff').onclick = function() {g_normalOn = false; };

    // document.getElementById('tailOnButton').onclick = function() { g_tailAnimation  = true; };
    // document.getElementById('tailOffButton').onclick = function() { g_tailAnimation  = false; };
    // document.getElementById('jawOnButton').onclick = function() { g_jawAnimation = true; };
    // document.getElementById('jawOffButton').onclick = function() { g_jawAnimation = false; };
    // document.getElementById('walkOnButton').onclick  = function() { g_walkAnimation = true; };
    // document.getElementById('walkOffButton').onclick = function() { g_walkAnimation = false; };
    // document.getElementById("animateAllOn").onclick = function() { gAnimateAll = true; };
    // document.getElementById("animateAllOff").onclick = function() { gAnimateAll = false; };
}

// loads textures
function initTextures() {
    // stone
    const img0 = new Image();
    img0.onload = () => { g_texture0 = sendImageToTexture(img0, 0, u_Sampler0); };
    img0.onerror = () => console.log("FAILED to load:", img0.src);
    img0.src = "../imgs/block.png";

    // sky
    const img1 = new Image();
    img1.onload = () => { g_texture1 = sendImageToTexture(img1, 1, u_Sampler1); };
    img1.onerror = () => console.log("FAILED to load:", img1.src);
    img1.src = "../imgs/tempSky.png";

    // diamond
    const img2 = new Image();
    img2.onload = () => { g_texture2 = sendImageToTexture(img2, 2, u_Sampler2); };
    img2.onerror = () => console.log("FAILED to load:", img2.src);
    img2.src = "../imgs/diamond.png";

    // wood
    const img3 = new Image();
    img3.onload = () => { g_texture3 = sendImageToTexture(img3, 3, u_Sampler3); };
    img3.onerror = () => console.log("FAILED to load:", img3.src);
    img3.src = "../imgs/wood.png";

    // purple Diamond
    const img4 = new Image();
    img4.onload = () => { g_texture4 = sendImageToTexture(img4, 4, u_Sampler4); };
    img4.onerror = () => console.log("FAILED to load:", img4.src);
    img4.src = "../imgs/purpleDiamond.png";
}

function isPowerOf2(v) { return (v & (v - 1)) === 0; }

// binds texture units/samplers
function sendImageToTexture(image, texUnit, samplerLoc) {
    console.log("Loaded image:", image.src, image.width, image.height);

    const tex = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);

    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const pot = isPowerOf2(image.width) && isPowerOf2(image.height);

    if (pot) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // tell shader which texture unit this sampler reads from
    gl.uniform1i(samplerLoc, texUnit);

    return tex;
}

function tick() {
    const now = performance.now();
    const dt = now - g_lastFrameMS;
    g_lastFrameMS = now;

    g_seconds = now / 1000.0 - g_startTime;

    g_fpsBuffer.push(1000 / Math.max(dt, 0.0001));
    g_msBuffer.push(dt);
    if (g_fpsBuffer.length > 10) g_fpsBuffer.shift();
    if (g_msBuffer.length > 10) g_msBuffer.shift();
    g_fpsSMA = g_fpsBuffer.reduce((a, b) => a + b, 0) / g_fpsBuffer.length;
    g_msSMA = g_msBuffer.reduce((a, b) => a + b, 0) / g_msBuffer.length;
    // quest win animation
    const dtSec = dt / 1000.0;
    updateCrocWinAnim(dtSec);
    // quest
    updateDiamondQuest();

    // day night fog
    const s = 0.5 + 0.5 * Math.sin(g_seconds * 0.15); // slow cycle 0..1
    const r = 0.25 + 0.45 * s;
    const g = 0.30 + 0.45 * s;
    const b = 0.45 + 0.45 * s;
    gl.uniform4f(u_FogColor, r, g, b, 1.0);

    renderAllShapes();

    // HUD
    sendTextToHTML(`FPS: ${g_fpsSMA.toFixed(1)} | ${g_msSMA.toFixed(1)} ms`, "numdot");

    // add animal animation
    g_crocJaw = Math.max(0, 25 * Math.sin(g_seconds * 2.0));
    g_crocTail1 = 15 * Math.sin(g_seconds * 1.6);
    g_crocTail2 = 25 * Math.sin(g_seconds * 1.6 + Math.PI / 3);
    requestAnimationFrame(tick);
}
let sky = null;
function renderAllShapes() {
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);

    const globalRotMat = new Matrix4();
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // camera pos for fog (once per frame)
    gl.uniform3f(
        u_CameraPos,
        g_camera.eye.elements[0],
        g_camera.eye.elements[1],
        g_camera.eye.elements[2]
    );

    // Sky (a big cube surrounding the world)
    if (!sky) sky = new Cube(); // big cube, creat once to help performance

    sky.matrix.setIdentity();
    sky.matrix.scale(1000, 1000, 1000);
    sky.matrix.translate(-0.5, -0.5, -0.5);

    if(g_normalOn) sky.textureNum = 1;  // use sky texture
    sky.color = [0.4, 0.6, 1.0, 1.0];     // tinted blue
    //Texture + color mixed (weight 0.0 is solid blue, 1.0 is pure texture, 0.7 is blue-tinted texture)
    gl.uniform1f(u_texColorWeight, 0.7);  // 0.7 = 70% texture + 30% blue 

    gl.uniform1i(u_useFog, 0);
    gl.depthMask(false);
    gl.disable(gl.CULL_FACE);
    gl.depthFunc(gl.LEQUAL);
    sky.renderFast();
    gl.depthFunc(gl.LESS);
    gl.enable(gl.CULL_FACE);
    gl.depthMask(true);
    gl.uniform1i(u_useFog, 1);


    // back to solid color for floor/diamonds unless textured
    gl.uniform1f(u_texColorWeight, 0.0);

    // floor
    // const floor = new Cube();
    // gl.uniform1f(u_texColorWeight, 0.0);
    // floor.color = [0.2, 0.8, 0.2, 1.0];
    // floor.textureNum = -2;
    // floor.matrix.setIdentity();
    // floor.matrix.translate(0, -0.75, 0);
    // floor.matrix.scale(40, 0.02, 40);
    // floor.matrix.translate(-0.5, 0, -0.5);
    // floor.renderFast();

    // ===== 1 cube for testing=====
    //   const t = new Cube();
    //   gl.uniform1f(u_texColorWeight, 1.0);
    //   t.textureNum = 0;            // textured
    //   t.color = [1, 1, 1, 1];
    //   t.matrix.setIdentity();
    //   t.matrix.translate(0, -0.75, 0);
    //   t.renderFast();

    // renders a required flattened base cube, plus optional raised terrain slabs
    drawGround();

    // map cubes 
    drawDiamonds();
    renderCrocInWorld(2, -0.72, 2, 180);
    drawMap();
}

// walls from 2D array, height = g_map[z][x] (0..4)
function drawMap() {
    const half = MAP_SIZE / 2;

    let lastWeight = null;
    let lastColorKey = "";

    for (let z = 0; z < MAP_SIZE; z++) {
        for (let x = 0; x < MAP_SIZE; x++) {
            const h = g_map[z][x];

            for (let y = 0; y < h; y++) {
                const t = g_blockType[z][x][y] || BLOCKTYPE_ORIGINAL;

                // map "type" -> textureNum + tint behavior
                let texNum, weight, color;

                if (t === BLOCKTYPE_ORIGINAL) {
                    texNum = 0;                 // sampler0
                    weight = 1.0;               // pure texture
                    color = [1, 1, 1, 1];
                } else if (t === BLOCKTYPE_WOOD) {
                    texNum = 3;                 // sampler3
                    weight = 1.0;
                    color = [1, 1, 1, 1];
                } else { // BLOCKTYPE_PURPDIAM
                    texNum = 4;                 // sampler2 (diamond.png)
                    weight = 0.65;              // tint with baseColor
                    color = [0.65, 0.35, 0.95, 1.0]; // purple base tint
                }

                const colorKey = color.join(",");
                if (lastWeight !== weight) { gl.uniform1f(u_texColorWeight, weight); lastWeight = weight; }
                if (lastColorKey !== colorKey) {
                    lastColorKey = colorKey;
                }

                g_tempCube.textureNum = texNum;
                g_tempCube.color = color;

                g_tempCube.matrix.setIdentity();
                const wx = (x - half) + 0.5;   // center of the cell
                const wz = (z - half) + 0.5;
                const baseY = groundHeightAt(wx, wz); // top of ground at this cell

                g_tempCube.matrix.setIdentity();
                g_tempCube.matrix.translate(x - half, baseY + y, z - half);
                g_tempCube.renderFast();
            }
        }
    }
    // restore default
    gl.uniform1f(u_texColorWeight, 1.0);
}

// Camera Movement and Add/delete blocks
// Press and hold: W: move forward, A/D: move left/right, S: move back, Q rotate left, E rotate right
function keydown(ev) {
    if (g_uiOpen) return;   // stop movement while UI overlay is open
    const k = ev.key.toLowerCase();
    if (k === 'w') g_camera.moveForward();
    if (k === 's') g_camera.moveBackwards();
    if (k === 'a') g_camera.moveLeft();
    if (k === 'd') g_camera.moveRight();
    if (k === 'q') { g_camera.panLeft(); initMouseLookFromCamera(); }
    if (k === 'e') { g_camera.panRight(); initMouseLookFromCamera(); }

    // switch brush with keyboard: 1, 2, 3
    if (k === '1') g_placeBrush = BLOCKTYPE_ORIGINAL;
    if (k === '2') g_placeBrush = BLOCKTYPE_WOOD;
    if (k === '3') g_placeBrush = BLOCKTYPE_PURPDIAM;
    if (k === '1' || k === '2' || k === '3') updateBrushHud();

    // simple Minecraft R add block | F delete block
    if (k === 'r' || k === 'f') {
        const cell = getFrontCell(1.7);
        if (!cell) return;

        const MAX_H = 4;
        let h = g_map[cell.z][cell.x];

        if (k === 'r') {
            if (h < MAX_H) {
                // place block at layer y = h
                g_blockType[cell.z][cell.x][h] = g_placeBrush;
                g_map[cell.z][cell.x] = h + 1;
            }
        }

        if (k === 'f') {
            if (h > 0) {
                // remove top block at layer y = h-1
                g_blockType[cell.z][cell.x][h - 1] = 0;
                g_map[cell.z][cell.x] = h - 1;
            }
        }
    }

    // p save world | l load world
    if (k === 'p') saveWorld();
    if (k === 'l') loadWorld();

}

// Perspective camera
function addMouseControl() {
    canvas.addEventListener('click', () => canvas.requestPointerLock());

    document.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement !== canvas) return;
        if (g_uiOpen) return; // camera won't rotate when menu open

        const MAX = 25; // prevent huge jumps
        const dx = Math.max(-MAX, Math.min(MAX, e.movementX));
        const dy = Math.max(-MAX, Math.min(MAX, e.movementY));

        g_camera.mouseLook(dx, dy);
    });
}

// get the canvas and gl context
function setupWebGL() {
    // webGL setup
    canvas = document.getElementById('webgl');
    if (!canvas) {
        console.log('Failed to retrieve the <canvas> element');
        return;
    }
    // a variable for drawing all the component on canvas
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
    if (!gl) {
        console.log('Failed to retrieve WebGL context');
        return;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
}

// compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL() {
    // initialize shaders
    if (!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)) {
        console.log('Failed to initialize shaders');
        return;
    }
    // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return false;
    }
    a_UV = gl.getAttribLocation(gl.program, 'a_UV');

    // connect Normal attribute
    a_Normal = gl.getUniformLocation(gl.program, 'a_Normal');
    if (!a_Normal) {
        console.log('Failed to get the storage location of a_Normal');
        return false;
    }

    // Get the storage location of u_FragColor
    u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return false;
    }

    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!u_ModelMatrix) {
        console.log('Failed to get the storage location of u_ModelMatrix');
        return false;
    }
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if (!u_GlobalRotateMatrix) {
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return false;
    }



    u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
    u_Sampler3 = gl.getUniformLocation(gl.program, 'u_Sampler3');
    u_Sampler4 = gl.getUniformLocation(gl.program, 'u_Sampler4');

    const I = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, I.elements);
    gl.uniformMatrix4fv(u_ViewMatrix, false, I.elements);
    gl.uniformMatrix4fv(u_ProjectionMatrix, false, I.elements);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, I.elements);
    gl.uniform1i(u_whichTexture, -2);
    gl.uniform4f(u_FragColor, 1, 1, 1, 1);

    u_texColorWeight = gl.getUniformLocation(gl.program, 'u_texColorWeight');
    if (!u_texColorWeight) {
        console.log('Failed to get u_texColorWeight');
        return false;
    }

    // atmosphere
    u_CameraPos = gl.getUniformLocation(gl.program, "u_CameraPos");
    u_FogColor = gl.getUniformLocation(gl.program, "u_FogColor");
    u_FogNear = gl.getUniformLocation(gl.program, "u_FogNear");
    u_FogFar = gl.getUniformLocation(gl.program, "u_FogFar");
    u_useFog = gl.getUniformLocation(gl.program, "u_useFog");

    // defaults
    gl.uniform4f(u_FogColor, 0.6, 0.75, 0.9, 1.0); // light sky-ish fog
    gl.uniform1f(u_FogNear, 8.0);
    gl.uniform1f(u_FogFar, 28.0);
    gl.uniform1i(u_useFog, 1);

    // default
    gl.uniform1f(u_texColorWeight, 0.0);
}

// a function that creates 32x32 map
function buildMap32() {
    g_map = [];
    for (let z = 0; z < MAP_SIZE; z++) {
        g_map[z] = [];
        for (let x = 0; x < MAP_SIZE; x++) {
            if (x === 0 || z === 0 || x === MAP_SIZE - 1 || z === MAP_SIZE - 1) g_map[z][x] = 4;
            else g_map[z][x] = 0;
        }
    }
    for (let z = 5; z < 27; z++) g_map[z][10] = 2;
    for (let x = 8; x < 20; x++) g_map[15][x] = 3;

    // init block type layers to match initial heights
    g_blockType = Array.from({ length: MAP_SIZE }, () =>
        Array.from({ length: MAP_SIZE }, () => [0, 0, 0, 0]) // y=0..3
    );

    // default all existing walls to ORIGINAL type
    for (let z = 0; z < MAP_SIZE; z++) {
        for (let x = 0; x < MAP_SIZE; x++) {
            const h = g_map[z][x];
            for (let y = 0; y < h; y++) {
                g_blockType[z][x][y] = BLOCKTYPE_ORIGINAL;
            }
        }
    }
}

// function that places collectibles over the map
function spawnDiamonds() {
    g_diamonds = [];
    g_diamondCollected = 0;
    g_readyToTurnIn = false;
    g_winShown = false;

    const half = MAP_SIZE / 2;
    const margin = 1.5; // keep away from boundary walls
    const minDist = 1.6;    // keep diamonds from clustering
    const want = (typeof DIAMOND_SPAWN_COUNT !== "undefined")
        ? DIAMOND_SPAWN_COUNT
        : DIAMOND_GOAL;

    let tries = 0;
    while (g_diamonds.length < want && tries < 5000) {
        tries++;

        // random world position inside map
        const wx = (Math.random() * (MAP_SIZE - 2 * margin)) - half + margin;
        const wz = (Math.random() * (MAP_SIZE - 2 * margin)) - half + margin;

        // reject if it's inside a block column
        if (isBlockedAtXZ(wx, wz)) continue;

        // reject if too close to croc
        if (Math.hypot(wx - CROC_POS[0], wz - CROC_POS[2]) < 2.0) continue;

        // reject if too close to another diamond
        let ok = true;
        for (const d of g_diamonds) {
            if (Math.hypot(wx - d.pos[0], wz - d.pos[2]) < minDist) {
                ok = false; break;
            }
        }
        if (!ok) continue;

        // sit on terrain height
        const groundY = groundHeightAt(wx, wz);
        const wy = groundY + 0.35;

        g_diamonds.push({ pos: [wx, wy, wz], taken: false, spin: Math.random() * 360 });
    }
}

// element for game
function drawDiamonds() {
    gl.uniform1f(u_texColorWeight, 0.513); // use texture

    g_diamondCube.textureNum = 2;
    g_diamondCube.color = [0.3, 0.95, 1.0, 1.0]; // diamond-cyan

    for (const d of g_diamonds) {
        if (d.taken) continue;

        const float_up_down = 0.05 * Math.sin(g_seconds * 4 + d.spin);
        const spin = (g_seconds * 90) + d.spin;

        g_diamondCube.matrix.setIdentity();
        g_diamondCube.matrix.translate(d.pos[0], d.pos[1] + float_up_down, d.pos[2]);
        g_diamondCube.matrix.rotate(spin, 0, 1, 0);
        g_diamondCube.matrix.scale(0.35, 0.35, 0.35);
        g_diamondCube.renderFast();
    }
}

// distance helper
function distTo(x, y, z, p) {
    return Math.hypot(x - p[0], y - p[1], z - p[2]);
}

// set the text of a HTML element
function sendTextToHTML(text, htmlID) {
    const htmlElm = document.getElementById(htmlID);
    if (!htmlElm) return;
    htmlElm.innerHTML = text;
}

// simple minecraft
function getFrontCell(reach = 1.7) {
    const ex = g_camera.eye.elements[0];
    const ez = g_camera.eye.elements[2];

    // forward = at - eye
    let fx = g_camera.at.elements[0] - ex;
    let fz = g_camera.at.elements[2] - ez;

    // ignore Y
    const len = Math.hypot(fx, fz);
    if (len < 1e-6) return null;
    fx /= len;
    fz /= len;

    // point in front of camera
    const wx = ex + fx * reach;
    const wz = ez + fz * reach;

    // world -> map index that match drawMap translate
    const half = MAP_SIZE / 2;
    const mx = Math.floor(wx + half);
    const mz = Math.floor(wz + half);

    if (mx < 0 || mx >= MAP_SIZE || mz < 0 || mz >= MAP_SIZE) return null;
    return { x: mx, z: mz };
}

function saveWorld() {
    localStorage.setItem("world32", JSON.stringify({
        map: g_map,
        type: g_blockType
    }));
}

function loadWorld() {
    const s = localStorage.getItem("world32");
    if (!s) return;

    const data = JSON.parse(s);
    g_map = data.map;
    g_blockType = data.type || g_blockType; // fallback if missing
}

function initMouseLookFromCamera() {
    const ex = g_camera.eye.elements[0];
    const ey = g_camera.eye.elements[1];
    const ez = g_camera.eye.elements[2];

    const ax = g_camera.at.elements[0];
    const ay = g_camera.at.elements[1];
    const az = g_camera.at.elements[2];

    const dx = ax - ex;
    const dy = ay - ey;
    const dz = az - ez;

    const len = Math.hypot(dx, dy, dz) || 1.0;

    // yaw around Y
    g_yaw = g_targetYaw = Math.atan2(dx, dz);
    // pitch up/down
    g_pitch = g_targetPitch = Math.asin(dy / len);
}

function applyMouseLookToCamera() {
    // smoothing
    const SMOOTH = 0.35;
    g_yaw += (g_targetYaw - g_yaw) * SMOOTH;
    g_pitch += (g_targetPitch - g_pitch) * SMOOTH;

    const ex = g_camera.eye.elements[0];
    const ey = g_camera.eye.elements[1];
    const ez = g_camera.eye.elements[2];

    // forward vector from yaw/pitch
    const fx = Math.sin(g_yaw) * Math.cos(g_pitch);
    const fy = Math.sin(g_pitch);
    const fz = Math.cos(g_yaw) * Math.cos(g_pitch);

    g_camera.at.elements[0] = ex + fx;
    g_camera.at.elements[1] = ey + fy;
    g_camera.at.elements[2] = ez + fz;

    // keep world-up to prevents roll
    g_camera.up.elements[0] = 0;
    g_camera.up.elements[1] = 1;
    g_camera.up.elements[2] = 0;

    g_camera.viewMatrix.setLookAt(
        g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2],
        g_camera.at.elements[0], g_camera.at.elements[1], g_camera.at.elements[2],
        g_camera.up.elements[0], g_camera.up.elements[1], g_camera.up.elements[2]
    );
}


let g_uiOpen = false;
let g_uiPage = 0;
let g_uiMode = "start"; // "start" | "help" | "story"

const UI_PAGES = {
    start: [
        {
            title: "Simple Minecraft",
            body:
                `Welcome!
Click Start to begin.

Tip: Click the canvas to lock mouse.
click ESC to unlock.`
        }
    ],
    help: [
        {
            title: "How to Play",
            body:
                `Controls:
                WASD = move
                R = add block
                F = remove block
                P = save world
                L = load world
                1/2/3 = switch brush

                Click canvas: lock mouse
                ESC: unlock mouse
                Press H: open/close this menu`
        }
    ],
    story: [
        {
            title: "Story 1/3",
            body:
                `You wake up in a blocky world.
A wall surrounds the land…`

        },
        {
            title: "Story 2/3",
            body:
                `Your camera is your eyes:
Click the canvas to lock the mouse and look around.\n Use Q/E to turn your view left/right as well.`
        },
        {
            title: "Story 3/3",
            body:
                `Main Mission: Diamond Hunt 💎
Blue diamond blocks are scattered across the ground.
To collect one, just walk close to it.\n\nAfter collecting ${DIAMOND_GOAL}/${DIAMOND_GOAL}, find the croc and walk up to it to finish the quest.
You’ll trigger a win animation — then you can keep exploring the world and play around with blocks!`
        }
    ]
};
UI_PAGES.win = [
    {
        title: "You Win!",
        body: `You collected 8 diamonds and brought them to the croc.\n Task Completed! \n\nYou’re free to keep exploring — have fun!`

    }
];

// ui 
function uiInit() {
    const overlay = document.getElementById("uiOverlay");
    const title = document.getElementById("uiTitle");
    const body = document.getElementById("uiBody");

    const btnBack = document.getElementById("btnBack");
    const btnNext = document.getElementById("btnNext");
    const btnClose = document.getElementById("btnClose");
    const btnHelp = document.getElementById("btnHelp");

    btnBack.onclick = () => uiBack();
    btnNext.onclick = () => uiNext();
    btnClose.onclick = () => uiClose();

    // clicking dark background closes
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) uiClose();
    });

    // help button toggles help menu
    btnHelp.onclick = () => {
        if (g_uiOpen && g_uiMode === "help") uiClose();
        else uiOpen("help", 0);
    };

    // Press "H" to open help menu
    document.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "h") {
            if (g_uiOpen && g_uiMode === "help") uiClose();
            else uiOpen("help", 0);
        }
    });

    const btnReplay = document.getElementById("btnReplay");

    btnReplay.onclick = () => {
        // toggle story replay
        if (g_uiOpen && g_uiMode === "story") uiClose();
        else uiOpen("story", 0);
    };

    function render() {
        const pages = UI_PAGES[g_uiMode];
        const page = pages[g_uiPage];

        title.textContent = page.title;
        body.textContent = page.body;

        // default
        btnNext.style.display = "inline-block";
        btnClose.style.display = "inline-block";

        btnBack.style.display = (g_uiPage > 0) ? "inline-block" : "none";
        btnNext.textContent = (g_uiPage < pages.length - 1) ? "Next" : "Start";

        // In "help" page
        if (g_uiMode === "help") {
            btnBack.style.display = "none";
            btnNext.style.display = "none";
        } else if (g_uiMode === "story") {
            btnClose.style.display = "none"; // hide the separate Close button
            btnNext.style.display = "inline-block"; // keep Next
            btnNext.textContent = (g_uiPage < pages.length - 1) ? "Next" : "Close";
        } else if (g_uiMode === "win") {
            btnBack.style.display = "none";
            btnNext.style.display = "none";
            btnClose.style.display = "inline-block";
        }
    }

    window.uiOpen = function (mode, pageIndex = 0) {
        g_uiOpen = true;
        g_uiMode = mode;
        g_uiPage = pageIndex;

        overlay.classList.remove("hidden");
        render();

        // If menu opens, unlock mouse so user can click buttons
        if (document.pointerLockElement === canvas) document.exitPointerLock();
    };

    window.uiClose = function () {
        g_uiOpen = false;
        overlay.classList.add("hidden");
    };

    window.uiNext = function () {
        const pages = UI_PAGES[g_uiMode];

        if (g_uiMode === "start") {
            // Start menu: Next means go to story or close
            uiOpen("story", 0);
            return;
        }

        if (g_uiMode === "help") {
            // help: Next on last page closes
            if (g_uiPage >= pages.length - 1) { uiClose(); return; }
        }

        if (g_uiPage < pages.length - 1) g_uiPage++;
        else uiClose();

        render();
    };

    window.uiBack = function () {
        if (g_uiPage > 0) g_uiPage--;
        render();
    };
}

// add my blocky animal to world, a simplifed version
function drawCrocCube(mat, color) {
    g_crocCube.textureNum = -2;   // solid color
    g_crocCube.color = color;
    g_crocCube.matrix.set(mat);
    g_crocCube.renderFast();
}
function startCrocWinAnim() {
    g_crocWinActive = true;
    g_crocWinStart = g_seconds;
    g_cash = [];

    // spawn near croc "mouth" area (tweak if you want)
    const spawn = [CROC_POS[0] + 0.55, CROC_POS[1] + 0.65, CROC_POS[2] + 0.15];

    for (let i = 0; i < 80; i++) {
        const vx = (Math.random() * 2 - 1) * 1.1;
        const vy = (Math.random() * 2 - 1) * 0.9 + 0.6;
        const vz = (Math.random() * 2 - 1) * 1.1;

        g_cash.push({
            p: spawn.slice(),
            v: [vx, vy, vz],
            r: Math.random() * 360,
            vr: (Math.random() * 2 - 1) * 360,
            life: 2.0 + Math.random() * 0.6,
        });
    }
}

function updateCrocWinAnim(dtSec) {
    if (!g_crocWinActive) return;

    const t = g_seconds - g_crocWinStart;

    // after explode, update particles
    if (t >= WIN_EXPLODE_AT) {
        for (const m of g_cash) {
            m.life -= dtSec;

            m.v[1] -= 2.0 * dtSec;
            m.v[0] *= (1 - 0.25 * dtSec);
            m.v[2] *= (1 - 0.25 * dtSec);

            m.p[0] += m.v[0] * dtSec;
            m.p[1] += m.v[1] * dtSec;
            m.p[2] += m.v[2] * dtSec;
            m.r += m.vr * dtSec;
        }
        g_cash = g_cash.filter(m => m.life > 0);
    }

    // show win UI
    if (t >= WIN_TOTAL) {
        g_crocWinActive = false;
        g_cash = [];
        if (!g_uiOpen || g_uiMode !== "win") uiOpen("win", 0);
    }
}

function renderCrocInWorld(wx, wy, wz, yawDeg) {
    gl.uniform1f(u_texColorWeight, 0.0);

    const tWin = g_crocWinActive ? (g_seconds - g_crocWinStart) : 0;

    // explode phase: draw cash only
    if (g_crocWinActive && tWin >= WIN_EXPLODE_AT) {
        g_tempCube.textureNum = -2;
        g_tempCube.color = [0.133, 0.545, 0.133, 1.0];  // cash color

        const bill = new Matrix4();
        for (const m of g_cash) {
            bill.setIdentity();
            bill.translate(m.p[0], m.p[1], m.p[2]);
            bill.rotate(m.r, 0, 1, 0);
            bill.scale(0.18, 0.10, 0.01);
            g_tempCube.matrix.set(bill);
            g_tempCube.renderFast();
        }

        gl.uniform1f(u_texColorWeight, 1.0);
        return;
    }

    // base transform
    croc_base.setIdentity();
    croc_base.translate(wx + 1.5, wy + 0.51, wz);
    croc_base.rotate(yawDeg, 0, 1, 0);
    croc_base.scale(1.2, 1.2, 1.2);

    // croc shake on win
    if (g_crocWinActive) {
        const shake = 8 * Math.sin(tWin * 45);
        const float_up_down = 0.05 * Math.sin(tWin * 60);
        croc_base.translate(0, float_up_down, 0);
        croc_base.rotate(shake, 0, 1, 0);
        croc_base.rotate(shake * 0.4, 1, 0, 0);
    }

    if (g_crocWinActive) {
        tail1 = 30 * Math.sin(tWin * 30);
        tail2 = 45 * Math.sin(tWin * 35 + Math.PI / 3);
        jaw = 40 + 15 * Math.sin(tWin * 25);
    }

    // BODY
    croc_body.set(croc_base);
    croc_body.translate(-0.55, 0.05, 0.00);
    croc_body.scale(0.90, 0.22, 0.40);
    drawCrocCube(croc_body, CROC_MID);

    // BELLY slab
    croc_belly.set(croc_base);
    croc_belly.translate(-0.52, 0.02, 0.03);
    croc_belly.scale(0.84, 0.12, 0.34);
    drawCrocCube(croc_belly, CROC_BELLY);

    // TAIL joint 1
    croc_tailJ1.set(croc_base);
    croc_tailJ1.translate(-0.55, 0.10, 0.20);
    croc_tailJ1.rotate(-tail1, 0, 1, 0);

    croc_tail1.set(croc_tailJ1);
    croc_tail1.translate(-0.30, -0.06, -0.08);
    croc_tail1.scale(0.30, 0.14, 0.16);
    drawCrocCube(croc_tail1, CROC_DARK);

    // TAIL joint 2
    croc_tailJ2.set(croc_tailJ1);
    croc_tailJ2.translate(-0.30, 0.00, 0.00);
    croc_tailJ2.rotate(-tail2, 0, 1, 0);

    croc_tail2.set(croc_tailJ2);
    croc_tail2.translate(-0.24, -0.05, -0.06);
    croc_tail2.scale(0.24, 0.12, 0.12);
    drawCrocCube(croc_tail2, CROC_MID);

    // HEAD
    croc_head.set(croc_base);
    croc_head.translate(0.31, 0.02, 0.05);
    croc_head.scale(0.26, 0.20, 0.30);
    drawCrocCube(croc_head, CROC_LIGHT);

    // SNOUT
    croc_snout.set(croc_base);
    croc_snout.translate(0.55, 0.01, 0.09);
    croc_snout.scale(0.30, 0.12, 0.22);
    drawCrocCube(croc_snout, CROC_MID);

    // JAW (with simple animation)
    croc_jawJ.set(croc_base);
    croc_jawJ.translate(0.55, 0.05, 0.20);
    croc_jawJ.rotate(-jaw, 0, 0, 1);

    croc_jaw.set(croc_jawJ);
    croc_jaw.translate(0.00, -0.06, -0.11);
    croc_jaw.scale(0.30, 0.05, 0.22);
    drawCrocCube(croc_jaw, CROC_MID);

    // EYES
    croc_eye1.set(croc_base);
    croc_eye1.translate(0.50, 0.140, 0.07);
    croc_eye1.scale(0.10, 0.055, 0.10);
    drawCrocCube(croc_eye1, CROC_EYE);

    croc_eye2.set(croc_base);
    croc_eye2.translate(0.50, 0.140, 0.24);
    croc_eye2.scale(0.10, 0.055, 0.10);
    drawCrocCube(croc_eye2, CROC_EYE);

    croc_iris1.set(croc_base);
    croc_iris1.translate(0.57, 0.15, 0.11);
    croc_iris1.scale(0.04, 0.04, 0.04);
    drawCrocCube(croc_iris1, CROC_IRIS);

    croc_iris2.set(croc_base);
    croc_iris2.translate(0.57, 0.15, 0.28);
    croc_iris2.scale(0.04, 0.04, 0.04);
    drawCrocCube(croc_iris2, CROC_IRIS);

    // ---- LEGS (4 simple block legs) ----
    function drawLeg(anchorX, anchorZ, phase) {
        // mild walk swing to add mild animation
        const swing = 12 * Math.sin(g_seconds * 4 + phase);
        const kneeBend = 10 * Math.max(0, Math.sin(g_seconds * 4 + phase + Math.PI / 2));

        // hip under body
        croc_hip.set(croc_base);
        croc_hip.translate(anchorX, 0.06, anchorZ);
        croc_hip.rotate(swing, 0, 0, 1);

        // thigh
        croc_thigh.set(croc_hip);
        croc_thigh.translate(0.00, -0.12, 0.00);
        croc_thigh.scale(0.10, 0.12, 0.10);
        drawCrocCube(croc_thigh, CROC_DARK);

        // knee + calf
        croc_knee.set(croc_hip);
        croc_knee.translate(0.02, -0.12, 0.00);
        croc_knee.rotate(kneeBend, 0, 0, 1);

        croc_calf.set(croc_knee);
        croc_calf.translate(0.00, -0.10, 0.00);
        croc_calf.scale(0.08, 0.10, 0.08);
        drawCrocCube(croc_calf, CROC_DARK);

        // foot
        croc_ankle.set(croc_knee);
        croc_ankle.translate(0.00, -0.14, 0.02);

        croc_foot.set(croc_ankle);
        croc_foot.translate(-0.02, 0.00, -0.04);
        croc_foot.scale(0.14, 0.04, 0.16);
        drawCrocCube(croc_foot, CROC_DARK);
    }

    drawLeg(-0.10, 0.08, 0);          // front-right
    drawLeg(-0.10, 0.28, Math.PI);    // front-left (opposite)
    drawLeg(-0.40, 0.08, Math.PI);    // back-right
    drawLeg(-0.40, 0.28, 0);          // back-left

    if (g_crocWinActive) {
        const shake = 8 * Math.sin(tWin * 45);     // degrees
        const float_up_down = 0.05 * Math.sin(tWin * 60);  // small Y float_up_down
        croc_base.translate(0, float_up_down, 0);
        croc_base.rotate(shake, 0, 1, 0);
        croc_base.rotate(shake * 0.4, 1, 0, 0);
    }

    // restore texture weight for your blocks after animal
    gl.uniform1f(u_texColorWeight, 1.0);
}

function updateDiamondQuest() {
    const ex = g_camera.eye.elements[0];
    const ey = g_camera.eye.elements[1];
    const ez = g_camera.eye.elements[2];

    const PICKUP_R = 1.0;

    // only count up to 8/8
    if (g_diamondCollected < DIAMOND_GOAL) {
        for (const d of g_diamonds) {
            if (d.taken) continue;

            if (distTo(ex, ey, ez, d.pos) < PICKUP_R) {
                d.taken = true;
                g_diamondCollected++;
                if (g_diamondCollected >= DIAMOND_GOAL) {
                    g_diamondCollected = DIAMOND_GOAL;
                    g_readyToTurnIn = true;
                }
                break; // collect at most 1 per frame
            }
        }
    }

    // HUD text
    const hudMsg = g_readyToTurnIn
        ? `Collected Diamonds: ${g_diamondCollected}/${DIAMOND_GOAL} | Go to the croc!`
        : `Collected Diamonds: ${g_diamondCollected}/${DIAMOND_GOAL}`;

    sendTextToHTML(hudMsg, "taskBox");


    // win condition: after 8/8 get close to croc
    if (!g_winShown && g_readyToTurnIn) {
        const crocCenter = [CROC_POS[0], CROC_POS[1] + 0.4, CROC_POS[2]];
        if (distTo(ex, ey, ez, crocCenter) < 2.2) {
            g_winShown = true;
            startCrocWinAnim();
        }
    }
}

// function that builds terrain
function buildSimpleTerrain() {
    const N = MAP_SIZE / TERRAIN_STEP; // 32/4 = 8
    g_groundHeights = Array.from({ length: N }, () => Array(N).fill(0));

    // Each hill raises nearby tiles by distance falloff.
    addHill(N, 2, 2, 3, 2);
    addHill(N, 5, 3, 2, 1);
    addHill(N, 4, 6, 3, 2);

    function addHill(N, cx, cz, radius, maxH) {
        for (let z = 0; z < N; z++) {
            for (let x = 0; x < N; x++) {
                const dx = x - cx;
                const dz = z - cz;
                const d = Math.sqrt(dx * dx + dz * dz);
                if (d > radius) continue;

                const t = 1 - d / radius;
                const h = Math.round(maxH * t); // integer levels
                g_groundHeights[z][x] = Math.max(g_groundHeights[z][x], h);
            }
        }
    }
}

// ground from flattened cube + optional terrain slabs
function drawGround() {
    // ground created with a flattened cube
    gl.uniform1f(u_texColorWeight, 0.0);
    g_tempCube.textureNum = -2;
    g_tempCube.color = [0.2, 0.8, 0.2, 1.0];

    g_tempCube.matrix.setIdentity();
    g_tempCube.matrix.translate(0, BASE_GROUND_Y, 0);
    g_tempCube.matrix.scale(40, BASE_GROUND_THICK, 40);
    g_tempCube.matrix.translate(-0.5, 0, -0.5);
    g_tempCube.renderFast();

    // add optional “terrain map”
    if (!USE_SIMPLE_TERRAIN) return;

    const half = MAP_SIZE / 2;
    const N = MAP_SIZE / TERRAIN_STEP;

    for (let tz = 0; tz < N; tz++) {
        for (let tx = 0; tx < N; tx++) {
            const level = g_groundHeights[tz][tx];
            if (level <= 0) continue;

            const bumpH = level * TERRAIN_UNIT_H;

            const wx = (tx * TERRAIN_STEP - half) + TERRAIN_STEP * 0.5;
            const wz = (tz * TERRAIN_STEP - half) + TERRAIN_STEP * 0.5;

            const yBottom = BASE_GROUND_Y + BASE_GROUND_THICK; // sit on top of base

            g_tempCube.textureNum = -2;
            g_tempCube.color = [0.18, 0.75, 0.18, 1.0];

            g_tempCube.matrix.setIdentity();
            g_tempCube.matrix.translate(wx, yBottom, wz);   // bottom at yBottom
            g_tempCube.matrix.scale(TERRAIN_STEP, bumpH, TERRAIN_STEP);
            g_tempCube.matrix.translate(-0.5, 0, -0.5);

            g_tempCube.renderFast();
        }
    }
}

function groundHeightAt(wx, wz) {
    let y = BASE_GROUND_Y + BASE_GROUND_THICK;  // top of base

    if (!USE_SIMPLE_TERRAIN) return y;

    const half = MAP_SIZE / 2;
    const N = MAP_SIZE / TERRAIN_STEP;

    const tx = Math.max(0, Math.min(N - 1, Math.floor((wx + half) / TERRAIN_STEP)));
    const tz = Math.max(0, Math.min(N - 1, Math.floor((wz + half) / TERRAIN_STEP)));

    const bumpH = g_groundHeights[tz][tx] * TERRAIN_UNIT_H;
    return y + bumpH;
}


function updateBrushHud() {
    const el = document.getElementById("brushHud");
    if (!el) return;

    // little pop animation
    el.classList.remove("pop");
    void el.offsetWidth; // restart animation
    el.classList.add("pop");
    setTimeout(() => el.classList.remove("pop"), 140);

    const name =
        (g_placeBrush === BLOCKTYPE_ORIGINAL) ? "Original" :
            (g_placeBrush === BLOCKTYPE_WOOD) ? "Wood" :
                "Purple Diamond";

    el.textContent = `Brush: ${g_placeBrush} (${name})  |  click keyboard 1/2/3 to select`;
}

function initBrushSelect() {
    const s = document.getElementById("brushSelect");
    if (!s) return;

    // start value matches current brush
    s.value = String(g_placeBrush);

    s.onchange = () => {
        g_placeBrush = parseInt(s.value); // 1 or 2
        updateBrushHud();
    };
}
