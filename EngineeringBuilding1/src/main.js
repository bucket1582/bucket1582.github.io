import * as THREE from 'three';
import * as Schedule from '../util/timings.js';

import { LevelPhase, levelPhase } from './events.js';
import { STANDARD_LIGHT_INTENSITIES } from './globals.js';
import { setupProcess } from './setup.js';
import { endingTexts, initializeTexts } from './text.js';

const setup = await setupProcess();

// Setup 결과 parsing
const fundamentals = setup.fundamentals;
const elevator1 = setup.elevator1;
const elevator2 = setup.elevator2;
const hallway = setup.hallway;
const npc = setup.npc;
const environment = setup.environment;
const abnormalPhenomenon = setup.abnormalPhenomenon;
const humanModel = setup.humanModel;

// Fundamentals에서 자주 쓰는 것만 parsing
const scene = fundamentals.scene;
const camera = fundamentals.camera;
const renderer = fundamentals.renderer;
const clock = fundamentals.clock;
const canvas = fundamentals.canvas;

// 텍스트 초기화
const gameTexts = initializeTexts(canvas);

// Elevator Animation는 불 킨 상태에서 실행해야 합니다.
document.addEventListener('keydown', function(event) {
    if (event.code === 'KeyT' && levelPhase == LevelPhase.HALLWAY_AFTER_NIGHT_VISION) {
        if (renderer.nightVision.isCurrentlyNightVision) {
            renderer.nightVision.turnOffNightVision();
        } else {
            renderer.nightVision.turnOnNightVision();
        }
    }
    if (event.code === 'KeyG') {
        gameTexts.toggleControlDescription();
    }
});

window.addEventListener('resize', onWindowResize, false);

camera.firstPersonController.disable();
document.addEventListener('click', () => {
    gameTexts.hideGameDescription();
    
    // FPS 모드 진입
    camera.firstPersonController.enable();
    camera.firstPersonController.controls.lock();

    elevator1.lighting.turnOnGradually(100, 50, STANDARD_LIGHT_INTENSITIES.ELEVATOR).then(
        () => {
            elevator1.controller.openDoor();
        }
    );
    elevator2.lighting.turnOnGradually(100, 50, STANDARD_LIGHT_INTENSITIES.ELEVATOR).then(
        () => {
            elevator2.controller.openDoor();
        }
    );
    hallway.lighting.turnOnGradually(100, 50, STANDARD_LIGHT_INTENSITIES.HALLWAY);    
// 한번만 실행되도록 설정
}, { once: true });

function onWindowResize() {
    camera.base.aspect = window.innerWidth / window.innerHeight;
    camera.base.updateProjectionMatrix();
    renderer.base.setSize( window.innerWidth, window.innerHeight );
}

elevator1.lighting.turnOff();
elevator2.lighting.turnOff();

const FPS = 30;
const singleFrameTime = (1/FPS);
let timeStamp = 0;
let isFirstFrame = true;
let isGameEnd = false;

update();

function update() {
    requestAnimationFrame(update);
    const delta = clock.getDelta();
    timeStamp += delta;
    if (timeStamp >= singleFrameTime) {
        timeStamp = (timeStamp % singleFrameTime);
        render(singleFrameTime);
        if (isFirstFrame) {
            isFirstFrame = false;
            for (const text of [...gameTexts.gameDescriptionTexts]) {
                text.style.color = 'red';
            }
        }
    }

    if (elevator1.floorDisplay.inner.currentFloor == 1 && !isGameEnd) {
        isGameEnd = true;
        endGame();
    }
}

function render(delta) {
    elevator1.controller.update(delta);
    elevator2.controller.update(delta);
    camera.firstPersonController.update(delta, environment.collisionDetectorManager, environment.eventManager, npc.collisionDetectorManager);    
    abnormalPhenomenon.update();

    humanModel.update(delta);

    renderer.nightVision.render();
}

async function endGame() {
    await Schedule.waitForCondition(
        () => {
            return !elevator1.controller.animationFlags.open;
        }
    );
    camera.firstPersonController.canMove = false;
    camera.firstPersonController.controls.unlock();
    camera.firstPersonController.useLock = false;
    for (const instruction of [...gameTexts.controlInstructionTexts]) {
        instruction.style.display = "none";
    }
    camera.base.position.set(0, 2000, 0);
    camera.base.lookAt(new THREE.Vector3(0, 3000, 0));
    endingTexts(canvas);
}