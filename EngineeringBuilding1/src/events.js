import * as THREE from 'three';

import { gltfElevatorAnimationController } from "../model/elevator/gltfElevatorAnimationController.js";
import { NightVisionRenderer } from "../shader/nightVision/nightVision.js";
import { FirstPersonController } from "../util/firstPersonController.js";
import { TubelightSystem } from "../util/lighting.js";
import * as Schedule from '../util/timings.js';
import { STANDARD_LIGHT_INTENSITIES } from './globals.js';

/**
 * 복도 중간쯤 도착했을 때 불 꺼지며 야간투시경 전환
 * @param {TubelightSystem} lightSystem 
 * @param {NightVisionRenderer} nightVision 
 * @param {THREE.AmbientLight} ambientLight 
 */
export async function transitionToNightVision(lightSystem, nightVision, fpc, failureCallback) {
    if (levelPhase != LevelPhase.HALLWAY_BEFORE_NIGHT_VISION) return;

    levelPhase = LevelPhase.HALLWAY_AFTER_NIGHT_VISION;
    if(lightSound) lightSound.pause();
    await lightSystem.flicker([500, 250, 100], [500, 250, 100], [0.3, 0.8, 0.3]);
    await lightSystem.turnOffGradually(500, 50);
    
    // Death
    Schedule.sleep(300 * 1000).then(
        () => {
            nightVision.graduallyDying();            
        }
    );

    waitingForDeath = true;

    // Breathing
    Schedule.sleep(318 * 1000).then(
        () => {
            if (!waitingForDeath) {
                return;
            }

            if (breathSound) breathSound.play();
        }
    );

    // Real death
    Schedule.sleep(360 * 1000).then(
        () => {
            if (!waitingForDeath) {
                return;
            }
            forceFailure = true;
            fpc.camera.position.set(90, 300, 0);
            failureCallback();

            if (breathSound) {
                breathSound.pause();
            }
        }
    )
}

/**
 * 다음 층으로 Go!
 * @param {TubelightSystem} lightSystem
 * @param {NightVisionRenderer} nightVision
 * @param {gltfElevatorAnimationController} elevator
 * @param {FirstPersonController} fpc
 * @param {AbnormalPhenomenon} abnormalPhenomenon
 * @param {boolean} returnedToStart : 시작 지점에 있는 엘레베이터로 돌아왔는가?
 */
export async function nextLevelTransition(lightSystem, nightVision, elevator, elevator2, fpc, abnormalPhenomenon, returnedToStart) {
    if (levelPhase == LevelPhase.ELEVATOR_LOADING) return;
    waitingForDeath = false;

    // 엘레베이터 내에서는 이동 불가
    fpc.canMove = false;

    // Reset sounds
    if (lightSound) {
        lightSound.pause();
    }
    if (breathSound) {
        breathSound.pause();
    }

    let isCurrentStageFail = abnormalPhenomenon.hallwayVisibilityManager.checkIfDefault() != returnedToStart;
    if (forceFailure) {
        isCurrentStageFail = true;
    }

    // Nightvision 처리
    if (nightVision.isCurrentlyNightVision) {
        nightVision.turnOffNightVision();
    }

    if (nightVision.startedDying) {
        nightVision.resetDeathTime();
    }

    if (returnedToStart) {
        fpc.smoothlyMoveToTheEndPosition(fpc.camera.position, new THREE.Vector3(90, 300, 0), 2000, 200);
    } else {
        fpc.smoothlyMoveToTheEndPosition(fpc.camera.position, new THREE.Vector3(-6240, 300, 0), 2000, 200);
    }
    
    // 문이 열리고 있는 중이면 그거 기다려라 (정말 급한 사용자)
    await Promise.all([
        Schedule.waitForCondition(() => { 
            return !elevator.animationFlags.open;
        }, 100),
        Schedule.waitForCondition(() => { 
            return !elevator2.animationFlags.open;
        }, 100)
    ]);

    levelPhase = LevelPhase.ELEVATOR_LOADING;

    // 두 엘리베이터 동시에 gotoNextLevel
    // 두개중 하나만 다음층 스테이지 결정한다 
    await Promise.all([
        elevator.gotoNextLevel(isCurrentStageFail, fpc, abnormalPhenomenon),  
        elevator2.gotoNextLevel2(isCurrentStageFail, fpc)
    ]);

    fpc.camera.position.set(90, 300, 0);
    if (!returnedToStart) {
        fpc.camera.rotateY(Math.PI);
    }
    
    await Schedule.sleep(300); // Race condition을 막기 위한 시간 간격

    await lightSystem.turnOnGradually(500, 50, STANDARD_LIGHT_INTENSITIES.HALLWAY);

    fpc.canMove = true;
}

/**
 * 레벨 진입!
 */
export function startLevel() {
    if (levelPhase != LevelPhase.ELEVATOR_LOADING) return;
    levelPhase = LevelPhase.HALLWAY_BEFORE_NIGHT_VISION;
    waitingForDeath = false;
    forceFailure = false;
    if (lightSound) lightSound.play();
    if (breathSound) breathSound.currentTime = 0;
}

export const LevelPhase = Object.freeze({
    ELEVATOR_LOADING: 0,
    HALLWAY_BEFORE_NIGHT_VISION: 1,
    HALLWAY_AFTER_NIGHT_VISION: 2
});

export let levelPhase = LevelPhase.ELEVATOR_LOADING;

let waitingForDeath = false;
let forceFailure = false;
let lightSound = new Audio("../assets/lightsound.mp3");
let breathSound = new Audio("../assets/breathsound.mp3");
lightSound.loop = true;