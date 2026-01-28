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
   
    // Button Events
    document.getElementById('animationYellowOnButton').onclick = function() { g_yellowAnimation = true; };
    document.getElementById('animationYellowOffButton').onclick = function() { g_yellowAnimation = false; };


    document.getElementById('animationMagentaOnButton').onclick = function() { g_magentaAnimation = true; };
    document.getElementById('animationMagentaOffButton').onclick = function() { g_magentaAnimation = false; };

    // Color Slider Events
    document.getElementById('yellowSlide').addEventListener('mousemove', function() { g_yellowAngle = this.value; renderScene(); });
    document.getElementById('magentaSlide').addEventListener('mousemove', function() { g_magentaAngle = this.value; renderScene(); });

    document.getElementById('angleSlide').addEventListener('mousemove', function() { g_globalAngle = this.value; renderScene(); });

}

function main() {  
    // Step 3
    // set up canvas and gl
    setupWebGL();
    // set up GLSL shader program and connect to GLSL variables
    connectVariablesToGLSL();
    console.log("GLSL program info:", gl.getProgramInfoLog(gl.program));
    console.log("GL Errors:", gl.getError());

    // Set up action for the HTML UI elements
    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = handleClicks;

    // draw when mouse held down
    canvas.onmousemove = function(ev) { if(ev.buttons == 1) { handleClicks(ev) } };
    // specify the clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // rbg and alpha color(transparency)

    // apply clear and color to canvas
    // gl.clear(gl.COLOR_BUFFER_BIT);
    // console.log(gl);
    //renderScene();
    requestAnimationFrame(tick);
}

var g_startTime=performance.now()/1000.0;
var g_seconds=performance.now()/1000.0-g_startTime;

// called by browser repeatly whenever its time
function tick(){
    g_seconds=performance.now()/1000.0-g_startTime;

    // Update animation angles
    updateAnimationAngles();
    // print debug info
    console.log(g_seconds);
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
    if(g_yellowAnimation){
        g_yellowAngle = (45*Math.sin(g_seconds));

    }
    if(g_magentaAnimation){
        g_magentaAngle = (45*Math.sin(3*g_seconds));
    }
}

// Draw every shape that suppose to be in canvas
function renderScene(){

    // check the time at the start of this function
    var startTime =  performance.now();

    var globalRotMat = new Matrix4();
    globalRotMat.rotate(g_globalAngle, 0, 1, 0);    
    gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }
    // drawTriangle3D([-1.0,0.0,0.0,   -0.5,-1.0,0.0,  0.0,0.0,0.0]);

    // draw a cube
    var body = new Cube();
    body.color = [1.0,0.0,0.0,1.0];
    body.matrix.translate(-.25, -.75, 0.0);
    body.matrix.rotate(-5,1,0,0);
    body.matrix.scale(0.5, .3, .5);
    body.render();

    // draw a left arm
    var leftArm = new Cube();
    leftArm.color = [1, 1, 0, 1];
    leftArm.matrix.setTranslate(0, -.5, 0.0);
    leftArm.matrix.rotate(-5, 1, 0, 0);
    //leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1); // -g_globalAngle to move in opposite direction
    // if(g_yellowAnimation){
    //     leftArm.matrix.rotate(45*Math.sin(g_seconds), 0, 0, 1);
    // }else{
    //     leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1);
    // }
    leftArm.matrix.rotate(-g_yellowAngle, 0, 0, 1);

    var yellowCoordinatesMat = new Matrix4 (leftArm.matrix);
    leftArm.matrix.scale(0.25, .7, .5);
    leftArm.matrix.translate(-.5,0,0);
    leftArm.render();

    // test box
    var box = new Cube();
    box.color = [1, 0, 1, 1];
    box.matrix = yellowCoordinatesMat;
    box.matrix.translate(0, 0.65, 0);
    box.matrix.rotate(g_magentaAngle, 1, 0, 0);
    box.matrix.scale(.3,.3,.3);
    box.matrix.translate(-.5, 0, -0.001);
    box.render();

    // a bunch of rotating cubes
    var K = 10.0;
    for(var i = 1; i<K; i++){
        var c = new Cube();
        c.matrix.translate(-.8, 1.9*i/K-1.0, 0);
        c.matrix.rotate(g_seconds*100,1,1,1);
        c.matrix.scale(.1, .5/K, 1.0/K);
        c.render();
    }

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
    // Retrieve <canvas> element
    canvas = document.getElementById('webgl');  
    if (!canvas) { 
        console.log('Failed to retrieve the <canvas> element');
        return false; 
    } 
    // a variable for drawing all the component on canvas
    //gl = getWebGLContext(canvas);
    // add a MAGIC flag
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

    // // Get the storage location of u_FlagColor
    // u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    // if(!u_Size){
    //     console.log('Failed to get the storage location of u_Size');
    //     return;
    // }
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

