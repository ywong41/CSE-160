// DrawTriangle.js (c) 2012 matsuda

// make ctx Global var
var ctx

function main() {  
    // Retrieve <canvas> element
    var canvas = document.getElementById('example');  
    if (!canvas) { 
        console.log('Failed to retrieve the <canvas> element');
        return false; 
    } 

    // Get the rendering context for 2DCG
    ctx = canvas.getContext('2d');

    /*
    // Step 1
    // Draw a blue rectangle
    ctx.fillStyle = 'rgba(0, 0, 255, 1.0)'; // Set color to blue
    ctx.fillRect(120, 10, 150, 150);        // Fill a rectangle with the color
    */

    // Step 2
    ctx.fillStyle = 'black'; // set canvas to black
    ctx.fillRect(0, 0, 400, 400);

    var v1 = new Vector3([2.25, 2.25, 0]); // set the z coordinate to zero
    drawVector(v1, "red"); // draw vector v1 and a string color in red
}

// 
function drawVector(v, color){
    // center of 400x400 canvas
    var center_x = 400/2;
    var center_y = 400/2;

    // scale
    var scale = 20;

    // set stroke color
    ctx.strokeStyle = color;
 
    // draw vector
    ctx.beginPath();
    ctx.moveTo(center_x, center_y);
    ctx.lineTo(center_x + v.elements[0] * scale, center_y - v.elements[1] * scale); // canvas y grows downward
    ctx.stroke();
}