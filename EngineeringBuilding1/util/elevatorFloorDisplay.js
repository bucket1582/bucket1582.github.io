import * as THREE from 'three';
import { Text } from 'troika-three-text';

export class ElevatorFloorDisplay {
    /**
     * ElevatorFloorDisplay는 엘리베이터 층수 표시를 관리하는 클래스
     * 
     * @param {THREE.Scene} scene - 씬 객체
     * @param {THREE.Object3D} elevatorModel - 엘리베이터 모델
     * @param {Number} fontSize - 폰트 크기 (기본값: 30)
     * @param {Number} color - 텍스트 색상 (기본값: 0xff0000)
     * @param {Number} xOffset - x축 오프셋 (기본값: 0)
     * @param {Number} yOffset - y축 오프셋 (기본값: 0)
     * @param {Number} zOffset - z축 오프셋 (기본값: 0)
     * @param {Number} currentFloor - 현재 층수 (기본값: 5)
     * 
     * 초기 위치는 월드좌표계에서 엘리베이터의 중심에 있으며,
     * 위치는 수동으로 조정하거나 원하는 mesh의 box를 관찰하여 max, min, center 및 엘리베이터 center를 계산하여 조정할 수 있습니다.
     * 방향성 문제로 인해 자동 계산은 지원 하지 않습니다.
     */
    constructor(scene, elevatorModel, fontSize = 30, color = 0xff0000, xOffset = 0, yOffset = 0, zOffset = 0, currentFloor = 5) {
        if (!scene || !elevatorModel ) {
            throw new Error('scene or elevatorModel is invalid in ElevatorFloorDisplay constructor');
        }
        this.scene = scene;
        this.elevatorModel = elevatorModel;
        this.fontSize = fontSize;
        this.color = color;
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        this.zOffset = zOffset;
        this.currentFloor = currentFloor;

        this.text = null;
        this.initFloorDisplay();
    }

    /**
     * 층수 표시 초기화
     * 기본 위치는 엘리베이터의 월드 좌표 중심입니다
     */
    initFloorDisplay() {
        // 엘리베이터 위치와 크기 가져오기
        const elevatorBox = new THREE.Box3().setFromObject(this.elevatorModel);
        const elevatorCenter = new THREE.Vector3();
        elevatorBox.getCenter(elevatorCenter);

        this.text = new Text();
        this.text.text = this.currentFloor.toString();
        this.text.fontSize = this.fontSize;
        this.text.color = this.color;
        this.text.position.set(
            elevatorCenter.x + this.xOffset,
            elevatorCenter.y + this.yOffset,
            elevatorCenter.z + this.zOffset
        );
        this.text.anchorX = 'center';
        this.text.anchorY = 'middle';
        this.scene.add(this.text);
        this.text.sync();
    }

    /**
     * 층수 올리기
     */
    elevatorAscend() {
        if (this.text) {
            this.currentFloor = this.currentFloor + 1;
            if (this.currentFloor > 5) {
                this.currentFloor = 5;
            }
            this.text.text = this.currentFloor.toString();
            this.text.sync();
        }
    }

    /**
     * 층수 내리기
     */
    elevatorDescend() {
        if (this.text) {
            this.currentFloor = this.currentFloor - 1;
            if (this.currentFloor < 1) {
                this.currentFloor = 1;
            }
            this.text.text = this.currentFloor.toString();
            this.text.sync();
        }
    }

    /**
     * 표시 위치 업데이트
     */
    updatePosition() {
        if (this.text) {
            const elevatorBox = new THREE.Box3().setFromObject(this.elevatorModel);
            const elevatorCenter = new THREE.Vector3();
            elevatorBox.getCenter(elevatorCenter);

            this.text.position.set(
                elevatorCenter.x + this.xOffset,
                elevatorCenter.y + this.yOffset,
                elevatorCenter.z + this.zOffset
            );
            this.text.sync();
        }
    }

    /**
     * 텍스트 색상 설정
     * @param {Number} color - 색상값 (16진수)
     */
    setColor(color) {
        if (this.text) {
            this.text.color = color;
            this.text.sync();
        }
    }

    /**
     * 텍스트 크기 설정
     * @param {Number} size - 폰트 크기
     */
    setFontSize(size) {
        if (this.text) {
            this.text.fontSize = size;
            this.text.sync();
        }
    }

    /**
     * 표시 위치 오프셋 설정
     * @param {Number} xOffset - x축 오프셋
     * @param {Number} yOffset - y축 오프셋
     * @param {Number} zOffset - z축 오프셋
     */
    setOffset(xOffset, yOffset, zOffset) {
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        this.zOffset = zOffset;
        this.updatePosition();
    }

    /**
     * 표시 보이기/숨기기
     * @param {Boolean} visible - 표시 여부
     */
    setVisible(visible) {
        if (this.text) {
            this.text.visible = visible;
            this.text.sync();
        }
    }

    /**
     * Y축 회전
     * @param {Number} angle - 회전 각도
     */
    rotateY(angle) {
        if (this.text) {
            this.text.rotateY(angle);
            this.text.sync();
        }
    }

    /**
     * X축 회전
     * @param {Number} angle - 회전 각도
     */
    rotateX(angle) {
        if (this.text) {
            this.text.rotateX(angle);
            this.text.sync();
        }
    }

    /**
     * Z축 회전
     * @param {Number} angle - 회전 각도
     */
    rotateZ(angle) {
        if (this.text) {
            this.text.rotateZ(angle);
            this.text.sync();
        }
    }
}