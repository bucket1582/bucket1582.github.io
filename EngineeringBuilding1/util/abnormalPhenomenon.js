import * as THREE from 'three';
import { START_LEVEL } from '../src/globals.js';

export class AbnormalPhenomenon {
    constructor(scene, camera, hallwayObject, npc) {
        this.scene = scene;
        this.camera = camera;
        this.hallwayObject = hallwayObject;
        this.hallwayVisibilityManager = hallwayObject.visibilityManager;
        this.npcDetectorManager = npc.collisionDetectorManager;
        this.npcModel = npc.model;
        this.eventManagers = null;
        this.boxHelper = [];
    }

    abnormal_11() {
        this.npcDetectorManager.disableCollisionDetector(0);
        return;
    }

    abnormal_12() {
        this.npcModel.visible = false;
        this.npcDetectorManager.disableCollisionDetector(0);
        return;
    }


    update() {
        this.eventManagers?.handleEvents();
    }

    restoreToInitialState() {
        if (this.hallwayObject.humanModel) {
            if (this.hallwayObject.humanModel.skeletonAction) {
                this.hallwayObject.humanModel.skeletonAction.stop();
                this.hallwayObject.humanModel.skeletonAction.reset();
            }
            if (this.hallwayObject.humanModel.mixer) {
                this.hallwayObject.humanModel.mixer.stopAllAction();
            }
            
            this.npcModel.visible = true;
            this.npcDetectorManager.enableCollisionDetector(0);

            const position = new THREE.Vector3(0, 0, 0);
            if (this.npcModel && this.npcModel.position) {
                position.copy(this.npcModel.position);
            }
            this.npcDetectorManager.updateCollisionDetectorPosition(0, position);
        }
        
        if (this.eventManagers) {
            this.eventManagers.dispose();
        }

        this.boxHelper.forEach(helper => {
            if (helper) {
                if (helper.parent) {
                    helper.parent.remove(helper);
                }
                if (helper.geometry) {
                    helper.geometry.dispose();
                }
                if (helper.material) {
                    helper.material.dispose();
                }
            }
        });

        this.eventManagers = null;
        this.boxHelper = [];
    }

    setAbnormalPhenomenon(index) {
        // console.log(index);
        this.restoreToInitialState();
        
        this.hallwayVisibilityManager.switchByIndex(index);
        
        const abnormalMethod = `abnormal_${index}`;
        if (typeof this[abnormalMethod] === 'function') {
            this[abnormalMethod]();
        }

        this.eventManagers?.enable();
    }

    /**
     * setAbnomarlPhenomenon 자동화
     * @param {Number} abnormalP - 비정상적인 레벨이 로딩될 확률 
     * @param {Number} abnormalN - 레벨 개수
     */
    setAbnormalPhenomenonAutomatic(currLevel, abnormalP, abnormalN) {
        if (currLevel == START_LEVEL) {
            // 5층에서는 이상 현상이 일어나지 않아야 판단이 가능하다.
            this.setAbnormalPhenomenon(-1);
            return;
        }

        const prob = Math.random();
        if (abnormalP > prob) {
            const n = abnormalN;
            const randomNumber = Math.floor(Math.random() * n); 
            this.setAbnormalPhenomenon(randomNumber);
            return;
        }

        this.setAbnormalPhenomenon(-1);
    }
}