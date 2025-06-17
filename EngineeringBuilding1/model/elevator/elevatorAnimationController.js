import * as THREE from 'three';

/**
 * elevatorAnimationController
 * 엘리베이터 애니메이션을 관리하는 클래스
 */
export class ElevatorAnimationController {
    /**
     * Constructor
     * 
     * @param {string} elevatorPath  : 엘리베이터 FBX 객체  
     * 실제사용시 고정파일 Elevator.fbx 의 객체를 사용함
     */
    constructor(elevatorObject) {
        this.mixer = null;
        this.doorAnimations = { open: [], close: [] };
        this.isDoorOpen = false;
        
        if (elevatorObject) {
            this._initAnimations(elevatorObject);
        }

    }

    /**
     * 애니메이션 초기화
     * @private
     */
    _initAnimations(elevatorObject) {

        this.mixer = new THREE.AnimationMixer(elevatorObject);

        // fbx 파일에서 애니메이션 찾기
        const leftDoorOpen = elevatorObject.animations.find(clip => 
            clip.name.includes('Left Door|Open Left Door')
        );
        const leftDoorClose = elevatorObject.animations.find(clip => 
            clip.name.includes('Left Door|Close Left Door')
        );
        const rightDoorOpen = elevatorObject.animations.find(clip => 
            clip.name.includes('Right Door|Open Right Door')
        );
        const rightDoorClose = elevatorObject.animations.find(clip => 
            clip.name.includes('Right Door|Close Right Door')
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
        this.isDoorOpen = true;
        this.doorAnimations.close.forEach(action => action.stop());
        this.doorAnimations.open.forEach(action => action.reset().play());
    }

    /**
     * 문 닫기
     */
    closeDoor() {
        if (!this.isDoorOpen) return;
        this.isDoorOpen = false;
        this.doorAnimations.open.forEach(action => action.stop());
        this.doorAnimations.close.forEach(action => action.reset().play());
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
}