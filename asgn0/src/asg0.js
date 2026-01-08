// DrawTriangle.js (c) 2012 matsuda

// make ctx and canvas Global var
var ctx
var canvas
function main() {  
    // Retrieve <canvas> element
    canvas = document.getElementById('canvas1');  
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
    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // set color to black
    ctx.fillRect(0, 0, canvas.width, canvas.height); // fill rectangle with black

    var v1 = new Vector3([2.25, 2.25, 0]); // set the z coordinate to zero
    drawVector(v1, "red"); // draw vector v1 and a string color in red
}

// a function named drawVector(v, color) that takes a Vector3 v and a string color
function drawVector(v, color){
    // center of 400x400 canvas
    var center_x = canvas.width/2;
    var center_y = canvas.height/2;

    // scale
    var scale = 20;

    // set stroke color
    ctx.strokeStyle = color;
 
    // draw vector
    ctx.beginPath();
    ctx.moveTo(center_x, center_y);
    ctx.lineTo(center_x + v.elements[0] * scale, center_y - v.elements[1] * scale); // scale vector by 20 (canvas y grows downward)
    ctx.stroke();
}
// a function named handleDrawEvent() that is called whenever a user clicks on the draw button
function handleDrawEvent(){
    // clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 1.0)'; // set color to black
    ctx.fillRect(0, 0, canvas.width, canvas.height); // fill rectangle with black
    
    // read text boxes values
    var v1x = parseFloat(document.getElementById('v1_xCoor').value);
    var v1y = parseFloat(document.getElementById('v1_yCoor').value);

    // create v1
    var v1 = new Vector3([v1x, v1y, 0]);
    drawVector(v1, "red"); // draw vector v1 and a string color in red

    console.log("v1: x: ", v1x, " y: ", v1y);

    // read text boxes values
    var v2x = parseFloat(document.getElementById('v2_xCoor').value);
    var v2y = parseFloat(document.getElementById('v2_yCoor').value);

    //create v2
    var v2 = new Vector3([v2x, v2y, 0]);
    drawVector(v2, "blue");
    console.log("v2: x: ", v2x, "y: ", v2y);
}