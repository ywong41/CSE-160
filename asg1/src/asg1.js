// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;

// Vertex shader program
var VERTEX_SHADER = `
    precision mediump float;
    uniform float u_Size;
    attribute vec4 a_Position;
    void main() {
        gl_Position = a_Position; 
        // gl_PointSize = 10.0;
        gl_PointSize = u_Size;
    }`

// Fragment shader program
var FEAGMENT_SHADER = `
    precision mediump float;
    uniform vec4 u_FragColor;
    void main() {
        gl_FragColor = u_FragColor;
    }`

// Global variable for UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_selectedSize = 5;

 // Set up action for the HTML UI elements
function addActionsForHtmlUI(){
    // button events (Shape type)
    document.getElementById('green').onclick = function() { g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
    document.getElementById('red').onclick = function() { g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };

    // Slider events
    document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100; });
    document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100; });
    document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100; });

    // Size Slider Events
    document.getElementById('sizeSlide').addEventListener('mouseup', function() { g_selectedSize = this.value; });
}

function main() {  
 
  
    // Step 3
    // set up canvas and gl
    setupWebGL();
    // set up GLSL shader program and connect to GLSL variables
    connectVariablesToGLSL();

    // Set up action for the HTML UI elements
    addActionsForHtmlUI();

    // Register function (event handler) to be called on a mouse press
    canvas.onmousedown = click;

    // specify the clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // rbg and alpha color(transparency)

    // apply clear and color to canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    console.log(gl);
}


var g_shapesList = [];

// var g_points = [];  // The array for the position of a mouse press
// var g_colors = [];  // The array to store the color of a point
// var g_sizes = [];   // The array to store the size of a point

function click(ev) {

    // Extract the event click and return it in WebGL coordinates
    let [x,y] = connectCoordinatesEventToGL(ev);
    
    // Create and store the new point
    let point = new Point();
    point.position = [x,y];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    g_shapesList.push(point);

    // // Store the coordinates to g_points array
    // g_points.push([x, y]);

    // // Store the coordinates to g_points array
    // g_colors.push(g_selectedColor.slice());

    // g_sizes.push(g_selectedSize);
    /** 
    if (x >= 0.0 && y >= 0.0) {      // First quadrant
        g_colors.push([1.0, 0.0, 0.0, 1.0]);  // Red
    } else if (x < 0.0 && y < 0.0) { // Third quadrant
        g_colors.push([0.0, 1.0, 0.0, 1.0]);  // Green
    } else {                         // Others
        g_colors.push([1.0, 1.0, 1.0, 1.0]);  // White
    }
*/
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
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);

    // var len = g_points.length;
    var len = g_shapesList.length;
    for(var i = 0; i < len; i++) {
        g_shapesList[i].render();
    }
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
    gl = getWebGLContext(canvas);
    if(!gl){
        console.log('Failed to retrieve WebGL content');
        return false;
    }
}

// compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL(){
    // initialize shaders
    if(!initShaders(gl, VERTEX_SHADER, FEAGMENT_SHADER)){
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

