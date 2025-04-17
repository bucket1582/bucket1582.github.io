/*-----------------------------------------------------------------------------
class squarePyramid

-----------------------------------------------------------------------------*/

export class Octahedron {
    constructor(gl) {
        this.gl = gl;
        
        // Creating VAO and buffers
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        const sqrt_2 = Math.sqrt(2);

        // Initializing data
        this.vertices = new Float32Array([
            // 앞면
            -0.5, 0.0, -0.5,  0.5, 0.0, -0.5,  0.0, sqrt_2 / 2, 0.0,
            // 오른쪽면
            0.5, 0.0, -0.5,  0.5, 0.0, 0.5,  0.0, sqrt_2 / 2, 0.0,
            // 뒷면
            0.5, 0.0, 0.5,  -0.5, 0.0, 0.5,  0.0, sqrt_2 / 2, 0.0,
            // 왼쪽면
            -0.5, 0.0, 0.5,  -0.5, 0.0, -0.5,  0.0, sqrt_2 / 2, 0.0,
            // 앞면
            -0.5, 0.0, -0.5,  0.5, 0.0, -0.5,  0.0, -sqrt_2 / 2, 0.0,
            // 오른쪽면
            0.5, 0.0, -0.5,  0.5, 0.0, 0.5,  0.0, -sqrt_2 / 2, 0.0,
            // 뒷면
            0.5, 0.0, 0.5,  -0.5, 0.0, 0.5,  0.0, -sqrt_2 / 2, 0.0,
            // 왼쪽면
            -0.5, 0.0, 0.5,  -0.5, 0.0, -0.5,  0.0, -sqrt_2 / 2, 0.0
        ]);

        this.colors = new Float32Array([
            // 앞면 - yellow
            1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,
            // 오른쪽면 - green
            0, 1, 0, 1,   0, 1, 0, 1,   0, 1, 0, 1,
            // 뒷면 - cyan
            0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,
            // 왼쪽면 - magenta
            1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,
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
            // 앞면
            0, 1, 2,
            // 오른쪽면
            3, 4, 5,
            // 뒷면
            6, 7, 8,
            // 왼쪽면
            9, 10, 11,
            // 앞면
            12, 13, 14,
            // 오른쪽면
            15, 16, 17,
            // 뒷면
            18, 19, 20,
            // 왼쪽면
            21, 22, 23
        ]);

        this.texCoords = new Float32Array([
            // 앞면
            0.0, 0.5,  0.25, 0.5,  0.5, 1.0,
            // 오른쪽면
            0.25, 0.5,  0.5, 0.5,  0.5, 1.0,
            // 뒷면
            0.5, 0.5,  0.75, 0.5,  0.5, 1.0,
            // 왼쪽면
            0.75, 0.5,  1.0, 0.5,  0.5, 1.0,
            // 앞면
            0.0, 0.5,  0.25, 0.5,  0.5, 0.0,
            // 오른쪽면
            0.25, 0.5,  0.5, 0.5,  0.5, 0.0,
            // 뒷면
            0.5, 0.5,  0.75, 0.5,  0.5, 0.0,
            // 왼쪽면
            0.75, 0.5,  1.0, 0.5,  0.5, 0.0
        ]);

        this.initBuffers();
    }

    initBuffers() {
        const gl = this.gl;

        // 버퍼 크기 계산
        const vSize = this.vertices.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + cSize + tSize;

        gl.bindVertexArray(this.vao);

        // VBO에 데이터 복사
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + cSize, this.texCoords);

        // EBO에 인덱스 데이터 복사
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertex attributes 설정
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // position
        gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, vSize);  // color
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, vSize + cSize); // texture coordinates

        // vertex attributes 활성화
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        // 버퍼 바인딩 해제
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, 24, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
} 