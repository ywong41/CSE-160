/**
 * Reference: I asked ChatGPT to model and verify the matrix for the blocky animal.
 * Also, it guide me through functions like addMouseControl(), and how to make jawJoint to follow the jaw of the blocky animal
 */

// Vertex shader program
var VERTEX_SHADER = `
    attribute vec4 a_Position;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_GlobalRotateMatrix;
    void main() {
        gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position; 
    }`

// Fragment shader program
var FRAGMENT_SHADER = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`

// Croc palette (RGBA)
const CROC_DARK  = [0.18, 0.259, 0.102, 1.0];
const CROC_MID   = [0.29, 0.392, 0.176, 1.0];
const CROC_LIGHT = [0.24, 0.392, 0.176, 1.0];
const CROC_BELLY = [0.624, 0.643, 0.396, 1.0];
const CROC_TOOTH = [0.95, 0.95, 0.95, 1.0];
const CROC_EYE   = [0.78, 0.76, 0.09, 1.0];;
const CROC_IRIS   = [0.05, 0.05, 0.05, 1.0];

// Add mouse control to rotate your animal
// rotation for mouse
let g_mouseXAngle = 0;  // around Y-axis
let g_mouseYAngle = 0;  // around X-axis
let g_lastMouseX = 0;
let g_lastMouseY = 0;
let g_mouseDragging = false;


// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// Global variable for UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_yellowAngle = 0;
let g_magentaAngle = 0;
let g_yellowAnimation = false;
let g_magentaAnimation = false;
let g_walkAnimation = false;


// Crocodile 
let g_globalAngle = 0;
let g_tailAngle = 0;
let g_jawAngle = 0;
let g_tailAnimation = false;
let g_jawAnimation = false;

// 3-level joint
let g_thigh = 0;
let g_calf  = 0;
let g_foot  = 0;

window.onload = function() {
    main();
};

// Set up action for the HTML UI elements
function addActionsForHtmlUI(){
   
    // Slider Events
    document.getElementById('angleSlide').addEventListener('input', function() {
    g_globalAngle = parseFloat(this.value);
    renderScene();
    });

    document.getElementById('tailSlide').addEventListener('input', function() {
    g_tailAngle = parseFloat(this.value);
    renderScene();
    });

    document.getElementById('jawSlide').addEventListener('input', function() {
    g_jawAngle = parseFloat(this.value);
    renderScene();
    });


    document.getElementById('thighSlide').addEventListener('input', function () {
    g_thigh = parseFloat(this.value);
    renderScene();
    });

    document.getElementById('calfSlide').addEventListener('input', function () {
    g_calf = parseFloat(this.value);
    renderScene();
    });

    document.getElementById('footSlide').addEventListener('input', function () {
    g_foot = parseFloat(this.value);
    renderScene();
    });


    // Button Events
    document.getElementById('tailOnButton').onclick = function() { g_tailAnimation  = true; };
    document.getElementById('tailOffButton').onclick = function() { g_tailAnimation  = false; };

    document.getElementById('jawOnButton').onclick = function() { g_jawAnimation = true; };
    document.getElementById('jawOffButton').onclick = function() { g_jawAnimation = false; };

    document.getElementById('walkOnButton').onclick  = () => { g_walkAnimation = true; };
    document.getElementById('walkOffButton').onclick = () => { g_walkAnimation = false; };

    document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderScene(); });

}

function main() {  
    setupWebGL();
    // set up GLSL shader program and connect to GLSL variables
    connectVariablesToGLSL();
    // Set up action for the HTML UI elements
    addActionsForHtmlUI();

    addMouseControl(); 

    // specify the clear color
    gl.clearColor(0.5, 0.8, 0.5, 1.0);  // a greenish background
    gl.enable(gl.DEPTH_TEST);
    requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;
// called by browser repeatly whenever its time
function tick(){
    g_seconds=performance.now()/1000.0-g_startTime;

    // Update animation angles
    updateAnimationAngles();

    // draw everything
    renderScene();
    // tell browser update again whenever its time
    requestAnimationFrame(tick);
}


var g_shapesList = [];  // contains the list of all shapes that need to be drawn

function handleClicks(ev) {

    // Extract the event click and return it in WebGL coordinates
    let [x,y] = connectCoordinatesEventToGL(ev);
    
    // Create and store the new point
    let point;
    if (g_selectedType==POINT){
        point = new Point();
    }else if(g_selectedType==TRIANGLE){
        point = new Triangle();
    }else{
        point = new Circle();
    }
    point.position = [x,y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point);

    // draw every shape that is suppose to be in canvas
    renderScene();
}

function connectCoordinatesEventToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return([x,y]);
}

function updateAnimationAngles(){
    if(g_tailAnimation){
        g_tailAngle = 15*Math.sin(g_seconds); // tail wags
    }
    if(g_jawAnimation){
        g_jawAngle = 36*Math.sin(g_seconds*2);  // jaw open and close
        if (g_jawAngle < 0) g_jawAngle = 0;        // never close past 0
    } 
    if (g_walkAnimation) {
        g_thigh = 16 * Math.sin(g_seconds * 4);
        g_calf  = 15 * Math.sin(g_seconds * 4 + Math.PI / 2);
        g_foot  = 15 * Math.sin(g_seconds * 4 + Math.PI);
    }

}

// Draw every shape that suppose to be in canvas
function renderScene(){

    // check the time at the start of this function
    var startTime =  performance.now();

    // Global rotation
    var globalRotMat = new Matrix4();
    globalRotMat.rotate(g_mouseYAngle, 1, 0, 0);   
    globalRotMat.rotate(g_mouseXAngle + g_globalAngle, 0, 1, 0);
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }

    // -------------------------
    // Crocodile body blocks
    // -------------------------
    
    // Base pose (move the whole croc here)
    const base = new Matrix4();
    base.translate(-0.55, -0.15, 0.0);

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
    // Tail joint at the back of the body
    const tailJoint = new Matrix4(base);
    tailJoint.translate(0.00, 0.10, 0.20);
    tailJoint.rotate(-g_tailAngle, 0, 1, 0);

    // Tail part 1
    const tail1 = new Matrix4(tailJoint);
    tail1.translate(-0.30, -0.06, -0.08);
    tail1.scale(0.30, 0.14, 0.16);
    drawCube(tail1, CROC_DARK);

    // Tail part 2
    const tail2Joint = new Matrix4(tailJoint);
    tail2Joint.translate(-0.30, 0.00, 0.00);
    tail2Joint.rotate(-g_tailAngle * 0.6, 0, 1, 0);

    const tail2 = new Matrix4(tail2Joint);
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

    // // ---- Upper jaw (fixed) ----
    // const upperJaw = new Matrix4(base);
    // upperJaw.translate(1.10, 0.06, 0.09);
    // upperJaw.scale(0.30, 0.05, 0.22);
    // drawCube(upperJaw, CROC_LIGHT);

    // ---- Lower jaw (animated) ----
    const jawJoint = new Matrix4(base);
    jawJoint.translate(1.10, 0.05, 0.20);      // hinge line near back of jaw
    jawJoint.rotate(-g_jawAngle, 0, 0, 1);

    const lowerJaw = new Matrix4(jawJoint);
    lowerJaw.translate(0.00, -0.06, -0.11);    // offset so it rotates “down”
    lowerJaw.scale(0.30, 0.05, 0.22);
    drawCube(lowerJaw, CROC_MID);

    // Teeth in Pyramid shape
    for (let i = 0; i < 6; i++) {
        // Upper teeth (fixed to head/base)
        const topTooth = new Pyramid();
        topTooth.color = CROC_TOOTH;
        topTooth.parentMatrix = base;
        topTooth.position = [1.13 + i * 0.04, 0.04, 0.09];
        topTooth.size = 0.0465;
        topTooth.scale = [1.0, -1.0, 1.0];   // flip Y so apex points down
        topTooth.render();

        // upper left
        const topLeftTooth = new Pyramid();
        topLeftTooth.color = CROC_TOOTH;
        topLeftTooth.parentMatrix = base;
        topLeftTooth.position = [1.13 + i * 0.04, 0.04, 0.263];
        topLeftTooth.size = 0.0465;
        topLeftTooth.scale = [1.0, -1.0, 1.0];   // flip Y so apex points down
        topLeftTooth.render();

        // Lower teeth (follow the jaw animation)
        const botTooth = new Pyramid();
        botTooth.color = CROC_TOOTH;
        botTooth.parentMatrix = jawJoint;
        botTooth.position = [0.03 + i * 0.04, -0.02, -0.1];
        botTooth.size = 0.0465;
        botTooth.scale = [1.0, 1.0, 1.0];    // apex points up
        botTooth.render();

        // lower left
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


    // 4 Legs
    function drawLeg(x, y, z, sideSign){
        const hip = new Matrix4(base);
        hip.translate(x, y, z);
        hip.rotate(g_thigh, 0, 0, 1);

        const thigh = new Matrix4(hip);
        thigh.scale(0.10, 0.10, 0.10);
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

    // check the time at the end of the function, and show on webpage
    var duration = performance.now() - startTime;
    sendTextToHTML("numdot: " + len + "ms: " + Math.floor(duration) +  " fps: " + Math.floor(10000/duration)/10, "numdot");
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

    u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
    if(!u_GlobalRotateMatrix){
        console.log('Failed to get the storage location of u_GlobalRotateMatrix');
        return false;
    }

    var identityM = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

function drawCube(matrix, color) {
    color = color || [1.0, 0.0, 0.0, 1.0];  // default red

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
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
    canvas.onmousedown = ev => {
        g_mouseDragging = true;
        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;
    };

    canvas.onmouseup = canvas.onmouseleave = ev => g_mouseDragging = false;

    canvas.onmousemove = ev => {
        if (!g_mouseDragging) return;  // only rotate when dragging

        let dx = ev.clientX - g_lastMouseX;
        let dy = ev.clientY - g_lastMouseY;

        g_mouseXAngle -= dx * 0.3;
        g_mouseYAngle -= dy * 0.3;

        g_lastMouseX = ev.clientX;
        g_lastMouseY = ev.clientY;

        renderScene();
    };
}
