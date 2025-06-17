/**
 * 가시성 관리자
 * 씬에서 다른 상태에 따른 객체의 가시성을 제어합니다
 */
export class VisibilityManager {
    /**
     * 생성자
     * @param {THREE.Scene} scene : 씬
     * @param {THREE.Object3D} model : 모델
     * @param {string} path : 설정 파일 경로
     */
    constructor(scene, model, path) {
        this.scene = scene;
        this.model = model;
        this.configPath = path;
        this.visibilityConfig = null;
        this.isDefault = false;
    }

    /**
     * 초기화
     * 설정 파일을 로드합니다
     */
    async initialize() {
        await this.loadConfig(this.configPath);
    }

    /**
     * 가시성 설정 파일 로드
     * JSON 파일에서 가시성 설정을 로드합니다
     * @param {string} path - 설정 파일 경로
     */
    async loadConfig(path) {
        try {
            const response = await fetch(path);
            this.visibilityConfig = await response.json();
        } catch (error) {
            console.error('가시성 설정 로드 실패:', error);
        }
    }

    /**
     * 가시성 상태 적용
     * @param {string} state - 적용할 상태 이름
     */
    applyVisibility(state) {
        if (!this.visibilityConfig) {
            console.error(`설정 파일이 로드되지 않았습니다.`);
            return;
        }

        this.isDefault = state === "default";

        // 설정 파일로드 되어 있는데 state가 없거나 add 와 delete가 둘 다 없으면 default로 적용
        if (!this.visibilityConfig[state] || (!this.visibilityConfig[state].add && !this.visibilityConfig[state].delete) || (!this.visibilityConfig[state].add && !this.visibilityConfig[state].delete)) {
            state = 'default';
        }

        // 최종 가시성 집합 생성
        // default + delete
        const visibleObjects = this.visibilityConfig.default.visible;
        let visibleSet = new Set(visibleObjects);
        for (const key in this.visibilityConfig) {
            if (this.visibilityConfig[key].delete) {
                this.visibilityConfig[key].delete.forEach(name => visibleSet.add(name));
            }
        }

        if (state !== 'default') {
            const mode = this.visibilityConfig[state];
            // 먼저 추가
            if (Array.isArray(mode.add)) {
                for (const name of mode.add) {
                    visibleSet.add(name);
                }
            }
            // 그 다음 제거
            if (Array.isArray(mode.delete)) {
                for (const name of mode.delete) {
                    visibleSet.delete(name);
                }
            }
        }

        // 모델을 순회하며 가시성 설정
        this.model.traverse((object) => {
            if (object.isMesh) {
                object.visible = visibleSet.has(object.name);
            }
        });
    }

    /**
     * index 상태로 전환
     * @param {number} index - 전환할 index 번호
     */
    switchByIndex(index) {
        if (index == -1) {
            this.applyVisibility('default');
            return;
        }
        this.applyVisibility(`index${index}`);
    }

    /**
     * 기본 상태로 전환
     * 기본 가시성 설정을 적용합니다
     */
    switchToDefault() {
        this.applyVisibility('default');
    }
    
    /**
     * Default 상태인지 확인
     * @returns {boolean} default면 True
     */
    checkIfDefault() {
        return this.isDefault;
    }

    getVisibilityConfig() {
        return this.visibilityConfig;
    }


    getVisibilityConfig() {
        return this.visibilityConfig;
    }
} 