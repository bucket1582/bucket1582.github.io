import * as THREE from 'three';
import * as Schedule from '../../util/timings.js';
import { AmbientLight } from '../../util/lighting.js';

export class NightVisionRenderer {
    /**
     * Constructor
     * 
     * @param {THREE.WebGLRenderer} renderer : 렌더러
     * @param {THREE.Scene} scene : 씬
     * @param {THREE.Camera} camera : 카메라
     * @param {AmbientLight} ambient : 야간 투시경을 켰을 때 ambient lighting 추가
     * @param {string} vertexShaderString : Night vision vertex shader file (string)
     * @param {string} fragmentShaderString : Night vision fragment shader file (string)
     * 
     * @precondition vertexShaderString과 fragmentShaderString을 호출하기 전에 file이 이미 fetch 되어 있어야 함!
     */
    constructor(width, height, renderer, scene, camera, ambient, vertexShaderString, fragmentShaderString) {
        // Processing 전 renderer
        this.renderer = renderer;
        this.realScene = scene;
        this.realCamera = camera;
        this.maxBrightness = 1.1;

        this.ambient = ambient;

        // 우회할 renderTarget 초기화
        this.postProcessRenderTarget = new THREE.WebGLRenderTarget(width, height);

        // Night Vision Shader 로딩
        const nightVisionShader = {
            uniforms: {
                uBeforeTexture: { value: null },
                uTime: { value: 0 },
                uDeathTime: { value: -1 },
                uDeathSpeed: { value: 0.0001 },
                uScanlineStrength: { value: 0.2 },
                uBrightness: { value: this.maxBrightness },
                uTint: { value: new THREE.Vector3(0.1, 1.0, 0.2) }
            },
            vertexShader: vertexShaderString,
            fragmentShader: fragmentShaderString,
            glslVersion: THREE.GLSL3
        }
        this.nightVisionMaterial = new THREE.RawShaderMaterial(nightVisionShader);

        // NDC에서 후처리를 진행
        this.postProcessCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const screenGeometry = new THREE.PlaneGeometry(2, 2);
        this.postProcessPlane = new THREE.Mesh(screenGeometry, this.nightVisionMaterial);
        this.postProcessScene = new THREE.Scene();
        this.postProcessScene.add(this.postProcessPlane);

        this.isCurrentlyNightVision = false;
        this.startedDying = false;

        // Default: turn off
        this.turnOffNightVision();
    }

    /**
     * NightVision을 켜는 메소드
     */
    turnOnNightVision() {
        this.ambient.turnOn();
        this.isCurrentlyNightVision = true;
    }

    /**
     * NightVision을 끄는 메소드
     */
    turnOffNightVision() {
        this.ambient.turnOff();
        this.isCurrentlyNightVision = false;
    }

    /**
     * Night vision이 점점 어두워짐.
     * Shader를 조작함.
     */
    graduallyDying() {
        if (this.startedDying) return; // One-time only

        this.postProcessPlane.material.uniforms.uDeathTime.value = window.performance.now();
        this.startedDying = true;
    }

    resetDeathTime() {
        this.startedDying = false;
        this.postProcessPlane.material.uniforms.uDeathTime.value = -1;
    }

    render() {
        if (this.isCurrentlyNightVision) {
            // Render 우회 (개념적인 NDC 좌표계에 존재)
            this.renderer.setRenderTarget(this.postProcessRenderTarget);
            this.renderer.render(this.realScene, this.realCamera);

            // 텍스쳐 parsing
            const beforeTexture = this.postProcessRenderTarget.texture;
            this.postProcessPlane.material.uniforms.uBeforeTexture.value = beforeTexture;
            this.postProcessPlane.material.uniforms.uTime.value = window.performance.now();

            // 실제 Rendering
            this.renderer.setRenderTarget(null);
            this.renderer.render(this.postProcessScene, this.postProcessCamera);
            return;
        }
        
        this.renderer.setRenderTarget(null);
        this.renderer.render(this.realScene, this.realCamera);   
    }
}