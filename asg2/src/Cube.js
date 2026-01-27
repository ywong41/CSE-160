class Cube{
    constructor(){
        this.type ='cube';
        //this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        //this.size = 5.0;
        //this.segments = g_cirSegment;   // store the number of segments
        this.matrix = new Matrix4();
    }

    // function that rander this shape
    render(){
        //var xy = this.position;
        var rgba = this.color;
        //var size = this.size;
    
        // Pass the color of a point to u_FragColor variable
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
        // Draw
        // var d = this.size/200.0; //delta
       
        // // loop over a circle and draw each triangle in turn 
        // let angleStep=360/this.segments;
        // for (var angle = 0; angle < 360; angle = angle + angleStep) {
        //     let centerPt = [xy[0], xy[1]];
        //     let angle1 = angle;
        //     let angle2 = angle + angleStep;
        //     let vec1 = [Math.cos(angle1 * Math.PI / 180) * d, Math.sin(angle1 * Math.PI / 180) * d];
        //     let vec2 = [Math.cos(angle2 * Math.PI / 180) * d, Math.sin(angle2 * Math.PI / 180) * d];
        //     let pt1 = [centerPt[0] + vec1[0], centerPt[1] + vec1[1]];
        //     let pt2 = [centerPt[0] + vec2[0], centerPt[1] + vec2[1]];
        //     drawTriangle([xy[0], xy[1], pt1[0], pt1[1], pt2[0], pt2[1]]);

        // }
        // Front of cube
        drawTriangle3D([0,0,0, 1,1,0, 1,0,0]);
        drawTriangle3D([0,0,0, 0,1,0, 1,1,0]);

        // back
        drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
        drawTriangle3D([0,0,1,  1,1,1,  0,1,1]);

        // left
        drawTriangle3D([0,0,0,  0,0,1,  0,1,1]);
        drawTriangle3D([0,0,0,  0,1,1,  0,1,0]);

        // right
        drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);
        drawTriangle3D([1,0,0,  1,1,0,  1,1,1]);

        // top
        gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);
        drawTriangle3D([0,1,0, 0,1,1, 1,1,1]);
        drawTriangle3D([0,1,0, 1,1,1, 1,1,0]);

        // bottom
        drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
        drawTriangle3D([0,0,0,  1,0,0,  1,0,1]);

    }
}   

function drawCircle(vertices) {

  var n = 3; // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);

  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, n);
}
 