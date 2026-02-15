/**
 * Reference: I asked ChatGPT to 
 * 
 * Overall, code implementation and testing were done by me.
 */

// Vertex shader program
var VERTEX_SHADER = `
    precision mediump float;
    attribute vec4 a_Position;
    attribute vec2 a_UV;
    varying vec2 v_UV;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    uniform mat4 u_ViewMatrix;
    uniform mat4 u_ProjectionMatrix;
    void main() {
        gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position; 
        v_UV = a_UV;
    }`

// Fragment shader program
var FRAGMENT_SHADER = `
    precision mediump float;
    varying vec2 v_UV;
    uniform vec4 u_FragColor;
    uniform sampler2D u_Sampler0;
    unifrom int u_whichTexture;
    void main() {
        if(u_whichTexture == -2){
            gl_FragColor = u_FragColor;                 // use color
        }else if(u_whichTexturer == -1){                // use UV debug color
            gl_FragColor = vec4(v_UV, 1.0, 1.0);
        }else if(u_whichTexture == 0){                  // use texture0
            gl_FragColor = texture2D(u_Sampler0, v_UV);
        }else{                                          // error, put Redish
            gl_FragColor = vec4(1, .2, .2, 1);
        }
    }`
// blocky world
let world = [];
let triangle1 = new Triangle();

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
let a_UV;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_ProjectionMatrix;
let u_ViewMatrixl
let u_GlobalRotateMatrix;

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

// Global matrices (reuse to avoid per-frame allocation)
let base, body, belly;
let tailJoint1, tail1, tailJoint2, tail2;
let head, snout, jawJoint, lowerJaw;
let eye1, eye2, iris1, iris2;
let hip, thigh, knee, calf, ankle, foot;

function initGlobalMatrices() {
    base = new Matrix4();
    body = new Matrix4();
    belly = new Matrix4();
    tailJoint1 = new Matrix4();
    tail1 = new Matrix4();
    tailJoint2 = new Matrix4();
    tail2 = new Matrix4();
    head = new Matrix4();
    snout = new Matrix4();
    jawJoint = new Matrix4();
    lowerJaw = new Matrix4();
    eye1 = new Matrix4();
    eye2 = new Matrix4();
    iris1 = new Matrix4();
    iris2 = new Matrix4();
    hip = new Matrix4();
    thigh = new Matrix4();
    knee = new Matrix4();
    calf = new Matrix4();
    ankle = new Matrix4();
    foot = new Matrix4();
}



window.onload = function() {
    initGlobalMatrices();
    main();
};

function initTextures(gl, n){

    // // get the storage location of u_Sampler
    // var_uSampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    //     if(!u_Sampler0){
    //         console.log("Failed to the the storage location of u_Sampler0");
    //         return false;
    //     }

    var image = new Image();
    if(!image){
        console.log("Failed to create the image object");
        return false;
    }

    image.onload = function(){ sendImageToTexture0(image);}
    // tell the browser to load an image
    image.src = "sky.jpg";
    return true;
    }

function sendImageToTexture0(image){
    // create texture obj
    var texture = gl.createTexture();
    if(!texture){
        console.log("Failed to create the texture object");
        return false;
    }

    gl.pixelStore(gl.UNPACK_FLIP_Y_WEBGL, 1);   // flip image's y axis

    //enable texture unit0
    gl.activeTexture(gl.TEXTURE0);
    // bind texture obj to the target
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // set texture param
    gl.texParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAE);
    // set texture image
    gl.texImage(gl.TEXTURE_2D, 0, gl.RBG, gl.UNISIGNED_BYTE, image);

    // set the texture unit 0 to the sampler
    gl.uniform1i(u_Sampler, 0);

    console.log("finished loadTexture");
}   


// Set up action for the HTML UI elements
function addActionsForHtmlUI(){

    // Slider Events
    document.getElementById('angleSlide').addEventListener('input', function() { g_globalAngle = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('tail1Slide').addEventListener('input', function() { g_tail1Angle = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('tail2Slide').addEventListener('input', function() { g_tail2Angle = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('jawSlide').addEventListener('input', function() { g_jawAngle = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('thighSlide').addEventListener('input', function () { g_thigh = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('calfSlide').addEventListener('input', function () { g_calf = parseFloat(this.value); renderAllShapes(); });
    document.getElementById('footSlide').addEventListener('input', function () { g_foot = parseFloat(this.value); renderAllShapes(); });

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
    // set up canvas and GL variables
    setupWebGL();
    // set up GLSL shader program and connect to GLSL variables
    connectVariablesToGLSL();
    // Set up action for the HTML UI elements
    addActionsForHtmlUI();

    document.onkeydown = keydown;


    initTextures(gl, 0);

    addMouseControl(); 

    // specify the color for clearing canvas
    gl.clearColor(0.5, 0.8, 0.5, 1.0);  // green background

    requestAnimationFrame(tick);
}




var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// tick(): updates global time (g_seconds) and drives all animations
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
    renderAllShapes();

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

// update eye position
function keydown(ev){
    if(ev.keyCode == 39){   // right arrow
        g_eye[0] += 0.2;
    }else if(ev.keyCode == 37){ // left arrow
        g_eye[0] -= 0.2;
    }

    renderAllShapes();
    console.log(ev.keyCode);
}

var g_eye = [0,0,3];
var g_at = [0,0,-100];
var g_up = [0,1,0];

var g_map = [
[1, 1, 1, 1, 1, 1, 1, 1],
[1, 0, 0, 0, 0, 0, 0, 1],
[1, 0, 0, 0, 0, 0, 0, 1],
[1, 0, 0, 1, 1, 0, 0, 1],
[1, 0, 0, 0, 0, 0, 0, 1],
[1, 0, 0, 0, 0, 0, 0, 1],
[1, 0, 0, 0, 1, 0, 0, 1],
[1, 0, 0, 0, 0, 0, 0, 1],
]

function drawMap(){
    for(x=0;x<16;x++){
        for(y=0;y<16;y++){
            if(x==0||x==31||y==0||y==31){
                var body = new Cube();
                body.color = [0.8, 1.0, 1.0, 1.0];
                body.matrix.translate(0, -.75, 0);
                body.matrix.scale(.3, .3, .3);
                body.matrix.translate(x-16, 0, y-16);
                body.render();
            }
        }
    }
}

// Draw every shape that suppose to be in canvas
function renderAllShapes(){
   
    // pass the view matrix
    var projMat = new Matrix4();
    projMat.setPerspective(50, 1*canvas.width/canvas.height, 1, 100);
    gl.uniformMatrix4v(u_ViewMatrixl, false, projMat.elements);

    //(eye, at, up)
    var viewMat = new Matrix4();
    viewMat.setLookAt(
        g_camera.eye.x, g_camera.eye.y, g_camera.eye.z,
        g_camera.at.x, g_camera.at.y, g_camera.at.z,
        g_camera.up.x, g_camera.up.y, g_camera.up.z);    
    gl.uniformMatrix4fv (u_ViewMatrix1, false, viewMat.elements);

    // Global rotation
    var globalRotMat = new Matrix4();
    globalRotMat.rotate(g_mouseYAngle, 1, 0, 0);   
    globalRotMat.rotate(g_mouseXAngle + g_globalAngle, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw the floor
    var floor = new Cube();
    floor.color = [1.0, 0.0, 0.0, 1.0];
    floor.textureNum = 0;
    floor.matrix.translate(0, -0.75, 0.0);
    floor.matrix.scale(10, 0, 10);
    floor.matrix.translate(-.5, 0, -0.5);
    body.render();

    // Draw the sky
    var sky = new Cube();
    sky.color = [1.0, 0.0, 0.0, 1.0];
    sky.textureNum = 1;
    sky.matrix.scale(50, 50, 50);
    sky.matrix.translate(-.5, 0, -0.5);
    sky.render();

    // Base pose
    base.setIdentity();
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
    body.set(base);
    body.rotate(0.6 * Math.sin(g_seconds), 0, 1, 0);
    body.textureNum = 0;
    body.scale(0.90, 0.22, 0.40);
    drawCube(body, CROC_MID);

    // Belly slab
    belly.set(base);
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
    // Tail joint 1
    tailJoint1.set(base);
    tailJoint1.translate(0.00, 0.10, 0.20);
    tailJoint1.rotate(-g_tail1Angle, 0, 1, 0);

    // Tail part 1
    tail1.set(tailJoint1);
    tail1.translate(-0.30, -0.06, -0.08);
    tail1.scale(0.30, 0.14, 0.16);
    tail1.textureNum = 2;
    drawCube(tail1, CROC_DARK);

    // Tail joint 2 (at end of tail part 1)
    tailJoint2.set(tailJoint1);
    tailJoint2.translate(-0.30, 0.00, 0.00);
    tailJoint2.rotate(-g_tail2Angle, 0, 1, 0);

    // Tail part 2 (tip)
    tail2.set(tailJoint2);
    tail2.translate(-0.24, -0.05, -0.06);
    tail2.scale(0.24, 0.12, 0.12);
    drawCube(tail2, CROC_MID);

    // ---- Head and snout ----
    head.set(base);
    head.translate(0.86, 0.02, 0.05);
    head.scale(0.26, 0.20, 0.30);
    drawCube(head, CROC_LIGHT);

    snout.set(base);
    snout.translate(1.10, 0.01, 0.09);
    snout.scale(0.30, 0.12, 0.22);
    drawCube(snout, CROC_MID);

    // ---- Lower jaw (animated) ----
    jawJoint.set(base);
    jawJoint.translate(1.10, 0.05, 0.20);
    jawJoint.rotate(-g_jawAngle, 0, 0, 1);

    lowerJaw.set(jawJoint);
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
    eye1.set(base);
    eye1.translate(1.05, 0.135, 0.07);
    eye1.scale(0.1, 0.055, 0.1);
    drawCube(eye1, CROC_EYE);

    eye2.set(base);
    eye2.translate(1.05, 0.135, 0.24);
    eye2.scale(0.1, 0.055, 0.1);
    drawCube(eye2, CROC_EYE);

    const irisCyl1 = new Cylinder();
    irisCyl1.color = CROC_IRIS;
    irisCyl1.parentMatrix = base;
    irisCyl1.position = [1.155, 0.16, 0.13];
    irisCyl1.radius = 0.03;
    irisCyl1.height = 0.03;
    irisCyl1.segments = 20;
    irisCyl1.scale = [0.87,0.87,0.87];
    irisCyl1.rotation = [90, 0, 0, 1];   // rotate z axis
    irisCyl1.render();

    const irisCyl2  = new Cylinder();
    irisCyl2 .color = CROC_IRIS;
    irisCyl2 .parentMatrix = base;
    irisCyl2 .position = [1.155, 0.16, 0.293];
    irisCyl2 .radius = 0.03;
    irisCyl2 .height = 0.03;
    irisCyl2 .segments = 20;
    irisCyl2 .scale = [0.87,0.87,0.87];
    irisCyl2 .rotation = [90, 0, 0, 1];   // rotate z axis
    irisCyl2 .render();

    // Legs hierarchy
    // three-level joint (motion hierarchy: thigh → calf → foot)
    function drawLeg(x, y, z, sideSign){
        hip.set(base);
        hip.translate(x, y, z);
        hip.rotate(g_thigh, 0, 0, 1);

        thigh.set(hip);
        thigh.scale(0.105, 0.105, 0.105);
        drawCube(thigh, CROC_DARK);

        knee.set(hip);
        knee.translate(0.06, -0.08, 0.0);
        knee.rotate(g_calf, 0, 0, 1);

        calf.set(knee);
        calf.scale(0.08, 0.10, 0.08);
        drawCube(calf, CROC_DARK);

        ankle.set(knee);
        ankle.translate(0.05, -0.05, -0.05);
        ankle.rotate(g_foot, 0, 0, 1);

        foot.set(ankle);
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

    a_UV = gl.getAttribLocation(gl.programm, 'a_UV');
    if (a_UV < 0) {
        console.log('Failed to get the storage location of a_UV');
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

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if(!u_GlobalRotateMatrix){
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return false;
    }

    u_ViewMatrixl = gl.getUniformLocation(gl.program, 'u_ViewMatrixl');
    if(!u_ViewMatrixl){
        console.log('Failed to get the storage location of u_ViewMatrixl');
        return false;
    }

    u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
    if(!u_GlobalRotateMatrix){
        console.log('Failed to get the storage location of u_ProjectionMatrix');
        return false;
    }

    u_Sampler0 = gl.getUniformLocation(gl.program, 'u_Sampler0');
    if(!u_GlobalRotateMatrix){
        console.log('Failed to get the storage location of u_Sampler0');
        return false;
    }
    

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function drawCube(matrix, color) {
    color = color || [1.0, 0.0, 0.0, 1.0];  // default red
    this.matrix - new Matrix4();
    this.textureNum = 0;

    // Pass the color of a point to u_FragColor variable
    //gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
    // Send the transformation matrix
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, matrix.elements);

    // FRONT (slightly brighter)
    gl.uniform4f(u_FragColor, color[0]*1.0, color[1]*1.0, color[2]*1.0, color[3]);
    drawTriangle3DUV([0,0,0, 1,1,0, 1,0,0], [1,0,0,1,1,1])
    drawTriangle3DUV([0,0,0, 0,1,0, 1,1,0], [0,0,0,1,1,1]);

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