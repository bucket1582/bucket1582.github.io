import { resizeAspectRatio, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

let isInitialized = false;
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let sunVao;
let earthVao;
let moonVao;
let axes;
let lastTime = 0;

let sunRotationAngle = 0;
let earthRotationAngle = 0;
let moonRotationAngle = 0;

let earthOrbitAngle = 0;
let moonOrbitAngle = 0;

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
        requestAnimationFrame(render);
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

function setupBuffers() {
    const cubeVertices = new Float32Array([
        -0.5,  -0.5,  0.0,
        -0.5,  0.5,  0.0,
         0.5,  0.5,  0.0,
         0.5, -0.5,  0.0  
    ]);
    
    // SunVAO
    sunVao = gl.createVertexArray();
    gl.bindVertexArray(sunVao);

    // VBO for position
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // EarthVAO
    earthVao = gl.createVertexArray();
    gl.bindVertexArray(earthVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); 
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);

    // MoonVAO  
    moonVao = gl.createVertexArray();
    gl.bindVertexArray(moonVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); 
    shader.setAttribPointer("a_position", 3, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

function render(currentTime) {
    if (!lastTime) lastTime = currentTime; // if lastTime == 0
    let deltaTime = (currentTime - lastTime) / 1000; // ms -> s
    lastTime = currentTime;

    sunRotationAngle += Math.PI / 4 * deltaTime; 
    earthRotationAngle += Math.PI * deltaTime;
    earthOrbitAngle += Math.PI / 6 * deltaTime;
    moonRotationAngle += Math.PI * deltaTime;
    moonOrbitAngle += Math.PI * 2 * deltaTime;

    gl.clear(gl.COLOR_BUFFER_BIT);
    // draw axes
    axes.draw(mat4.create(), mat4.create()); 

    // draw cube
    shader.use();
    
    let T = mat4.create();
    
    // Sun
    gl.bindVertexArray(sunVao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    mat4.rotate(T, T, sunRotationAngle, [0, 0, 1]);
    mat4.scale(T, T, [0.2, 0.2, 1]);
    shader.setMat4("u_model", T);
    shader.setVec4("u_color", 1.0, 0.0, 0.0, 1.0);

    gl.bindVertexArray(null);

    // Earth
    gl.bindVertexArray(earthVao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

    T = mat4.create();
    mat4.rotate(T, T, earthOrbitAngle, [0, 0, 1]);
    mat4.translate(T, T, [0.7, 0, 0]);
    mat4.rotate(T, T, earthRotationAngle, [0, 0, 1]);
    mat4.scale(T, T, [0.1, 0.1, 1]);
    shader.setMat4("u_model", T);
    shader.setVec4("u_color", 0.0, 1.0, 1.0, 1.0);

    gl.bindVertexArray(null);

    // Moon
    gl.bindVertexArray(moonVao);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);   

    T = mat4.create();
    mat4.rotate(T, T, earthOrbitAngle, [0, 0, 1]);   
    mat4.translate(T, T, [0.7, 0, 0]);                
    mat4.rotate(T, T, moonOrbitAngle, [0, 0, 1]);    
    mat4.translate(T, T, [0.2, 0, 0]);                
    mat4.rotate(T, T, moonRotationAngle, [0, 0, 1]); 
    mat4.scale(T, T, [0.05, 0.05, 1]);   
    shader.setMat4("u_model", T);
    shader.setVec4("u_color", 1.0, 1.0, 0.0, 1.0);  

    gl.bindVertexArray(null);

    requestAnimationFrame(render);
}


async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    
    shader = new Shader(gl, vertexShaderSource, fragmentShaderSource);
    return true;
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }
        await initShader();

        setupBuffers();
        axes = new Axes(gl, 0.8); 

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
