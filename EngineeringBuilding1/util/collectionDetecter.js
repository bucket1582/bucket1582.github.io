import * as THREE from 'three';

export class CollisionDetector {
  /**
   * 충돌 감지 클래스
   * CollisionDetector는 단일 모델과 카메라 간의 충돌 감지를 관리하는 클래스
   * 
   * @param {THREE.Camera} camera : 카메라 객체
   * @param {THREE.Object3D} model : 충돌 감지가 필요한 모델
   * @param {THREE.Vector3} boxScale : 충돌 모델의 스케일 비율
   * @param {THREE.Vector3} boxOffset : 초기 오프셋 위치
   * @param {boolean} isShow : 디버그 보조 모델 표시 여부
   * @param {THREE.Scene} scene : BoxHelper를 添加到的场景 (可选)
   *  
   */
  constructor(camera, scene, model, boxScale = new THREE.Vector3(1, 1, 1), boxOffset = new THREE.Vector3(0, 0, 0), isShow = true) {
    this.enabled = true;
    this.camera = camera;
    this.model = model;
    this.boxScale = boxScale;
    this.boxOffset = boxOffset;
    this.isShow = isShow;
    this.scene = scene;
    this.box = null;
    this.boxHelper = null;
    this.initBox(this.boxScale, this.boxOffset);
    this.createBoxHelper();
    this.viewBoxHelper(this.isShow);
  }

  /**
   * 박스 초기화
   * 
   * @param {THREE.Vector3} scale - 스케일 비율
   * @param {THREE.Vector3} offset - 오프셋 위치
   */
  initBox(scale, offset) {
    this.model.updateMatrixWorld(true);
    this.box = new THREE.Box3().setFromObject(this.model);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    this.box.getSize(size);
    this.box.getCenter(center);

    size.multiply(scale);
    center.add(offset);

    const halfSize = size.clone().multiplyScalar(0.5);
    this.box.min.copy(center).sub(halfSize);
    this.box.max.copy(center).add(halfSize);
  }

  /**
   * 박스 내부에 있는지 확인 (단, enable 되어 있지 않으면 무조건 false)
   * 
   * @returns {boolean} 박스 내부에 있으면 true
   */
  isInBox() {
    if (!this.enabled) return false;
    const cameraPosition = this.camera.position;
    return this.box.containsPoint(cameraPosition);
  }

  /**
   * 박스 헬퍼 생성
   */
  createBoxHelper() {
    this.boxHelper = new THREE.Box3Helper(this.box, 0xff0000);
    this.scene.add(this.boxHelper);
  }

  /**
   * 박스 헬퍼 표시 설정
   * 
   * @param {boolean} isShow - 표시 여부
   */
  viewBoxHelper(isShow) {
    if (this.boxHelper) {
      this.boxHelper.visible = isShow;
      this.isShow = isShow;
    }
  }

  /**
   * 박스 헬퍼 색상 설정
   * 
   * @param {number} color - 색상 값
   */
  setBoxHelperColor(color) {
    if (this.boxHelper && this.boxHelper.material) {
      this.boxHelper.material.color.set(color);
    }
  }

  /**
   * 박스 헬퍼 삭제
   */
  deleteBoxHelper() {
    if (this.boxHelper && this.scene) {
      this.scene.remove(this.boxHelper);
      
      if (this.boxHelper.geometry) {
        this.boxHelper.geometry.dispose();
      }
      if (this.boxHelper.material) {
        this.boxHelper.material.dispose();
      }
      
      this.boxHelper = null;
    }
    
    if (this.box) {
      this.box = null;
    }
  }

  /**
   * 활성화 / 비활성화
   * 
   * @param {boolean} newEnabled - 활성화 할지 여부
   */
  setEnabled(newEnabled) {
    this.enabled = newEnabled;
  }

  /**
   * @param {THREE.Vector3} newPosition 
   */
  updatePosition(newPosition) {
    if (!this.enabled) return;
    
    this.model.position.copy(newPosition);
    
    this.box = new THREE.Box3().setFromObject(this.model);
    
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    this.box.getSize(size);
    this.box.getCenter(center);
    
    size.multiply(this.boxScale);
    center.add(this.boxOffset);
    
    const halfSize = size.clone().multiplyScalar(0.5);
    this.box.min.copy(center).sub(halfSize);
    this.box.max.copy(center).add(halfSize);
    
    if (this.boxHelper) {
      this.boxHelper.box.copy(this.box);
      this.boxHelper.updateMatrix();
      this.boxHelper.updateMatrixWorld(true);
    }
  }
}