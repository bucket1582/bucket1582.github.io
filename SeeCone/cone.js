export class Cone {
    /**
     * @param {WebGLRenderingContext} gl         - WebGL 렌더링 컨텍스트
     * @param {number} segments                 - 옆면 세그먼트 수 (원 둘레를 몇 등분할지)
     * @param {object} options
     *        options.color : [r, g, b, a] 형태의 색상 (기본 [0.8, 0.8, 0.8, 1.0])
     */
    constructor(gl, segments = 32, options = {}) {
        this.gl = gl;

        // VAO, VBO, EBO 생성
        this.vao = gl.createVertexArray();
        this.vbo = gl.createBuffer();
        this.ebo = gl.createBuffer();

        // 파라미터 설정
        const radius = 0.5;     // 원뿔 밑면 반지름
        const halfH = 0.5;      // 높이의 절반 (y=-0.5 ~ y=0.5)
        this.segments = segments;

        // 세그먼트별 각도 간격
        const angleStep = (2 * Math.PI) / segments;

        // 정점/법선/색상/텍스처좌표/인덱스 데이터를 담을 임시 배열
        const positions = [];
        const normals = [];
        const colors = [];
        const texCoords = [];
        const indices = [];

        // 옵션에서 color가 있으면 사용, 없으면 기본값 사용
        const defaultColor = [0.8, 0.8, 0.8, 1.0];
        const colorOption = options.color || defaultColor;

        const topVertex = [0, 0.5, 0];

        const faceNormals = [];
        for (let i = 0; i < segments; i++) {
            const angle0 = i * angleStep;
            const angle1 = (i + 1) * angleStep;

            // 한 면에 3개의 꼭짓점
            positions.push(
                topVertex[0], topVertex[1], topVertex[2],
                radius * Math.cos(angle0), -0.5, radius * Math.sin(angle0),
                radius * Math.cos(angle1), -0.5, radius * Math.sin(angle1)
            );

            // 각 평면에서의 법선 벡터
            let faceNormal = [
                radius * (Math.sin(angle1) - Math.sin(angle0)),
                Math.pow(radius, 2) * Math.sin(angleStep),
                radius * (Math.cos(angle1) - Math.cos(angle0))
            ];

            console.log(faceNormal);

            // 정규화
            const normalSize = Math.sqrt(Math.pow(faceNormal[0], 2) + Math.pow(faceNormal[1], 2) + Math.pow(faceNormal[2], 2))

            faceNormal[0] = faceNormal[0] / normalSize;
            faceNormal[1] = faceNormal[1] / normalSize;
            faceNormal[2] = faceNormal[2] / normalSize;

            faceNormals.push(faceNormal);

            normals.push(
                faceNormal[0], faceNormal[1], faceNormal[2],
                faceNormal[0], faceNormal[1], faceNormal[2],
                faceNormal[0], faceNormal[1], faceNormal[2]
            );

            // 색깔
            colors.push(
                colorOption[0], colorOption[1], colorOption[2], colorOption[3],
                colorOption[0], colorOption[1], colorOption[2], colorOption[3],
                colorOption[0], colorOption[1], colorOption[2], colorOption[3]
            );

            // 임의로 지정한 텍스쳐 좌표
            texCoords.push(
                0.5, 1,
                0, 0,
                1, 0
            );

            // 인덱스
            indices.push(
                3 * i + 0,
                3 * i + 1,
                3 * i + 2
            );
        }

        const vertexNormals = [];

        for (let i = 0; i < segments; i++) {
            let lastFaceNormal;
            if (i == 0) {
                lastFaceNormal = faceNormals[segments - 1];
            } else {
                lastFaceNormal = faceNormals[i - 1];
            }

            let thisFaceNormal = faceNormals[i];

            let nextFaceNormal;
            if (i == segments - 1) {
                nextFaceNormal = faceNormals[0];
            } else {
                nextFaceNormal = faceNormals[i + 1];
            }

            let leftVertexNormal = [
                (lastFaceNormal[0] + thisFaceNormal[0]) / 2,
                (lastFaceNormal[1] + thisFaceNormal[1]) / 2,
                (lastFaceNormal[2] + thisFaceNormal[2]) / 2
            ];

            const leftVertexNormalSize = Math.sqrt(Math.pow(leftVertexNormal[0], 2) + Math.pow(leftVertexNormal[1], 2) + Math.pow(leftVertexNormal[2], 2));

            let rightVertexNormal = [
                (nextFaceNormal[0] + thisFaceNormal[0]) / 2,
                (nextFaceNormal[1] + thisFaceNormal[1]) / 2,
                (nextFaceNormal[2] + thisFaceNormal[2]) / 2
            ];

            const rightVertexNormalSize = Math.sqrt(Math.pow(rightVertexNormal[0], 2) + Math.pow(rightVertexNormal[1], 2) + Math.pow(rightVertexNormal[2], 2));

            leftVertexNormal[0] = leftVertexNormal[0] / leftVertexNormalSize;
            leftVertexNormal[1] = leftVertexNormal[1] / leftVertexNormalSize;
            leftVertexNormal[2] = leftVertexNormal[2] / leftVertexNormalSize;

            rightVertexNormal[0] = rightVertexNormal[0] / rightVertexNormalSize;
            rightVertexNormal[1] = rightVertexNormal[1] / rightVertexNormalSize;
            rightVertexNormal[2] = rightVertexNormal[2] / rightVertexNormalSize;

            vertexNormals.push(
                0, 1, 0,
                leftVertexNormal[0], leftVertexNormal[1], leftVertexNormal[2],
                rightVertexNormal[0], rightVertexNormal[1], rightVertexNormal[2]
            );
        }

        // Float32Array/Uint16Array에 담기
        this.vertices = new Float32Array(positions);
        this.normals = new Float32Array(normals);
        this.colors = new Float32Array(colors);
        this.texCoords = new Float32Array(texCoords);
        this.indices = new Uint16Array(indices);

        // backup normals (for flat/smooth shading)
        this.faceNormals = new Float32Array(this.normals);
        this.vertexNormals = new Float32Array(vertexNormals);

        // WebGL 버퍼 초기화
        this.initBuffers();
    }

    // faceNormals -> normals 복사
    copyFaceNormalsToNormals() {
        this.normals.set(this.faceNormals);
    }

    // vertexNormals -> normals 복사
    copyVertexNormalsToNormals() {
        this.normals.set(this.vertexNormals);
    }

    initBuffers() {
        const gl = this.gl;

        // 배열 크기 측정
        const vSize = this.vertices.byteLength;
        const nSize = this.normals.byteLength;
        const cSize = this.colors.byteLength;
        const tSize = this.texCoords.byteLength;
        const totalSize = vSize + nSize + cSize + tSize;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, totalSize, gl.STATIC_DRAW);

        // 순서대로 복사 (positions -> normals -> colors -> texCoords)
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize, this.colors);
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize + nSize + cSize, this.texCoords);

        // 인덱스 버퍼 (EBO)
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

        // vertexAttribPointer 설정
        // (shader의 layout: 0->pos, 1->normal, 2->color, 3->texCoord)
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);  // positions
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, vSize); // normals
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, vSize + nSize); // colors
        gl.vertexAttribPointer(3, 2, gl.FLOAT, false, 0, vSize + nSize + cSize); // texCoords

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);
        gl.enableVertexAttribArray(3);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * normals 배열 일부만 업데이트하고 싶을 때 (ex: Face/Vertex normal 토글 후)
     */
    updateNormals() {
        const gl = this.gl;
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

        const vSize = this.vertices.byteLength;
        // normals 부분만 다시 업로드
        gl.bufferSubData(gl.ARRAY_BUFFER, vSize, this.normals);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindVertexArray(null);
    }

    /**
     * 그리기
     * @param {Shader} shader - 사용할 셰이더
     */
    draw(shader) {
        const gl = this.gl;
        shader.use();
        gl.bindVertexArray(this.vao);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    /**
     * 리소스 해제
     */
    delete() {
        const gl = this.gl;
        gl.deleteBuffer(this.vbo);
        gl.deleteBuffer(this.ebo);
        gl.deleteVertexArray(this.vao);
    }
}
