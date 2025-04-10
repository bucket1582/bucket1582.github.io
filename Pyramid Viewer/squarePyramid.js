/*-----------------------------------------------------------------------------
class squarePyramid

-----------------------------------------------------------------------------*/

export class SquarePyramid {
    constructor(gl) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // Initializing data
        this.vertices = new Float32Array([
            // 밑면
            -0.5, 0.0, -0.5,  0.5, 0.0, -0.5,  0.5, 0.0, 0.5,  -0.5, 0.0, 0.5,
            // 앞면
            -0.5, 0.0, -0.5,  0.5, 0.0, -0.5,  0.0, 1.0, 0.0,
            // 오른쪽면
            0.5, 0.0, -0.5,  0.5, 0.0, 0.5,  0.0, 1.0, 0.0,
            // 뒷면
            0.5, 0.0, 0.5,  -0.5, 0.0, 0.5,  0.0, 1.0, 0.0,
            // 왼쪽면
            -0.5, 0.0, 0.5,  -0.5, 0.0, -0.5,  0.0, 1.0, 0.0
        ]);

        this.colors = new Float32Array([
            // 밑면 - red
            1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,
            // 앞면 - yellow
            1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
            // 오른쪽면 - green
            0, 1, 0, 1,   0, 1, 0, 1,   0, 1, 0, 1,
            // 뒷면 - cyan
            0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
            // 왼쪽면 - magenta
            1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1
        ]);

        this.indices = new Uint16Array([
            // 밑면
            0, 1, 2,   2, 3, 0,
            // 앞면
            4, 5, 6,
            // 오른쪽면
            7, 8, 9,
            // 뒷면
            10, 11, 12,
            // 왼쪽면
            13, 14, 15
        ]);
        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const cSize = this.colors.byteLength;
        const totalSize = vSize + cSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.colors);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, vSize);  // color

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 18, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
} 