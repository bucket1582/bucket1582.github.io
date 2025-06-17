import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import * as Schedule from './timings.js';
import { CollisionDetectorManager, FusedCollisionDetectorManager } from './collisionDetecterManager.js';
import { CollisionEventSystem } from './collisionEventManager.js';

/**
 * FirstPersonController
 * 일인칭 컨트롤러, PointerLock과 WASD 이동 지원
 */
export class FirstPersonController {
    /**
     * Constructor
     * 
     * @param {THREE.Camera} camera : 카메라
     * @param {THREE.WebGLRenderer} renderer  렌더러
     * @param {number} speed : 이동속도 default: 100
     */
    constructor(camera, renderer, speed = 100) {
        this.camera = camera;
        this.renderer = renderer;
        this.controls = new PointerLockControls(camera, renderer.domElement);
        this.speed = speed;

        // 키 상태
        this.keys = { w: false, s: false, a: false, d: false };
        // 방향 벡터
        this.direction = new THREE.Vector3();
        
        // 후퇴 애니메이션 관련 속성
        this.isKnockedBack = false;           // 후퇴 상태인지
        this.knockbackTimer = 0;              // 후퇴 타이머
        this.knockbackDuration = 0.3;        // 후퇴 지속 시간 (초)
        this.knockbackVelocity = new THREE.Vector3(); // 후퇴 속도
        this.knockbackDirection = new THREE.Vector3(); // 후퇴 방향

        // Lock
        this.canMove = true;
        
        this.enabled = true;

        this.useLock = true;

        this.walkingSound = new Audio("../assets/stepsound.wav");
        this.walkingSound.loop = true;

        // 이벤트 바인딩
        this._initEventListeners();
    }

    /**
     * 이벤트 초기화
     */
    _initEventListeners() {
        // 마우스 클릭 시 잠금
        this.renderer.domElement.addEventListener('click', () => {
            if (this.useLock) {
                this.controls.lock();
            }
        });

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = true;
                if (this.walkingSound && this.canMove) {
                    this.walkingSound.play();
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (key in this.keys) {
                this.keys[key] = false;
                if (this.walkingSound) {
                    this.walkingSound.pause();
                }
            }
        });
    }

    /**
     * 카메라 위치 업데이트 (후퇴 애니메이션 포함)
     * @hint const clock = new THREE.Clock();
     * @hint const delta = clock.getDelta();
     * @param {number} delta : 이전 프레임과 현재 프레임 사이의 시간 차이 (초)
     * @param {FusedCollisionDetectorManager} envCollisionDetectorManager : 플레이어가 돌아다닐 수 있는 collision detector들
     * @param {CollisionEventSystem} eventSystem : 충돌 이벤트 시스템
     * @param {CollisionDetectorManager} personCollisionDetectorManager : 플레이어가 절대 들어갈 수 없는 collision detector
     */
    update(delta, envCollisionDetectorManager = null, eventSystem = null, personCollisionDetectorManager = null) {
        if (!this.enabled) {
            return;
        }
        
        // 못 움직이는 상태에서는 고정! 모든 위치 업데이트 건너뛰기, 카메라 회전만 허용
        if (!this.canMove) {
            return;
        }
        
        // 후퇴 타이머 업데이트
        if (this.isKnockedBack) {
            this.knockbackTimer -= delta;
            if (this.knockbackTimer <= 0) {
                this.isKnockedBack = false;
                this.knockbackVelocity.set(0, 0, 0);
            }
        }
        
        // 후퇴 중이 아닐 때만 플레이어 입력 처리
        if (!this.isKnockedBack) {
            this.direction.set(
                Number(this.keys.d) - Number(this.keys.a),
                0,
                Number(this.keys.w) - Number(this.keys.s)
            );
            
            // 입력이 있을 때만 이동
            if (this.direction.length() > 0) {
                // 벡터의 길이를 1로 만들어 모든 방향에서 동일한 속도를 보장한다
                this.direction.normalize();
                this.controls.moveRight(this.direction.x * this.speed * delta);
                this.controls.moveForward(this.direction.z * this.speed * delta);
            
                if(envCollisionDetectorManager && !envCollisionDetectorManager.isInAnyBox()) {
                    this.controls.moveRight(-this.direction.x * this.speed * delta);
                    this.controls.moveForward(-this.direction.z * this.speed * delta);
                }

                // 진입 / 진출 이벤트 시스템
                eventSystem.handleEvents();
            }
        }
        
        // 인물 충돌 검사 및 후퇴 시작
        if(personCollisionDetectorManager && personCollisionDetectorManager.isInAnyBox()) {
            if (!this.isKnockedBack) {
                // 정지 상태에서 충돌 발생시 카메라 뒤방향으로 후퇴
                if (this.direction.length() === 0) {
                    this.direction.set(0, 0, 1); 
                }
                this._initKnockback();
            }
        }
        
        // 후퇴 애니메이션 적용
        if (this.isKnockedBack) {
            this._applyKnockbackAnimation(delta);
        }
    }
    
    /**
     * 후퇴 애니메이션 시작
     */
    _initKnockback() {
        this.isKnockedBack = true;
        this.knockbackTimer = this.knockbackDuration;
        
        // 후퇴 방향 설정 (현재 이동 방향의 반대)
        this.knockbackDirection.copy(this.direction).negate();
        
        // 초기 후퇴 속도 설정
        const initialKnockbackSpeed = this.speed * 2; // 전진 속도의 2배로 시작
        this.knockbackVelocity.copy(this.knockbackDirection).multiplyScalar(initialKnockbackSpeed);
    }
    
    /**
     * 후퇴 애니메이션 적용
     * @param {number} delta - 시간 델타
     */
    _applyKnockbackAnimation(delta) {
        // 시간에 따른 감속 계산 (이차 함수적 감속)
        const timeProgress = 1 - (this.knockbackTimer / this.knockbackDuration);
        const decelerationFactor = 1 - (timeProgress * timeProgress); // 제곱으로 부드러운 감속
        
        // 현재 후퇴 속도 계산
        const currentKnockbackSpeed = this.knockbackVelocity.length() * decelerationFactor;
        const currentVelocity = this.knockbackDirection.clone().multiplyScalar(currentKnockbackSpeed);
        
        // 후퇴 이동 적용
        this.controls.moveRight(currentVelocity.x * delta);
        this.controls.moveForward(currentVelocity.z * delta);
        
        // 속도 업데이트 (다음 프레임을 위해)
        this.knockbackVelocity.lerp(new THREE.Vector3(0, 0, 0), 0.05);
    }
    
    /**
     * 후퇴 지속 시간 설정
     * @param {number} duration - 지속 시간 (초)
     */
    setKnockbackDuration(duration = 0.3) {
        this.knockbackDuration = duration;
    }

    /**
     * PointerLockControls 객체 반환
     * @returns {THREE.Object3D} PointerLockControls 객체
     */
    getObject() {
        return this.controls.getObject();
    }

    /**
     * 카메라의 미세한 흔들림
     * 
     * @param {Number} xMax - x축으로 최대 얼마나 흔들리는지
     * @param {Number} yMax - y축으로 최대 얼마나 흔들리는지
     * @param {Number} zMax - z축으로 최대 얼마나 흔들리는지
     * @param {Number} ms - 흔들리는 시간 (단위: ms)
     * @param {Number} updateNum - 업데이트 횟수
     */
    async jitter(xMax, yMax, zMax, xSpeed, ySpeed, zSpeed, ms, updateNum) {
        const originalPosition = this.camera.position.clone();

        const timeDelta = ms / updateNum;

        let currentTime = 0;
        for (let i = 0; i < updateNum; i++) {
            this.camera.position.set(
                originalPosition.x + Math.sin(xSpeed * currentTime) * xMax,
                originalPosition.y + Math.sin(ySpeed * currentTime) * yMax,
                originalPosition.z + Math.sin(zSpeed * currentTime) * zMax
            );

            await Schedule.sleep(timeDelta);
            currentTime += timeDelta;
        }

        this.camera.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
    }

    /**
     * 엘레베이터 내에서 시작 지점으로 돌아가기 위한 메소드
     * @param {THREE.Vector3} currentPosition 
     * @param {THREE.Vector3} endPosition 
     * @param {Number} ms 
     * @param {Number} updateNum 
     */
    async smoothlyMoveToTheEndPosition(currentPosition, endPosition, ms, updateNum) {
        const originalCanMove = this.canMove;
        this.canMove = false;
        const startPosition = currentPosition;
        const timeDelta = ms / updateNum;
        for (let i = 0; i < updateNum; i++) {
            const t = i / updateNum;
            this.camera.position.set(
                startPosition.x * (1 - t) + endPosition.x * t,
                startPosition.y * (1 - t) + endPosition.y * t,
                startPosition.z * (1 - t) + endPosition.z * t
            );
            this.camera.lookAt(-90, 300, 0);
            await Schedule.sleep(timeDelta);
        }
        this.camera.position.set(endPosition.x, endPosition.y, endPosition.z);
        this.camera.lookAt(-90, 300, 0);
        this.canMove = originalCanMove;
    }

    disable() {
        this.enabled = false;
    }

    enable() {
        this.enabled = true;
    }
}