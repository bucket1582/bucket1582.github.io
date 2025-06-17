import * as THREE from 'three';
import { CollisionDetector } from './collectionDetecter.js';

export class CollisionDetectorManager {
  /**
   * CollisionDetectorManager는 여러 충돌 감지기를 관리하는 클래스
   * 카메라가 충돌감지기 박스 간에 이동 허용
   * 
   * @param {THREE.Camera} camera : 카메라 객체
   * @param {THREE.Scene} scene : 씬 객체
   * @param {boolean} isShow : 디버그 보조 모델 표시 여부
   * 
   */
  constructor(camera, scene, isShow = true) {
    if (!scene) {
      throw new Error("Scene is required in CollisionDetectorManager.");
    }
    this.camera = camera;
    this.isShow = isShow;
    this.scene = scene;
    this.collisionDetectors = [];
  }
  
  /**
   * 충돌 감지기 추가
   * 
   * @param {THREE.Object3D} model - 추가할 모델
   * @param {THREE.Vector3} boxScale - 개별 박스 스케일 (선택사항)
   * @param {THREE.Vector3} boxOffset - 개별 박스 오프셋 (선택사항)
   * @returns {number} 추가된 감지기의 인덱스
   */
  addCollisionDetector(model, boxScale, boxOffset) {
    if (!(model instanceof THREE.Object3D)) {
      throw new Error("Model is not a THREE.Object3D in CollisionDetectorManager.");
    }
    const collisionDetector = new CollisionDetector(this.camera, this.scene, model, boxScale, boxOffset, this.isShow);
    this.collisionDetectors.push(collisionDetector);
    return this.collisionDetectors.length - 1;
  }
  
  /**
   * 충돌 감지기 제거
   * 
   * @param {number} index - 제거할 감지기의 인덱스
   * @returns {boolean} 제거 성공 여부
   */
  removeCollisionDetector(index) {
    if (index < 0 || index >= this.collisionDetectors.length) {
      return false;
    }    
    this.collisionDetectors[index].deleteBoxHelper();
    // this.collisionDetectors` 배열에서 인덱스가 index인 요소 하나를 삭제한다.
    this.collisionDetectors.splice(index, 1);
    return true;
  }

  /**
   * 충돌 감지기 Disabling
   * 
   * @param {Number} index - 무력화할 감지기의 인덱스
   */
  disableCollisionDetector(index) {
    if (index < 0 || index >= this.collisionDetectors.length) {
      throw RangeError("Collision Detector 범위 밖입니다!");
    }
    this.collisionDetectors[index].setEnabled(false);
  }

  /**
   * 충돌 감지기 Enabling
   * 
   * @param {Number} index - 활성화할 감지기의 인덱스
   */
  enableCollisionDetector(index) {
    if (index < 0 || index >= this.collisionDetectors.length) {
      throw RangeError("Collision Detector 범위 밖입니다!");
    }
    this.collisionDetectors[index].setEnabled(true);
  }
  
  /**
   * 어떤 박스든 내부에 있는지 확인
   * 
   * @returns {boolean} 어떤 박스든 내부에 있으면 true (충돌 발생)
   */
  isInAnyBox() {
    return this.collisionDetectors.some(detector => detector.isInBox());
  }
  
  /**
   * 모든 박스 헬퍼 표시 설정
   * 
   * @param {boolean} isShow - 표시 여부
   */
  viewAllBoxHelpers(isShow) {
    this.isShow = isShow;
    this.collisionDetectors.forEach(detector => {
      detector.viewBoxHelper(isShow);
    });
  }
  
  /**
   * 모든 박스 헬퍼 색상 설정
   * 
   * @param {number} color - 색상 값
   */
  setAllBoxHelperColors(color) {
    this.collisionDetectors.forEach(detector => {
      detector.setBoxHelperColor(color);
    });
  }
  
  /**
   * 특정 박스 헬퍼 색상 설정
   * 
   * @param {number} index - 감지기 인덱스
   * @param {number} color - 색상 값
   */
  setBoxHelperColorByIndex(index, color) {
    if (index >= 0 && index < this.collisionDetectors.length) {
      this.collisionDetectors[index].setBoxHelperColor(color);
    }
  }

  /**
   * 모든 리소스 삭제
   */
  dispose() {
    this.collisionDetectors.forEach(detector => {
      detector.deleteBoxHelper();
    });
    
    this.collisionDetectors = [];
    
    this.camera = null;
    this.scene = null;
  }

  /**
   * @param {number} index 
   * @param {THREE.Vector3} newPosition 
   */
  updateCollisionDetectorPosition(index, newPosition) {
    if (index >= 0 && index < this.collisionDetectors.length) {
      this.collisionDetectors[index].updatePosition(newPosition);
    }
  }
}

export class FusedCollisionDetectorManager {
  /**
   * 실제로 CollisionDetectorManager를 사용할 때에는 isInAnyBox가 가장 중요해보입니다.
   * 그래서 Group of CollisionDetectorManager를 묶어서 isInAnyBox하는 상위 객체가 있으면 편할 듯 합니다.
   * @param  {...CollisionDetectorManager} collisionDetectorManagers 
   */
  constructor(...collisionDetectorManagers) {
    this.collisionDetectorManagers = collisionDetectorManagers;
  }

  /**
   * 어떤 박스든 내부에 있는지 확인
   * 
   * @returns {boolean} 어떤 박스든 내부에 있으면 true (충돌 발생)
   */
  isInAnyBox() {
    return this.collisionDetectorManagers.some(
      manager => manager.isInAnyBox()
    );
  }
}
