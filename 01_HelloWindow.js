// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

// Default values
const default_height = 500;
const default_width = 500;

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 현재 window 전체를 canvas로 사용
canvas.width = default_width;
canvas.height = default_height;

// Initialize WebGL settings: viewport and clear color
drawQuadrants();

// Start rendering
render();

// Render loop
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);    
    // Draw something here
    drawQuadrants();
}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    // 윈도우의 가로와 세로 길이 중 더 짧은 쪽으로 길이 통일 (1 : 1 비율)
    if (window.innerHeight > window.innerWidth) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerWidth;
    } else {
        canvas.width = window.innerHeight;
        canvas.height = window.innerHeight;
    }

    canvas.width = default_width;
    canvas.height = default_height;

    render();
});

function drawQuadrants() {
    // Viewport를 4번 바꿔가면서 각 사분면을 칠한다
    gl.enable(gl.SCISSOR_TEST);

    // 빨간색
    partitionViewport(0, canvas.height / 2, canvas.width / 2, canvas. height / 2);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    // 녹색
    partitionViewport(canvas.width / 2, canvas.height / 2, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 파란색
    partitionViewport(0, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 노란색 = 빨간색 + 녹색
    partitionViewport(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
    gl.clearColor(1, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.SCISSOR_TEST);
}

function partitionViewport(llx, lly, width, height) {
    // Viewport를 바꾸고 scissor를 적용한다.
    gl.viewport(llx, lly, width, height);
    gl.scissor(llx, lly, width, height);
}