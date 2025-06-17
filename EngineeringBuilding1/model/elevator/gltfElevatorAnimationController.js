import * as THREE from 'three';
import * as Schedule from '../../util/timings.js';
import { Tubelight } from '../../util/lighting.js';
import { FirstPersonController } from '../../util/firstPersonController.js';
import { CollisionDetectorManager } from '../../util/collisionDetecterManager.js';
import { START_LEVEL, PROB_ABNORMAL, N_ABNOMRAL } from '../../src/globals.js';

/**
 * gltfElevatorAnimationController
 * GLTF 엘리베이터 애니메이션을 관리하는 클래스
 */
export class gltfElevatorAnimationController {
    /**
     * Constructor
     * 
     * @param {Object} elevatorGLTF - GLTF 로더로 로드된 엘리베이터 객체
     * @param {CollisionDetectorManager} elevatorCollisionDetectorManager - 엘레베이터 내에 있는지 확인하기 위한 CollisionDetectorManager
     * @param {Tubelight} elevatorLight - 엘레베이터 내부 불빛
     * @param {Object} floorDisplay - inner floor display와 outer floor display를 합친 객체
     * @param {HTMLAudioElement} openDoorAudio - 문 열리는 소리
     * @param {HTMLAudioElement} closeDoorAudio - 문 닫히는 소리
     * @param {HTMLAudioElement} rideAudio - 엘레베이터 잡음
     * @param {HTMLAudioElement} bellAudio - 엘레베이터 벨 소리
     */
    constructor(elevatorGLTF, elevatorCollisionDetectorManager, elevatorLight, floorDisplay, openDoorAudio, closeDoorAudio, rideAudio, bellAudio, volume) {
        // Animation related fields
        this.mixer = null;
        this.doorAnimations = { open: [], close: [] };
        this.animationFlags = {
            open: false,
            close: false
        };
        this.volume = volume;

        // Collision related fields
        this.collisionDetectorManager = elevatorCollisionDetectorManager;
        this.collisionDetectorManager.disableCollisionDetector(1);

        // Display related fields
        this.light = elevatorLight;
        this.floorDisplay = floorDisplay;

        // Audio related fields
        this.audio = {
            door: {
                open: openDoorAudio,
                close: closeDoorAudio
            },
            ride: rideAudio,
            bell: bellAudio
        };
        
        if (this.audio.door.open) this.audio.door.open.volume = volume;
        if (this.audio.door.close) this.audio.door.close.volume = volume;
        if (this.audio.ride) this.audio.ride.volume = volume;
        if (this.audio.bell) this.audio.bell.volume = volume;
        
        this.audio.ride.loop = true;
        this.audio.door.open.addEventListener("ended", () => {
            this.animationFlags.open = false;
        })
        this.audio.door.close.addEventListener("ended", () => {
            this.animationFlags.close = false;
        });

        // Flags
        this.isDoorOpen = false;
        
        if (elevatorGLTF) {
            this._initAnimations(elevatorGLTF);
        }
    }

    /**
     * 애니메이션 초기화
     * @private
     */
    _initAnimations(elevatorGLTF) {
        // GLTF의 scene을 AnimationMixer의 대상으로 설정
        this.mixer = new THREE.AnimationMixer(elevatorGLTF.scene);

        // GLTF 파일에서 애니메이션 찾기 
        const leftDoorOpen = elevatorGLTF.animations.find(clip => 
            clip.name.includes('openLeftDoor')
        );
        const leftDoorClose = elevatorGLTF.animations.find(clip => 
            clip.name.includes('closeLeftDoor')
        );
        const rightDoorOpen = elevatorGLTF.animations.find(clip => 
            clip.name.includes('openRightDoor')
        );
        const rightDoorClose = elevatorGLTF.animations.find(clip => 
            clip.name.includes('closeRightDoor')
        );

        // open 애니메이션 추가
        if (leftDoorOpen) {
            const action = this.mixer.clipAction(leftDoorOpen);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.doorAnimations.open.push(action);
        }
        if (rightDoorOpen) {
            const action = this.mixer.clipAction(rightDoorOpen);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.doorAnimations.open.push(action);
        }

        // close 애니메이션 추가
        if (leftDoorClose) {
            const action = this.mixer.clipAction(leftDoorClose);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.doorAnimations.close.push(action);
        }
        if (rightDoorClose) {
            const action = this.mixer.clipAction(rightDoorClose);
            action.setLoop(THREE.LoopOnce);
            action.clampWhenFinished = true;
            this.doorAnimations.close.push(action);
        }
    }

    /**
     * 문 열기
     */
    openDoor() {
        if (this.isDoorOpen) return;
        if (this.animationFlags.open || this.animationFlags.close) return;
        this.isDoorOpen = true;
        this.animationFlags.open = true;
        Schedule.sleep(1200).then(
            () => {
                this.collisionDetectorManager.enableCollisionDetector(1);
            }
        );
        

        this.doorAnimations.close.forEach(action => {
            action.stop();

            // Reset Audio
            this.audio.door.close.pause();
            this.audio.door.close.currentTime = 0;

            this.animationFlags.close = false;
        });

        this.doorAnimations.open.forEach(action => action.reset().play());
        this.audio.door.open.play();
    }

    /**
     * 문 닫기
     */
    closeDoor() {
        if (!this.isDoorOpen) return;
        if (this.animationFlags.open || this.animationFlags.close) return;
        this.isDoorOpen = false;
        this.animationFlags.close = true;
        this.collisionDetectorManager.disableCollisionDetector(1);

        this.doorAnimations.open.forEach(action => {
            action.stop();

            // Reset Audio
            this.audio.door.open.pause();
            this.audio.door.open.currentTime = 0;

            this.animationFlags.open = false;
        });

        this.doorAnimations.close.forEach(action => action.reset().play());
        this.audio.door.close.play();
    }

    /**
     * 애니메이션 업데이트
     * @param {number} delta : 이전 프레임과 현재 프레임 사이의 시간 차이 (초)
     */
    update(delta) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    /**
     * 엘레베이터 층 이동 (-ish)
     * @param {boolean} isAscending - true면 상승 중 아니면 하락 중
     * @param {FirstPersonController} fpc - 1인칭 카메라
     * @param {AbnormalPhenomenon} abnormalPhenomenon - 비정상 현상 관리자
     */
    async gotoNextLevel(isAscending, fpc, abnormalPhenomenon) {
        this.closeDoor();

        // 닫히는 거 끝날 때까지 기다리기
        await Schedule.waitForCondition(() => {
            return !this.animationFlags.close;
        }, 100);

        this.audio.ride.play();

        // -1~n-2 사이의 랜덤 숫자 생성
        // -1 DEFAULT
        // 복도 초기 상태 설정
        let nextLevel = this.floorDisplay.inner.currentFloor;
        if (isAscending) {
            nextLevel++;
        } else {
            nextLevel--;
        }

        if (nextLevel > START_LEVEL) {
            nextLevel = START_LEVEL;
        }

        if (nextLevel < 1) {
            nextLevel = 1;
        }
        abnormalPhenomenon.setAbnormalPhenomenonAutomatic(nextLevel, PROB_ABNORMAL, N_ABNOMRAL);

        // Flickering은 단 한 번만
        this.light.flicker([50, 25, 10], [50, 25, 10], [0.5, 0.8, 1]);

        // Jittering 자체가 시간이 걸리므로 다른 조건 필요 없음.
        await fpc.jitter(0.5, 0.7, 0.5, 0.8, 2, 0.8, 4000, 100);

        // 도착
        this.audio.ride.pause();
        this.audio.ride.currentTime = 0;

        this.audio.bell.play();

        if (isAscending) {
            this.floorDisplay.inner.elevatorAscend();
            this.floorDisplay.outer.elevatorAscend();
        } else {
            this.floorDisplay.inner.elevatorDescend();
            this.floorDisplay.outer.elevatorDescend();
        }
        
        this.openDoor();
    }

    /**
         * 엘레베이터 층 이동 (-ish)
         * @param {boolean} isAscending - true면 상승 중 아니면 하락 중
         * @param {FirstPersonController} fpc - 1인칭 카메라
         */
    async gotoNextLevel2(isAscending, fpc) {
        this.closeDoor();

        // 닫히는 거 끝날 때까지 기다리기
        await Schedule.waitForCondition(() => {
            return !this.animationFlags.close;
        }, 100);

        // Flickering은 단 한 번만
        this.light.flicker([50, 25, 10], [50, 25, 10], [0.5, 0.8, 1]);

        // Jittering 자체가 시간이 걸리므로 다른 조건 필요 없음.
        await fpc.jitter(0.5, 0.7, 0.5, 0.8, 2, 0.8, 4000, 100);

        if (isAscending) {
            this.floorDisplay.inner.elevatorAscend();
            this.floorDisplay.outer.elevatorAscend();
        } else {
            this.floorDisplay.inner.elevatorDescend();
            this.floorDisplay.outer.elevatorDescend();
        }
        
        this.openDoor();
    }

}