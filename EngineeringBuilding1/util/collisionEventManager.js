import { CollisionDetectorManager } from "./collisionDetecterManager.js";

export class CollisionEventManager {
    /**
     * 어떤 영역에 들어왔는지 감지하여, 들어왔을 때 callbackfn을 작동시키는 Manager입니다.
     * @param {CollisionDetectorManager} collisionDetectManager - 충돌 감지 manager
     */
    constructor(collisionDetectManager) {
        this.collisionDetectManager = collisionDetectManager;
        this.events = {
            onEnter: [],
            onExit: []
        }
        this.fpcIsIn = false;
        this.enabled = true;
    }

    /**
     * 콜백 함수를 등록합니다.
     * @param {Function} callbackfn - 콜백 함수
     * @param {EventHandlingType} handlingType - 콜백 함수 호출 조건
     */
    addCallback(callbackfn, handlingType) {
        switch (handlingType) {
            case EventHandlingType.ON_ENTER:
                this.events.onEnter.push(callbackfn);
                break;
            
            case EventHandlingType.ON_EXIT:
                this.events.onExit.push(callbackfn);
                break;
        
            default:
                throw new TypeError(`Unsupported type from addCallback ${handlingType}`);
        }
    }

    /**
     * 콜백 함수를 제거합니다.
     * @param {Function} callbackfn - 콜백 함수
     * @param {EventHandlingType} handlingType - 콜백 함수 호출 조건
     */
    filterCallback(callbackfn, handlingType) {
        switch (handlingType) {
            case EventHandlingType.ON_ENTER:
                this.events.onEnter = this.events.onEnter.filter(func => { return func != callbackfn; });
                break;
            
            case EventHandlingType.ON_EXIT:
                this.events.onExit = this.events.onExit.filter(func => { return func != callbackfn; });
                break;
        
            default:
                throw new TypeError(`Unsupported type from addCallback ${handlingType}`);
        }
    }

    /**
     * 이벤트를 처리합니다.
     */
    handleEvents() {
        if (!this.enabled) return;
        
        // Enter
        if (this.collisionDetectManager.isInAnyBox() && !this.fpcIsIn) {
            this.fpcIsIn = true;
            this.events.onEnter.forEach(
                callback => {
                    callback();
                }
            );
            return;
        }

        // Exit
        if (!this.collisionDetectManager.isInAnyBox() && this.fpcIsIn) {
            this.fpcIsIn = false;
            this.events.onExit.forEach(
                callback => {
                    callback();
                }
            );
            return;
        }
    }

    disable() {
        this.enabled = false;
    }

    enable() {  
        this.enabled = true;
    }   
    isEnabled() {
        return this.enabled;
    }

    /**
     * 모든 리소스 삭제
     */
    dispose() {

        this.events = {
            onEnter: [],
            onExit: []
        };
            
        if (this.collisionDetectManager) {
            this.collisionDetectManager.dispose();
            this.collisionDetectManager = null;
        }
        
        this.fpcIsIn = false;
        this.enabled = false;
    }
}

export class CollisionEventSystem {
    /**
     * 여러 eventManager를 한 번체 처리하는 클래스
     * @param  {...CollisionDetectorManager} eventManagers - 충돌 이벤트 매니저
     */
    constructor(...eventManagers) {
        this.eventManagers = eventManagers;
    }

    /**
     * 이벤트 핸들링
     */
    handleEvents() {
        this.eventManagers.forEach(
            eventManager => {
                eventManager.handleEvents();
            }
        );
    }
}

export const EventHandlingType = Object.freeze({
    ON_ENTER: 0,
    ON_EXIT: 1
});