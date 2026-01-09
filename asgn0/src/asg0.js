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
    //console.log("v1: x: ", v1x, " y: ", v1y);

    // read text boxes values
    var v2x = parseFloat(document.getElementById('v2_xCoor').value);
    var v2y = parseFloat(document.getElementById('v2_yCoor').value);

    // create v2
    var v2 = new Vector3([v2x, v2y, 0]);
    drawVector(v2, "blue");
    //console.log("v2: x: ", v2x, "y: ", v2y);
}

// a function named handleDrawOperationEvent() that is called whenever user clicks on second draw button.
function handleDrawOperationEvent(){
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
    // console.log("v1: x: ", v1x, " y: ", v1y);

    // read text boxes values
    var v2x = parseFloat(document.getElementById('v2_xCoor').value);
    var v2y = parseFloat(document.getElementById('v2_yCoor').value);

    // create v2
    var v2 = new Vector3([v2x, v2y, 0]);
    drawVector(v2, "blue");
    // console.log("v2: x: ", v2x, "y: ", v2y);

    // read the value of selector and scalar, and call Vector3 functions
    var op = document.getElementById('operation-select').value;
    var scalar = parseFloat(document.getElementById('scalar').value);

    if(op === "add"){;
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]])
        v3.add(v2); // v3 = v1 + v2
        drawVector(v3, "green"); // draw vector v3 and a string color in green
    }else if(op === "sub"){
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        v3.sub(v2); // v3 = v1 - v2
        drawVector(v3, "green"); 
    }else if(op === "mul"){
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
        // v3 = v1 * s and v4 = v2 * s.
        v3.mul(scalar);
        v4.mul(scalar);
        drawVector(v3, "green"); 
        drawVector(v4, "green"); 
    }else if(op === "div"){
        var v3 = new Vector3([v1.elements[0], v1.elements[1], v1.elements[2]]);
        var v4 = new Vector3([v2.elements[0], v2.elements[1], v2.elements[2]]);
        // v3 = v1 / s and v4 = v2 / s.
        v3.div(scalar);
        v4.div(scalar);
        drawVector(v3, "green"); 
        drawVector(v4, "green"); 
    }else if(op === "magnitude"){
        console.log("Magnitude of v1: " + v1.magnitude());
        console.log("Magnitude of v2: " + v2.magnitude());
    }else if(op === "normalize"){
        v1.normalize();
        v2.normalize();
        drawVector(v1, "green"); 
        drawVector(v2, "green"); 
    }else if(op === "angle"){
        var angle = angleBetween(v1, v2);
        console.log("Angle: " + angle);
    }
}

function angleBetween(v1, v2){
    var temp = Vector3.dot(v1, v2) / (v1.magnitude() * v2.magnitude());
    var angle_between = (Math.acos(temp) * 180) / Math.PI;
    return angle_between;
}
