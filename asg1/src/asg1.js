// DrawTriangle.js (c) 2012 matsuda

// make ctx and canvas Global var
let canvas
let gl

function main() {  
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

    // assign the clear color
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // rbg and alpha color(transparency)
    // apply clear and color to canvas
    gl.clear(gl.COLOR_BUFFER_BIT);
    console.log(gl);

 

}
