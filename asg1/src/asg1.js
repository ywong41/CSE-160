// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

// Global variable for picture
let g_pictureShapes = [];

// Vertex shader program
var VERTEX_SHADER = `
    precision mediump float;
    uniform float u_Size;
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position; 
        gl_PointSize = u_Size;
    }`

// Fragment shader program
var FRAGMENT_SHADER = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`

// constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE  = 2;

// Global variable for UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_cirSegment = 10;  // default number of circle segment

window.onload = function() {
    main();
};

// Set up action for the HTML UI elements
function addActionsForHtmlUI(){
    // button events (Shape type)
    // document.getElementById('green').onclick = function() { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
    // document.getElementById('red').onclick = function() { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
    document.getElementById('clearButton').onclick = function() { g_shapesList=[]; renderAllShapes(); };   // clear that list to clear out all the point

    document.getElementById('pointButton').onclick = function() { g_selectedType=POINT};   // clear that list to clear out all the point
    document.getElementById('triButton').onclick = function() { g_selectedType=TRIANGLE};   // clear that list to clear out all the point
    document.getElementById('circleButton').onclick = function() { g_selectedType=CIRCLE};   // clear that list to clear out all the point

    // Slider events
    document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100; });
    document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100; });
    document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100; });
    document.getElementById('cirSegment').addEventListener('input', function() { g_cirSegment = parseInt(this.value); });   // a slider to control number of segments in circle 
    // Size Slider Events
    document.getElementById('sizeSlide').addEventListener('mouseup', function() { g_selectedSize = this.value; });

    document.getElementById('drawPicture').onclick = drawPicture;

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
    gl.clear(gl.COLOR_BUFFER_BIT);
    console.log(gl);
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
    renderAllShapes();
}

function connectCoordinatesEventToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();

    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

    return([x,y]);
}

// Draw every shape that suppose to be in canvas
function renderAllShapes(){

    // check the time at the start of this function
    var startTime =  performance.now();

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // var len = g_points.length;
    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }

    // check the time at the end of the function, and show on webpage
    var duration = performance.now() - startTime;
    // sendTextToHTML("numdot: " + len + "ms: " + Math.floor(duration) +  " fps: " + Math.floor(10000/duration)/10, "numdot");
}

// // set the text of a HTML element
// function sendTextToHTML(text, htmlID){
//     var htmlElm = document.getElementById(htmlID);
//     if(!htmlElm){
//         console.log("Failed to get " + htmlID + " from HTML");
//         return;
//     }
//     htmlElm.innerHTML = text;
// }

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

    // Get the storage location of u_FlagColor
    u_Size = gl.getUniformLocation(gl.program, 'u_Size');
    if(!u_Size){
        console.log('Failed to get the storage location of u_Size');
        return;
    }
}


// function to draw picture
function drawPicture(){
    g_pictureShapes = [];

    // define colors
    const hullColor = [0.373, 0.275, 0.180, 1.0];
    const sailColor = [0.549, 0.533, 0.518, 1.0];
    const waterColor = [0.220, 0.541, 0.757, 0.7];
    const flagColor = [1.0, 0.102, 0.102, 1.0];
    const mColor = [0.416, 0.482, 0.635, 1.0];
    const wColor = [1.0, 0.875, 0.871, 1.0];

    
    createTriangle(-1.0, -1.0, 1.0, -1.0, -1.0, -0.4, waterColor);
    createTriangle(1.0, -1.0, 1.0, -0.4, -1.0, -0.4, waterColor);
    
    createTriangle(-0.6, -0.4, 0.6, -0.4, 0.0, 0.1, hullColor); // big triangle
    createTriangle(-0.5, -0.4, 0.5, -0.4, 0.5, -0.2, hullColor);
    createTriangle(-0.5, -0.4, 0.5, -0.2, -0.5, -0.2, hullColor);
    createTriangle(-0.4, -0.2, 0.4, -0.2, -0.4, 0.0, hullColor);
    createTriangle(0.4, -0.2, 0.4, 0.0, -0.4, 0.0, hullColor);


    createTriangle(-0.05, 0.0, 0.05, 0.0, -0.05, 0.6, sailColor);
    createTriangle(0.05, 0.0, 0.05, 0.6, -0.05, 0.6, sailColor);
    createTriangle(0.05, 0.2, 0.05, 0.5, 0.4, 0.35, flagColor);

    // create initial M
    // left |
    createTriangle(0.0, 0.65, 0.03, 0.65, 0.0, 0.8, mColor);
    createTriangle(0.03, 0.65, 0.03, 0.8, 0.0, 0.8, mColor);
    // right |
    createTriangle(0.08, 0.65, 0.11, 0.65, 0.08, 0.8, mColor);
    createTriangle(0.11, 0.65, 0.11, 0.8, 0.08, 0.8, mColor);
    // create a "v" shape for m
    createTriangle(0.03, 0.8, 0.055, 0.72, 0.08, 0.8, mColor);

    // create initial W
    createTriangle(0.13, 0.65, 0.16, 0.65, 0.13, 0.8, wColor);
    createTriangle(0.16, 0.65, 0.16, 0.8, 0.13, 0.8, wColor);
    createTriangle(0.21, 0.65, 0.24, 0.65, 0.21, 0.8, wColor);
    createTriangle(0.24, 0.65, 0.24, 0.8, 0.21, 0.8, wColor);
    createTriangle(0.16, 0.67, 0.185, 0.8, 0.21, 0.67, wColor);

    renderAllShapes();
}


// a function that create triangle
function createTriangle(x1, y1, x2, y2, x3, y3, color){
    let triangle = new Triangle();
    triangle.customVertices = [x1, y1, x2, y2, x3, y3];
    triangle.position = [(x1+x2+x3)/3, (y1+ y2 + y3)/ 3];
    triangle.color = color.slice();
    triangle.size = 5.0;    // default triangle size
    triangle.isPictureTriangle = true;

    triangle.render = function() {
        if (this.isPictureTriangle && this.customVertices) {
            var rgba = this.color;
            gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
            drawTriangle(this.customVertices);
        }else {
            var xy = this.position;
            var rgba = this.color;
            var size = this.size;
            gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
            gl.uniform1f(u_Size, size);

            var d = this.size/200.0;
            drawTriangle([xy[0], xy[1], xy[0]+d, xy[1], xy[0], xy[1]+d]);
        }
    }
    g_shapesList.push(triangle);
    g_pictureShapes.push(triangle);
}
