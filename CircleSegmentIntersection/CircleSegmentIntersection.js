/*-------------------------------------------------------------------------
07_LineSegments.js

left mouse button을 click하면 선분을 그리기 시작하고, 
button up을 하지 않은 상태로 마우스를 움직이면 임시 선분을 그리고, 
button up을 하면 최종 선분을 저장하고 임시 선분을 삭제함.

임시 선분의 color는 회색이고, 최종 선분의 color는 빨간색임.

이 과정을 반복하여 여러 개의 선분 (line segment)을 그릴 수 있음. 
---------------------------------------------------------------------------*/
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
let isInitialized = false; // global variable로 event listener가 등록되었는지 확인
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionBuffer;

let isDrawing = false;

const PHASE_INIT = 0;
const PHASE_CIRCLE = 1;
const PHASE_LINE_PREV = 2;
const PHASE_LINE = 3;
const PHASE_DONE = 4;
let drawingPhase = PHASE_INIT;

let tmpExists = false;

let circleCenter = null;
let tempRadius = null;
let circleInfo = null;

let startPoint = null;
let tempEndPoint = null;
let segmentInfo = null;

let intersections = [];

let textOverlay;
let textOverlay2;
let textOverlay3;
let axes = new Axes(gl, 0.85);

const PRECISION = 100;

// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임

// mouse 쓸 때 main call 방법
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

function setupCanvas() {
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
}

function setupBuffers(shader) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 상단이 (-1, 1), 우측 하단이 (1, -1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {
        event.preventDefault(); // 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소로 전파되지 않도록 방지
        
        if (!isDrawing) {

            if (drawingPhase == PHASE_INIT) {
                drawingPhase = PHASE_CIRCLE;
            }

            // 캔버스 좌표를 WebGL 좌표로 변환하여 시작점을 설정
            let [glX, glY] = getMouseCoordinates(event);
            if (drawingPhase == PHASE_CIRCLE) {
                circleCenter = [glX, glY];
            } else if (drawingPhase == PHASE_LINE_PREV) {
                startPoint = [glX, glY];
            }
            
            isDrawing = true;
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) {
            // Settign tmp values
            let [glX, glY] = getMouseCoordinates(event);
            if (drawingPhase == PHASE_CIRCLE) {
                // Compute the distance
                const distance = ((circleCenter[0] - glX) ** 2 + (circleCenter[1] - glY) ** 2) ** 0.5;
                tempRadius = distance;
            } else if (drawingPhase == PHASE_LINE_PREV || drawingPhase == PHASE_LINE) {
                tempEndPoint = [glX, glY];
                if (drawingPhase == PHASE_LINE_PREV) {
                    drawingPhase = PHASE_LINE;
                }
            }

            tmpExists = true;
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tmpExists) {
            if (drawingPhase == PHASE_CIRCLE) {
                // Giving circle info
                circleInfo = [circleCenter, tempRadius];
                circleCenter = null;
                tempRadius = null;

                drawingPhase = PHASE_LINE_PREV;
            } else if (drawingPhase == PHASE_LINE) {
                // Giving line segment info
                segmentInfo = [...startPoint, ...tempEndPoint];

                // Compute the intersection
                intersections = computeIntersection(startPoint, tempEndPoint, circleInfo[0], circleInfo[1]);

                startPoint = null;
                tempEndPoint = null;

                drawingPhase = PHASE_DONE;
            }

            // Update text display
            if (circleInfo) {
                updateText(textOverlay, "Circle: center (" + circleInfo[0][0].toFixed(2) + ", " + circleInfo[0][1].toFixed(2) + ") radius = " + circleInfo[1].toFixed(2));            }
            
            if (segmentInfo) {
                updateText(textOverlay2, "Line segment: (" + segmentInfo[0].toFixed(2) + ", " + segmentInfo[1].toFixed(2) + ") ~ (" + 
                    segmentInfo[2].toFixed(2) +", " + segmentInfo[3].toFixed(2) + ")");
                
                let text3 = "No intersection";
                if (intersections.length > 0) {
                    text3 = "Intersection Points: " + (intersections.length / 2);
                    for (let i = 0; i < intersections.length / 2; i++) {
                        text3 += " Point " + (i + 1) + ": (" + intersections[2 * i].toFixed(2) + ", " + intersections[2 * i + 1].toFixed(2) + ")";
                    }
                }
                updateText(textOverlay3, text3);
            }

            // Initialize tmp variables
            isDrawing = false;
            tmpExists = false;

            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.use();

    gl.bindVertexArray(vao);

    if (drawingPhase == PHASE_CIRCLE) {
        // Drawing temporary circle
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(getCircleSegmentsCoordinates(circleCenter[0], circleCenter[1], tempRadius)), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_LOOP, 0, PRECISION);
    } else if (drawingPhase != PHASE_INIT) {
        // Drawing fixed circle
        shader.setVec4("u_color", [1.0, 0.0, 0.0, 1.0]);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(getCircleSegmentsCoordinates(circleInfo[0][0], circleInfo[0][1], circleInfo[1])), gl.STATIC_DRAW);
        gl.drawArrays(gl.LINE_LOOP, 0, PRECISION);
        
        if (drawingPhase == PHASE_LINE) {
            // Draw temporary line
            shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
            gl.drawArrays(gl.LINES, 0, 2);
        } else if (drawingPhase == PHASE_DONE) {
            // Draw fixed components
            shader.setVec4("u_color", [0.0, 1.0, 1.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(segmentInfo), gl.STATIC_DRAW);
            gl.drawArrays(gl.LINES, 0, 2);

            if (intersections.length > 0) {
                // Draw intersection points
                shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(intersections), gl.STATIC_DRAW);
                gl.drawArrays(gl.POINTS, 0, intersections.length / 2);
            }
        }
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create());
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

        // 셰이더 초기화
        shader = await initShader();
        
        // 나머지 초기화
        setupCanvas();
        setupBuffers(shader);
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "", 1);
        textOverlay2 = setupText(canvas, "", 2);
        textOverlay3 = setupText(canvas, "", 3)
        
        // 마우스 이벤트 설정
        setupMouseEvents();
        
        // 초기 렌더링
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}

function getMouseCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    return convertToWebGLCoordinates(x, y);
}

function getCircleSegmentsCoordinates(centerX, centerY, radius) {
    let coords = [];
    for (let i = 0; i < PRECISION; i++) {
        let theta = (2 * Math.PI / PRECISION) * i;
        coords.push(centerX + radius * Math.cos(theta));
        coords.push(centerY + radius * Math.sin(theta));
    }
    return coords;
}

function computeIntersection(segmentStart, segmentEnd, circleCenter, circleRadius) {
    const coefOftSquared = (segmentEnd[0] - segmentStart[0]) ** 2 + (segmentEnd[1] - segmentStart[1]) ** 2;
    const coefOft = 2 * (segmentEnd[0] - segmentStart[0]) * (segmentStart[0] - circleCenter[0]) + 2 * (segmentEnd[1] - segmentStart[1]) * (segmentStart[1] - circleCenter[1]);
    const constant = (segmentStart[0] - circleCenter[0]) ** 2 + (segmentStart[1] - circleCenter[1]) ** 2 - circleRadius ** 2

    const determinant = coefOft ** 2 - 4 * coefOftSquared * constant;
    if (determinant < 0) {
        return [];
    }

    if (determinant == 0) {
        // there exists unique root
        const t = -coefOft / (2 * coefOftSquared);
        if (t < 0 || t > 1) {
            return [];
        }

        return [(segmentEnd[0] - segmentStart[0]) * t + segmentStart[0], (segmentEnd[1] - segmentStart[1]) * t + segmentStart[1]];
    }

    const t1 = (-coefOft + determinant ** 0.5) / (2 * coefOftSquared);
    const t2 = (-coefOft - determinant ** 0.5) / (2 * coefOftSquared);

    let result = [];
    if (t1 >= 0 && t1 <= 1) {
        result.push((segmentEnd[0] - segmentStart[0]) * t1 + segmentStart[0]);
        result.push((segmentEnd[1] - segmentStart[1]) * t1 + segmentStart[1]);
    }

    if (t2 >= 0 && t2 <= 1) {
        result.push((segmentEnd[0] - segmentStart[0]) * t2 + segmentStart[0]);
        result.push((segmentEnd[1] - segmentStart[1]) * t2 + segmentStart[1]);
    }

    console.log(t1);
    console.log(t2);

    return result;
}