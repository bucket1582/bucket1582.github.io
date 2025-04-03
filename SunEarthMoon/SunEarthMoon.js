/*-------------------------------------------------------------------------
08_Transformation.js

canvas의 중심에 한 edge의 길이가 0.3인 정사각형을 그리고, 
이를 크기 변환 (scaling), 회전 (rotation), 이동 (translation) 하는 예제임.
    T는 x, y 방향 모두 +0.5 만큼 translation
    R은 원점을 중심으로 2초당 1회전의 속도로 rotate
    S는 x, y 방향 모두 0.3배로 scale
이라 할 때, 
    keyboard 1은 TRS 순서로 적용
    keyboard 2는 TSR 순서로 적용
    keyboard 3은 RTS 순서로 적용
    keyboard 4는 RST 순서로 적용
    keyboard 5는 STR 순서로 적용
    keyboard 6은 SRT 순서로 적용
    keyboard 7은 원래 위치로 돌아옴
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let axesVAO;
let lastTime;

const SUN_ROTATION = Math.PI / 4;
const EARTH_ROTATION = Math.PI;
const MOON_ROTATION = Math.PI;
const EARTH_REVOLUTION = Math.PI / 6;
const MOON_REVOLUTION = 2 * Math.PI;

const SUN_SIZE = 0.2;
const EARTH_SIZE = 0.1;
const MOON_SIZE = 0.05;

const EARTH_ORBIT_RADIUS = 0.7;
const MOON_ORBIT_RADIUS = 0.2;

let sunRotation = 0;
let earthRotation = 0;
let earthOrbit = 0;
let moonRotation = 0;
let moonOrbit = 0;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => {
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
        requestAnimationFrame(animate);
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.2, 0.3, 0.4, 1.0);
    
    return true;
}

function setupAxesBuffers(shader) {
    axesVAO = gl.createVertexArray();
    gl.bindVertexArray(axesVAO);

    const axesVertices = new Float32Array([
        -0.8, 0.0, 0.0, 0.8, 0.0, 0.0, // x축
        0.0, -0.8, 0.0, 0.0, 0.8, 0.0  // y축
    ]);

    const axesColors = new Float32Array([
        1.0, 0.0, 0.0, 0.5,
        1.0, 0.0, 0.0, 0.5,
        0.0, 1.0, 0.0, 0.5,
        0.0, 1.0, 0.0, 0.5
    ])

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("aPosition", 3, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, axesColors, gl.STATIC_DRAW);
    shader.setAttribPointer("aColor", 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function getDefaultSquare(colorR, colorG, colorB, colorA) {
    let squareVAO = gl.createVertexArray();
    gl.bindVertexArray(squareVAO);

    // 기본 정사각형의 크기는 항상 고정
    const squareVertices = new Float32Array([
        -0.5, -0.5, 0.0,
        0.5, -0.5, 0.0,
        0.5, 0.5, 0.0,
        -0.5, 0.5, 0.0
    ])

    const squareColors = new Float32Array([
        colorR, colorG, colorB, colorA,
        colorR, colorG, colorB, colorA,
        colorR, colorG, colorB, colorA,
        colorR, colorG, colorB, colorA
    ])

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("aPosition", 3, gl.FLOAT, false, 0, 0);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, squareColors, gl.STATIC_DRAW);
    shader.setAttribPointer("aColor", 4, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    return squareVAO;
}

function renderCelestialBody(colorR, colorG, colorB, colorA, transformMatrix) {
    // 기본 정사각형 생성 및 바인딩
    let celestialVAO = getDefaultSquare(colorR, colorG, colorB, colorA);
    gl.bindVertexArray(celestialVAO);

    // 변환 적용
    shader.setMat4("uModel", transformMatrix);
    
    // 실제로 그리기
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    // 종료
    gl.bindVertexArray(null);
}

function render(deltaTime) {
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 각도 계산
    sunRotation += SUN_ROTATION * deltaTime;
    earthRotation += EARTH_ROTATION * deltaTime;
    earthOrbit += EARTH_REVOLUTION * deltaTime;
    moonRotation += MOON_ROTATION * deltaTime;
    moonOrbit += MOON_REVOLUTION * deltaTime;

    // 변환 모음
    // 태양
    const sunMatrix = mat4.create();
    mat4.rotate(sunMatrix, sunMatrix, sunRotation, [0, 0, 1]);
    mat4.scale(sunMatrix, sunMatrix, [SUN_SIZE, SUN_SIZE, 1]);

    // 지구
    // 자전 → 반지름 → 공전 순서로 변환해야 하므로 행렬곱은 이 반대의 순서 적용!
    const earthMatrix = mat4.create();
    mat4.rotate(earthMatrix, earthMatrix, earthOrbit, [0, 0, 1]);
    mat4.translate(earthMatrix, earthMatrix, [EARTH_ORBIT_RADIUS, 0, 0]);
    mat4.rotate(earthMatrix, earthMatrix, earthRotation, [0, 0, 1]);
    mat4.scale(earthMatrix, earthMatrix, [EARTH_SIZE, EARTH_SIZE, 1]);

    // 달
    // 자전 → 반지름 → 공전 → 반지름 → 공전 순서로 변환해야 하므로 행렬곱은 이 반대의 순서 적용!
    // 이때 공전은 태양을 공전하는 것을 먼저 고려해야 함!
    const moonMatrix = mat4.create();
    mat4.rotate(moonMatrix, moonMatrix, earthOrbit, [0, 0, 1]);
    mat4.translate(moonMatrix, moonMatrix, [EARTH_ORBIT_RADIUS, 0, 0]);
    mat4.rotate(moonMatrix, moonMatrix, moonOrbit, [0, 0, 1]);
    mat4.translate(moonMatrix, moonMatrix, [MOON_ORBIT_RADIUS, 0, 0]);
    mat4.rotate(moonMatrix, moonMatrix, moonRotation, [0, 0, 1]);
    mat4.scale(moonMatrix, moonMatrix, [MOON_SIZE, MOON_SIZE, 1]);

    shader.use();

    // 축 그리기
    gl.bindVertexArray(axesVAO);
    shader.setMat4("uModel", mat4.create());
    gl.drawArrays(gl.LINES, 0, 4);
    gl.bindVertexArray(null);

    // 천체체 그리기
    renderCelestialBody(1.0, 0.0, 0.0, 1.0, sunMatrix); // 태양
    renderCelestialBody(0.0, 1.0, 1.0, 1.0, earthMatrix); // 지구
    renderCelestialBody(1.0, 1.0, 0.0, 1.0, moonMatrix); // 달

    // 실제로 그리기
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
}

function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    render(deltaTime);
    requestAnimationFrame(animate);
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        
        shader = await initShader();
        setupAxesBuffers(shader);
        shader.use();

        animate(0);        
        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
