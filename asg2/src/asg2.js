/**
 * Reference: I asked ChatGPT to model and verify the matrix for the blocky animal.
 * Also, it guides me through functions like addMouseControl() and the poke animation.
 * Besides, I used AI to check my modeling logic and verify my math during the transformation.
 * Overall, code implementation and testing were done by me.
 */

// Vertex shader program
var VERTEX_SHADER = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotation;
    void main() {
        gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position; 
    }`

// Fragment shader program
var FRAGMENT_SHADER = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`

    

// fps
let g_fpsBuffer = [];
let g_msBuffer = [];
// Croc RGBA
const CROC_DARK  = [0.18, 0.259, 0.102, 1.0];
const CROC_MID   = [0.29, 0.392, 0.176, 1.0];
const CROC_LIGHT = [0.24, 0.392, 0.176, 1.0];
const CROC_BELLY = [0.624, 0.643, 0.396, 1.0];
const CROC_TOOTH = [0.95, 0.95, 0.95, 1.0];
const CROC_EYE   = [0.78, 0.76, 0.09, 1.0];
const CROC_IRIS   = [0.05, 0.05, 0.05, 1.0];

// rotation for mouse
let g_mouseXAngle = 58;     // around Y-axis
let g_mouseYAngle = -30;    // around X-axis
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseDragging = false;

// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotation;

// Global variable for UI
let g_walkAnimation = false;

// Crocodile 
let g_globalAngle = 0;
let g_tail1Angle = 25;   // near body
let g_tail2Angle = 10;   // tip
let g_jawAngle = 0;
let g_tailAnimation = false;
let g_jawAnimation = false;
let gAnimateAll = false;  // controls whether everything animates at once

// fps
let g_lastFrameMS = performance.now();
let g_fpsSMA = 0;   // smoothed fps
let g_msSMA = 0;    // smoothed frame time in ms


// 3-level joint
let g_thigh = 0;
let g_calf  = 0;
let g_foot  = 0;

// Poke and explode animation
let g_pokeActive = false;
let g_pokeStart = 0;
let g_prevSeconds = 0;
const POKE_DURATION = 2.5;
const EXPLODE_AT = 0.55;
let g_money = []; 

window.onload = function() {
    main();
};

// Set up action for the HTML UI elements
function addActionsForHtmlUI(){

    // Slider Events
    document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = parseFloat(this.value); renderScene(); });
    document.getElementById('tail1Slide').addEventListener('input', function() { g_tail1Angle = parseFloat(this.value); renderScene(); });
    document.getElementById('tail2Slide').addEventListener('input', function() { g_tail2Angle = parseFloat(this.value); renderScene(); });
    document.getElementById('jawSlide').addEventListener('input', function() { g_jawAngle = parseFloat(this.value); renderScene(); });
    document.getElementById('thighSlide').addEventListener('input', function () { g_thigh = parseFloat(this.value); renderScene(); });
    document.getElementById('calfSlide').addEventListener('input', function () { g_calf = parseFloat(this.value); renderScene(); });
    document.getElementById('footSlide').addEventListener('input', function () { g_foot = parseFloat(this.value); renderScene(); });

    // Button Events
    document.getElementById('tailOnButton').onclick = function() { g_tailAnimation  = true; };
    document.getElementById('tailOffButton').onclick = function() { g_tailAnimation  = false; };
    document.getElementById('jawOnButton').onclick = function() { g_jawAnimation = true; };
    document.getElementById('jawOffButton').onclick = function() { g_jawAnimation = false; };
    document.getElementById('walkOnButton').onclick  = function() { g_walkAnimation = true; };
    document.getElementById('walkOffButton').onclick = function() { g_walkAnimation = false; };
    document.getElementById("animateAllOn").onclick = function() { gAnimateAll = true; };
    document.getElementById("animateAllOff").onclick = function() { gAnimateAll = false; };

}

function main() {  
    setupWebGL();
    // set up GLSL shader program and connect to GLSL variables
    connectVariablesToGLSL();
    // Set up action for the HTML UI elements
    addActionsForHtmlUI();

    addMouseControl(); 

    // specify the clear color
    gl.clearColor(0.5, 0.8, 0.5, 1.0);  // green background
    requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// called by browser repeatly whenever its time
function tick() {
    const now = performance.now();
    const dt = now - g_lastFrameMS; // ms since last frame
    g_lastFrameMS = now;

    g_seconds = now/1000.0 - g_startTime;
    // Smooth FPS over last 10 frames
    g_fpsBuffer.push(1000 / dt);
    g_msBuffer.push(dt);
    if(g_fpsBuffer.length > 10) g_fpsBuffer.shift();
    if(g_msBuffer.length > 10) g_msBuffer.shift();

    g_fpsSMA = g_fpsBuffer.reduce((a,b)=>a+b,0)/g_fpsBuffer.length;
    g_msSMA  = g_msBuffer.reduce((a,b)=>a+b,0)/g_msBuffer.length;

    updateAnimationAngles();
    renderScene();

    // Update FPS display
    sendTextToHTML(`FPS: ${g_fpsSMA.toFixed(1)} | ${g_msSMA.toFixed(1)} ms`, "numdot");

    requestAnimationFrame(tick);
}

function updateAnimationAngles(){
    const dt = g_seconds - g_prevSeconds;
    g_prevSeconds = g_seconds;

    if (g_pokeActive) {
        const t = g_seconds - g_pokeStart;

        // jaw opens + tail shakes before explosion
        if (t < EXPLODE_AT) {
        g_jawAngle = 35 + 10 * Math.sin(t * 25);
        g_tail1Angle = 20 * Math.sin(t * 30);
        } else {
        // after explosion, update money particles
        for (const m of g_money) {
            m.life -= dt;

            m.v[1] -= 0.9 * dt;
            m.v[0] *= (1 - 0.25 * dt);
            m.v[2] *= (1 - 0.25 * dt);

            m.p[0] += m.v[0] * dt;
            m.p[1] += m.v[1] * dt;
            m.p[2] += m.v[2] * dt;
            m.r += m.vr * dt;
        }
            g_money = g_money.filter(m => m.life > 0);
        }

        if (t > POKE_DURATION) {
            g_pokeActive = false;
            g_money = [];
        }
    }

    if (g_tailAnimation) {
        g_tail1Angle = 20 * Math.sin(g_seconds);
        g_tail2Angle = 35 * Math.sin(g_seconds + Math.PI / 3);
    }

    if(g_jawAnimation){
        g_jawAngle = 36*Math.sin(g_seconds*2);  // jaw open and close
        if (g_jawAngle < 0) g_jawAngle = 0; // never close past 0
    } 
    if (g_walkAnimation) {
        g_thigh = 16 * Math.sin(g_seconds * 4);
        g_calf  = 15 * Math.sin(g_seconds * 4 + Math.PI / 2);
        g_foot  = 15 * Math.sin(g_seconds * 4 + Math.PI);
    }

    if (gAnimateAll) {
        g_tail1Angle = 20 * Math.sin(g_seconds);
        g_tail2Angle = 35 * Math.sin(g_seconds + Math.PI / 3);
        g_jawAngle = 36*Math.sin(g_seconds* 3);  // jaw open and close
        if (g_jawAngle < 0) g_jawAngle = 0; // never close past 0
        g_thigh = 16 * Math.sin(g_seconds * 4);
        g_calf  = 15 * Math.sin(g_seconds * 4 + Math.PI / 2);
        g_foot  = 15 * Math.sin(g_seconds * 4 + Math.PI);
    }
}

// Draw every shape that suppose to be in canvas
function renderScene(){

    // Global rotation
    var globalRotMat = new Matrix4();
    globalRotMat.rotate(g_mouseYAngle, 1, 0, 0);   
    globalRotMat.rotate(g_mouseXAngle + g_globalAngle, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Base pose
    const base = new Matrix4();
    base.translate(-0.55, -0.15, 0.0);

    // poke animation: explode and money burst
    if (g_pokeActive && (g_seconds - g_pokeStart) >= EXPLODE_AT) {
    for (const m of g_money) {
        const bill = new Matrix4(base);
        bill.translate(m.p[0], m.p[1], m.p[2]);
        bill.rotate(m.r, 0, 1, 0);
        bill.scale(0.06, 0.03, 0.002);     // flat bill
        drawCube(bill, [0.10, 0.65, 0.20, 1.0]);
    }
    return; // hide the croc after explosion
    }

    // ---- Body ----
    const body = new Matrix4(base);
    body.scale(0.90, 0.22, 0.40);
    drawCube(body, CROC_MID);

    // Belly slab (slightly inset + lighter)
    const belly = new Matrix4(base);
    belly.translate(0.03, -0.01, 0.03);
    belly.scale(0.84, 0.12, 0.34);
    drawCube(belly, CROC_BELLY);

    // Back spikes (row of small cubes)
    for (let i = 0; i < 7; i++) {
        const spike = new Matrix4(base);
        spike.translate(0.12 + i * 0.11, 0.20, 0.16);
        spike.scale(0.06, 0.06, 0.10);
        drawCube(spike, CROC_DARK);
    }

    // ---- Tail (with animation) ----
    // Tail joint 1 (attached to body)
    const tailJoint1 = new Matrix4(base);
    tailJoint1.translate(0.00, 0.10, 0.20);
    tailJoint1.rotate(-g_tail1Angle, 0, 1, 0);

    // Tail part 1
    const tail1 = new Matrix4(tailJoint1);
    tail1.translate(-0.30, -0.06, -0.08);
    tail1.scale(0.30, 0.14, 0.16);
    drawCube(tail1, CROC_DARK);

    // Tail joint 2 (at end of tail part 1)
    const tailJoint2 = new Matrix4(tailJoint1);
    tailJoint2.translate(-0.30, 0.00, 0.00);
    tailJoint2.rotate(-g_tail2Angle, 0, 1, 0);

    // Tail part 2 (tip)
    const tail2 = new Matrix4(tailJoint2);
    tail2.translate(-0.24, -0.05, -0.06);
    tail2.scale(0.24, 0.12, 0.12);
    drawCube(tail2, CROC_MID);

    // ---- Head and snout ----
    const head = new Matrix4(base);
    head.translate(0.86, 0.02, 0.05);
    head.scale(0.26, 0.20, 0.30);
    drawCube(head, CROC_LIGHT);

    const snout = new Matrix4(base);
    snout.translate(1.10, 0.01, 0.09);
    snout.scale(0.30, 0.12, 0.22);
    drawCube(snout, CROC_MID);

    // ---- Lower jaw (animated) ----
    const jawJoint = new Matrix4(base);
    jawJoint.translate(1.10, 0.05, 0.20);
    jawJoint.rotate(-g_jawAngle, 0, 0, 1);

    const lowerJaw = new Matrix4(jawJoint);
    lowerJaw.translate(0.00, -0.06, -0.11);    //rotates down
    lowerJaw.scale(0.30, 0.05, 0.22);
    drawCube(lowerJaw, CROC_MID);

    // Teeth in Pyramid shape
    for (let i = 0; i < 6; i++) {
        // Upper right teeth
        const topTooth = new Pyramid();
        topTooth.color = CROC_TOOTH;
        topTooth.parentMatrix = base;
        topTooth.position = [1.13 + i * 0.04, 0.04, 0.09];
        topTooth.size = 0.0465;
        topTooth.scale = [1.0, -1.0, 1.0];   // flip Y so apex points down
        topTooth.render();

        // upper left teeth
        const topLeftTooth = new Pyramid();
        topLeftTooth.color = CROC_TOOTH;
        topLeftTooth.parentMatrix = base;
        topLeftTooth.position = [1.13 + i * 0.04, 0.04, 0.263];
        topLeftTooth.size = 0.0465;
        topLeftTooth.scale = [1.0, -1.0, 1.0];   // flip Y so apex points down
        topLeftTooth.render();

        // Lower right teeth (follow the jaw animation)
        const botTooth = new Pyramid();
        botTooth.color = CROC_TOOTH;
        botTooth.parentMatrix = jawJoint;
        botTooth.position = [0.03 + i * 0.04, -0.02, -0.1];
        botTooth.size = 0.0465;
        botTooth.scale = [1.0, 1.0, 1.0];    // apex points up
        botTooth.render();

        // lower left teeth
        const botLeftTooth = new Pyramid();
        botLeftTooth.color = CROC_TOOTH;
        botLeftTooth.parentMatrix = jawJoint;
        botLeftTooth.position = [0.03 + i * 0.04, -0.02, 0.063];
        botLeftTooth.size = 0.0465;
        botLeftTooth.scale = [1.0, 1.0, 1.0];
        botLeftTooth.render();
    }

    // Eyes
    const eye1 = new Matrix4(base);
    eye1.translate(1.05, 0.135, 0.07);
    eye1.scale(0.1, 0.055, 0.1);
    drawCube(eye1, CROC_EYE);

    const eye2 = new Matrix4(base);
    eye2.translate(1.05, 0.135, 0.24);
    eye2.scale(0.1, 0.055, 0.1);
    drawCube(eye2, CROC_EYE);

    const iris1 = new Cylinder();
    iris1.color = CROC_IRIS;
    iris1.parentMatrix = base;
    iris1.position = [1.155, 0.16, 0.13];
    iris1.radius = 0.03;
    iris1.height = 0.03;
    iris1.segments = 20;
    iris1.scale = [0.87,0.87,0.87];
    iris1.rotation = [90, 0, 0, 1];   // rotate z axis
    iris1.render();

    const iris2 = new Cylinder();
    iris2.color = CROC_IRIS;
    iris2.parentMatrix = base;
    iris2.position = [1.155, 0.16, 0.293];
    iris2.radius = 0.03;
    iris2.height = 0.03;
    iris2.segments = 20;
    iris2.scale = [0.87,0.87,0.87];
    iris2.rotation = [90, 0, 0, 1];   // rotate z axis
    iris2.render();


    // 4 Legs hierarchy
    // three-level joint (motion hierarchy: thigh → calf → foot)
    function drawLeg(x, y, z, sideSign){
        const hip = new Matrix4(base);
        hip.translate(x, y, z);
        hip.rotate(g_thigh, 0, 0, 1);

        const thigh = new Matrix4(hip);
        thigh.scale(0.105, 0.105, 0.105);
        drawCube(thigh, CROC_DARK);

        const knee = new Matrix4(hip);
        knee.translate(0.06, -0.08, 0.0);
        knee.rotate(g_calf, 0, 0, 1);

        const calf = new Matrix4(knee);
        calf.scale(0.08, 0.10, 0.08);
        drawCube(calf, CROC_DARK);

        const ankle = new Matrix4(knee);
        ankle.translate(0.05, -0.05, -0.05);
        ankle.rotate(g_foot, 0, 0, 1);

        const foot = new Matrix4(ankle);
        foot.translate(-0.01, 0.04, -0.05 * sideSign);
        foot.scale(0.14, 0.04, 0.16);
        drawCube(foot, CROC_DARK);
    }

    // Front pair
    drawLeg(0.62, -0.02, 0.06, +1);
    drawLeg(0.62, -0.02, 0.28, -1);

    // Back pair
    drawLeg(0.18, -0.02, 0.06, +1);
    drawLeg(0.18, -0.02, 0.28, -1);
}

// set the text of a HTML element
function sendTextToHTML(text, htmlID){
    var htmlElm = document.getElementById(htmlID);
    if(!htmlElm){
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}

// get the canvas and gl context
function setupWebGL(){
    // webGL setup
    canvas = document.getElementById('webgl');  
    if (!canvas) { 
        console.log('Failed to retrieve the <canvas> element');
        return false; 
    } 
    // a variable for drawing all the component on canvas
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
    if(!gl){
        console.log('Failed to retrieve WebGL content');
        return false;
    }
    gl.enable(gl.DEPTH_TEST);
}

// compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL(){
    // initialize shaders
    if(!initShaders(gl, VERTEX_SHADER, FRAGMENT_SHADER)){
        console.log('Failed to initialize shaders');
        return false;
    }

    // Get the storage location of a_Position
    a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
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

    u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
    if(!u_GlobalRotation){
        console.log('Failed to get the storage location of u_GlobalRotation');
        return false;
    }

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function drawCube(matrix, color) {
    color = color || [1.0, 0.0, 0.0, 1.0];  // default red

    // Pass the color of a point to u_FragColor variable
    //gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
    // Send the transformation matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

    // FRONT (slightly brighter)
    gl.uniform4f(u_FragColor, color[0]*1.0, color[1]*1.0, color[2]*1.0, color[3]);
    drawTriangle3D([0,0,0, 1,1,0, 1,0,0]);
    drawTriangle3D([0,0,0, 0,1,0, 1,1,0]);

    // BACK (slightly darker)
    gl.uniform4f(u_FragColor, color[0]*0.8, color[1]*0.8, color[2]*0.8, color[3]);
    drawTriangle3D([0,0,1, 1,0,1, 1,1,1]);
    drawTriangle3D([0,0,1, 1,1,1, 0,1,1]);

    // LEFT (darker)
    gl.uniform4f(u_FragColor, color[0]*0.7, color[1]*0.7, color[2]*0.7, color[3]);
    drawTriangle3D([0,0,0, 0,0,1, 0,1,1]);
    drawTriangle3D([0,0,0, 0,1,1, 0,1,0]);

    // RIGHT (same as left)
    gl.uniform4f(u_FragColor, color[0]*0.7, color[1]*0.7, color[2]*0.7, color[3]);
    drawTriangle3D([1,0,0, 1,1,1, 1,0,1]);
    drawTriangle3D([1,0,0, 1,1,0, 1,1,1]);

    // TOP (slightly dark)
    gl.uniform4f(u_FragColor, color[0]*0.9, color[1]*0.9, color[2]*0.9, color[3]);
    drawTriangle3D([0,1,0, 0,1,1, 1,1,1]);
    drawTriangle3D([0,1,0, 1,1,1, 1,1,0]);

    // BOTTOM (darkest)
    gl.uniform4f(u_FragColor, color[0]*0.6, color[1]*0.6, color[2]*0.6, color[3]);
    drawTriangle3D([0,0,0, 1,0,1, 0,0,1]);
    drawTriangle3D([0,0,0, 1,0,0, 1,0,1]);
}

function addMouseControl() {

    canvas.onmouseup = canvas.onmouseleave = ev => g_mouseDragging = false;

    canvas.onmousemove = ev => {
        if (!g_mouseDragging) return;  // only rotate when dragging

        let dx = ev.clientX - g_lastMouseX;
        let dy = ev.clientY - g_lastMouseY;

        g_mouseXAngle -= dx * 0.3;
        g_mouseYAngle -= dy * 0.3;

        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    };

    canvas.onmousedown = ev => {
    if (ev.shiftKey){  // shift-click triggers
        triggerPokeExplosion();
        g_mouseDragging = false;
        return;
    }
    g_mouseDragging = true;
    g_lastMouseX = ev.clientX;
    g_lastMouseY = ev.clientY;
    };
}

function triggerPokeExplosion() {
  g_pokeActive = true;
  g_pokeStart = g_seconds;
  g_money = [];

  // spawn money
  const spawn = [1.05, 0.15, 0.18];
  for (let i = 0; i < 80; i++) {
    const vx = (Math.random() * 2 - 1) * 0.45;
    const vy = (Math.random() * 2 - 1) * 0.35 + 0.15;
    const vz = (Math.random() * 2 - 1) * 0.45;

    g_money.push({
      p: spawn.slice(),
      v: [vx, vy, vz],
      r: Math.random() * 360,
      vr: (Math.random() * 2 - 1) * 360,
      life: 2.0 + Math.random() * 0.6,
    });
  }
}
