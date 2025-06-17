import * as THREE from 'three';  

import { initCamera, initRenderer } from '../util/util.js';
import { Tubelight, TubelightSystem, AmbientLight } from '../util/lighting.js';
import { loadGLTF, loadShaderFile } from "../util/loaders.js";
import { FirstPersonController } from '../util/firstPersonController.js';
import { NightVisionRenderer } from "../shader/nightVision/nightVision.js";
import { CollisionDetectorManager, FusedCollisionDetectorManager } from '../util/collisionDetecterManager.js';
import { gltfElevatorAnimationController } from '../model/elevator/gltfElevatorAnimationController.js';
import { ElevatorFloorDisplay } from '../util/elevatorFloorDisplay.js'; 
import { CollisionEventManager, CollisionEventSystem, EventHandlingType } from '../util/collisionEventManager.js';
import { nextLevelTransition, startLevel, transitionToNightVision } from './events.js';
import { VisibilityManager } from '../util/visibilityManager.js';
import { N_ABNOMRAL, PROB_ABNORMAL, STANDARD_LIGHT_INTENSITIES, START_LEVEL } from './globals.js';
import { AbnormalPhenomenon } from '../util/abnormalPhenomenon.js';

export async function setupProcess() {
    // Basic settings
    const basics = generalSetup();
    const camera = basics.camera;
    const scene = basics.scene;
    const renderer = basics.renderer;
    const clock = basics.clock;

    // Lightings
    const lightings = setupLightings(scene);

    // Elevator
    const elevatorObject = await loadElevator1(
        camera, scene, lightings.elevator1
    );
    const elevatorAnimationController = elevatorObject.animationController;
    const elevatorObject2 = await loadElevator2(
        camera, scene, lightings.elevator2
    );
    const elevatorAnimationController2 = elevatorObject2.animationController;

    // Hallway
    const hallwayObject = await loadHallway(camera, scene);

    // Advanced materials (FPC, collider, night vision renderer)
    const fpc = cameraSettings(camera, scene, renderer);
    const nightVision = await setupShaders(camera, scene, renderer, lightings.ambient);


    // -1~n-1 사이의 랜덤 숫자 생성
    // -1 DEFAULT
    // 복도 초기 상태 설정
    const abnormalPhenomenon = new AbnormalPhenomenon(scene, camera, hallwayObject,  hallwayObject.humanModel.npc);
    abnormalPhenomenon.setAbnormalPhenomenonAutomatic(START_LEVEL, PROB_ABNORMAL, N_ABNOMRAL);
    

    // Environment collision detector & Event collision detectors
    const envCollisionDetectorManager = new FusedCollisionDetectorManager(
        elevatorObject.collisionDetectorManager, elevatorObject2.collisionDetectorManager, 
        hallwayObject.collisionDetectorManager
    );
    
    hallwayObject.eventManager.addCallback(
        () => { 
            transitionToNightVision(
                lightings.hallway, 
                nightVision,
                fpc,
                () => {
                    nextLevelTransition(
                        lightings.hallway, nightVision, elevatorAnimationController, elevatorAnimationController2,
                        fpc, abnormalPhenomenon, true
                    );
                }
            ); 
        }, 
        EventHandlingType.ON_ENTER
    );
    
    elevatorObject.eventManager.enter.addCallback(
        () => { 
            nextLevelTransition(
                lightings.hallway, nightVision, elevatorAnimationController, elevatorAnimationController2, fpc, abnormalPhenomenon, true
            ); 
        }, EventHandlingType.ON_ENTER
    );
    elevatorObject.eventManager.exit.addCallback(
        () => { startLevel(); }, EventHandlingType.ON_EXIT
    );
    elevatorObject.eventManager.exit.addCallback(
        () => {
            if (hallwayObject.humanModel.skeletonAction) {
                hallwayObject.humanModel.skeletonAction.play();
            }
        },
        EventHandlingType.ON_EXIT
    );
    elevatorObject2.eventManager.enter.addCallback(
        () => { 
            nextLevelTransition(
                lightings.hallway, nightVision, elevatorAnimationController, elevatorAnimationController2, fpc, abnormalPhenomenon, false
            ); 
        }, EventHandlingType.ON_ENTER
    );
    const envEventManager = new CollisionEventSystem(
        elevatorObject.eventManager.enter, elevatorObject.eventManager.exit, 
        elevatorObject2.eventManager.enter, hallwayObject.eventManager
    );

    return {
        fundamentals: {
            camera: {
                firstPersonController: fpc,
                base: camera
            },
            scene: scene,
            renderer: {
                nightVision: nightVision,
                base: renderer
            },
            clock: clock,
            ambient: lightings.ambient,
            canvas: renderer.domElement
        },
        elevator1: {    
            controller: elevatorAnimationController,
            model: elevatorObject.model,
            lighting: lightings.elevator1,
            floorDisplay: elevatorObject.floorDisplay,
            collisionDetectorManager: elevatorObject.collisionDetectorManager,
            eventManager: elevatorObject.eventManager
        },
        elevator2: {
            controller: elevatorAnimationController2,
            model: elevatorObject2.model,
            lighting: lightings.elevator2,
            floorDisplay: elevatorObject2.floorDisplay,
            collisionDetectorManager: elevatorObject2.collisionDetectorManager,
            eventManager: elevatorObject2.eventManager
        },
        hallway: {
            model: hallwayObject.model,
            lighting: lightings.hallway,
            collisionDetectorManager: hallwayObject.collisionDetectorManager,
            eventManager: hallwayObject.eventManager,
            visibilityManager: hallwayObject.visibilityManager
        },
        npc: {
            model: null, // TODO
            collisionDetectorManager: hallwayObject.humanModel.npc.collisionDetectorManager
        },
        environment: {
            collisionDetectorManager: envCollisionDetectorManager,
            eventManager: envEventManager
        },
        abnormalPhenomenon: abnormalPhenomenon,
        humanModel: {
            update: hallwayObject.humanModel.update
        }
    };
}

function generalSetup()
{
    const clock = new THREE.Clock();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );

    const renderer = initRenderer();
    const camera = initCamera();
    return {
        clock: clock,
        scene: scene,
        renderer: renderer,
        camera: camera
    };
}

function setupLightings(scene)
{
    // Ambient Light  
    const ambientLight = new AmbientLight(scene, 0xffffff, 0.5);

    // Elevator Light
    const tubeLight = new Tubelight(scene, new THREE.Vector3(-90, 520, 0), new THREE.Vector3(90, 520, 0));
    tubeLight.setDistance(500);
    tubeLight.setIntensities(...STANDARD_LIGHT_INTENSITIES.ELEVATOR);
    const tubeLight2 = new Tubelight(scene, new THREE.Vector3(-6060, 520, 0), new THREE.Vector3(-6240, 520, 0));
    tubeLight2.setDistance(500);
    tubeLight2.setIntensities(...STANDARD_LIGHT_INTENSITIES.ELEVATOR);

    // Hallway Light
    const tubelights = [
        new Tubelight(scene, new THREE.Vector3(-550, 450, 0), new THREE.Vector3(-550, 450, 150)),
        new Tubelight(scene, new THREE.Vector3(-550, 450, 550), new THREE.Vector3(550, 450, 700)) 
    ];
    for (let i = 0; i < 6; i++) {
        const xPos = -1000 - 700 * i;
        tubelights.push(new Tubelight(scene, new THREE.Vector3(xPos - 50, 450, 950), new THREE.Vector3(xPos + 50, 450, 950)));
    }
    tubelights.push(new Tubelight(scene, new THREE.Vector3(-5600, 450, 0), new THREE.Vector3(-5600, 450, 150)))
    tubelights.push(new Tubelight(scene, new THREE.Vector3(-5600, 450, 550), new THREE.Vector3(-5600, 450, 700)));

    const tubeLightSystem = new TubelightSystem(...tubelights);
    tubeLightSystem.setDistance(1700);
    tubeLightSystem.setIntensities(...STANDARD_LIGHT_INTENSITIES.HALLWAY);
    return {
        ambient: ambientLight,
        elevator1: tubeLight,
        elevator2: tubeLight2,
        hallway: tubeLightSystem
    };
}

async function loadElevator1(camera, scene, elevatorLight) {
    // gltf 엘리베이터 추가
    const elevator = await loadGLTF("../model//elevator/Elevator.gltf");
    elevator.scene.scale.set(140, 140, 140);
    elevator.scene.position.set(0, 0, 0);
    scene.add(elevator.scene);

    // 엘리베이터 층 표시
    const innerFloorDisplay = new ElevatorFloorDisplay(scene, elevator.scene);
    innerFloorDisplay.rotateY(Math.PI/2);
    innerFloorDisplay.setFontSize(20);
    innerFloorDisplay.setOffset(-150, 116, -162);
    innerFloorDisplay.setColor(0xD2691E);

    const outerFloorDisplay = new ElevatorFloorDisplay(scene, elevator.scene);
    outerFloorDisplay.rotateY(-Math.PI/2);
    outerFloorDisplay.setFontSize(20);
    outerFloorDisplay.setOffset(-249, 195, 0);
    outerFloorDisplay.setColor(0xD2691E);

    const floorDisplay = {
        inner: innerFloorDisplay,
        outer: outerFloorDisplay
    };

    // Elevator 내부 CollisionDetector
    const elevatorDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorCube1 = elevatorDetectorManager.addCollisionDetector(elevator.scene, new THREE.Vector3(0.7, 0.7, 0.7), new THREE.Vector3(40, 0, 0));
    const elevatorCube2 = elevatorDetectorManager.addCollisionDetector(elevator.scene, new THREE.Vector3(0.4, 0.7, 0.5), new THREE.Vector3(-200, 0, 0));
    elevatorDetectorManager.setBoxHelperColorByIndex(elevatorCube1, 0x00ffff);
    elevatorDetectorManager.setBoxHelperColorByIndex(elevatorCube2, 0xFFB6C1);
    elevatorDetectorManager.viewAllBoxHelpers(false);

    const elevatorAnimationController = new gltfElevatorAnimationController(
        elevator,
        elevatorDetectorManager,
        elevatorLight, 
        floorDisplay,
        new Audio('../model/elevator/sounds/openDoor.mp3'),
        new Audio('../model/elevator/sounds/closeDoor.mp3'),
        new Audio('../model/elevator/sounds/elevatorRide.mp3'),
        new Audio('../model/elevator/sounds/bell1.mp3'),
        1
    );

    // Event CollisionDetector 추가
    // 입장
    const elevatorEnterEventCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorEnter = elevatorEnterEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.05, 0.7, 0.8), new THREE.Vector3(-70, 0, 0)
    );
    elevatorEnterEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorEnter, 0xffff00);
    elevatorEnterEventCollisionDetectorManager.viewAllBoxHelpers(false);
    const elevatorEnterEventManager = new CollisionEventManager(elevatorEnterEventCollisionDetectorManager);

    // 퇴장
    const elevatorExitEventCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorExitFront = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.05, 0.7, 0.8), new THREE.Vector3(-300, 0, 0)
    );
    const elevatorExitLeft = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.17, 0.7, 0.05), new THREE.Vector3(-250, 0, 180)
    );
    const elevatorExitRight = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.17, 0.7, 0.05), new THREE.Vector3(-250, 0, -180)
    );
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitFront, 0xffff00);
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitLeft, 0xffff00);
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitRight, 0xffff00);
    elevatorExitEventCollisionDetectorManager.viewAllBoxHelpers(false);
    const elevatorExitEventManager = new CollisionEventManager(elevatorExitEventCollisionDetectorManager);

    return {
        animationController: elevatorAnimationController,
        floorDisplay: floorDisplay,
        model: elevator,
        collisionDetectorManager: elevatorDetectorManager,
        eventManager: {
            enter: elevatorEnterEventManager,
            exit: elevatorExitEventManager
        }
    };
}

async function loadElevator2(camera, scene, elevatorLight) {
    // gltf 엘리베이터 추가
    const elevator = await loadGLTF("../model//elevator/Elevator.gltf");
    elevator.scene.scale.set(140, 140, 140);
    elevator.scene.position.set(-6150, 0, 0);
    elevator.scene.rotation.set(0, Math.PI, 0);
    scene.add(elevator.scene);

    // 엘리베이터 층 표시
    const innerFloorDisplay = new ElevatorFloorDisplay(scene, elevator.scene);
    innerFloorDisplay.rotateY(-Math.PI/2);
    innerFloorDisplay.setFontSize(20);
    innerFloorDisplay.setOffset(150, 116, 162);
    innerFloorDisplay.setColor(0xD2691E);

    const outerFloorDisplay = new ElevatorFloorDisplay(scene, elevator.scene);
    outerFloorDisplay.rotateY(Math.PI/2);
    outerFloorDisplay.setFontSize(20);
    outerFloorDisplay.setOffset(249, 195, 0);
    outerFloorDisplay.setColor(0xD2691E);

    const floorDisplay = {
        inner: innerFloorDisplay,
        outer: outerFloorDisplay
    };

    // Elevator 내부 CollisionDetector
    const elevatorDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorCube1 = elevatorDetectorManager.addCollisionDetector(elevator.scene, new THREE.Vector3(0.7, 0.7, 0.7), new THREE.Vector3(-40, 0, 0));
    const elevatorCube2 = elevatorDetectorManager.addCollisionDetector(elevator.scene, new THREE.Vector3(0.5, 0.7, 0.5), new THREE.Vector3(200, 0, 0));
    elevatorDetectorManager.setBoxHelperColorByIndex(elevatorCube1, 0x00ffff);
    elevatorDetectorManager.setBoxHelperColorByIndex(elevatorCube2, 0xFFB6C1);
    elevatorDetectorManager.viewAllBoxHelpers(false);

    const elevatorAnimationController = new gltfElevatorAnimationController(
        elevator,
        elevatorDetectorManager,
        elevatorLight, 
        floorDisplay,
        new Audio('../model/elevator/sounds/openDoor.mp3'),
        new Audio('../model/elevator/sounds/closeDoor.mp3'),
        new Audio('../model/elevator/sounds/elevatorRide.mp3'),
        new Audio('../model/elevator/sounds/bell1.mp3'),
        0
    );

    // Event CollisionDetector 추가
    // 입장
    const elevatorEnterEventCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorEnter = elevatorEnterEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.05, 0.7, 0.8), new THREE.Vector3(70, 0, 0)
    );
    elevatorEnterEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorEnter, 0xffff00);
    elevatorEnterEventCollisionDetectorManager.viewAllBoxHelpers(false);
    const elevatorEnterEventManager = new CollisionEventManager(elevatorEnterEventCollisionDetectorManager);

    // 퇴장
    const elevatorExitEventCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    const elevatorExitFront = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.05, 0.7, 0.8), new THREE.Vector3(300, 0, 0)
    );
    const elevatorExitLeft = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.17, 0.7, 0.05), new THREE.Vector3(250, 0, 180)
    );
    const elevatorExitRight = elevatorExitEventCollisionDetectorManager.addCollisionDetector(
        elevator.scene,
        new THREE.Vector3(0.17, 0.7, 0.05), new THREE.Vector3(250, 0, -180)
    );
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitFront, 0xffff00);
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitLeft, 0xffff00);
    elevatorExitEventCollisionDetectorManager.setBoxHelperColorByIndex(elevatorExitRight, 0xffff00);
    elevatorExitEventCollisionDetectorManager.viewAllBoxHelpers(false);
    const elevatorExitEventManager = new CollisionEventManager(elevatorExitEventCollisionDetectorManager);

    return {
        animationController: elevatorAnimationController,
        floorDisplay: floorDisplay,
        model: elevator,
        collisionDetectorManager: elevatorDetectorManager,
        eventManager: {
            enter: elevatorEnterEventManager,
            exit: elevatorExitEventManager
        }
    };
}


async function loadHallway(camera, scene) {
    // 복도 모델 추가
    const hallway = await loadGLTF("../model/hallway/Hallway.gltf");
    hallway.scene.scale.set(70, 70, 70);
    hallway.scene.position.set(-4750, 0, 980);
    hallway.scene.rotation.y = Math.PI/2;
    scene.add(hallway.scene);

    // 복도 가시성 관리자 초기화
    const hallwayVisibilityManager = new VisibilityManager(
        scene, 
        hallway.scene,
        '../model/hallway/config/hallwayVisibility.json'
    );
    await hallwayVisibilityManager.initialize();

    // Environment CollisionDetector 추가
    const hallwayCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    // 엘리베이터 앞쪽 복도
    const hallway1 = hallwayCollisionDetectorManager.addCollisionDetector(hallway.scene, new THREE.Vector3(0.07, 1, 0.85), new THREE.Vector3(2250, 0, 0));
   // 중앙 복도 
    const hallway2 = hallwayCollisionDetectorManager.addCollisionDetector(hallway.scene, new THREE.Vector3(0.85, 1, 0.25), new THREE.Vector3(-400, 0, 550));
    // 반대쪽 복도 
    const hallway3 = hallwayCollisionDetectorManager.addCollisionDetector(hallway.scene, new THREE.Vector3(0.07, 1, 0.85), new THREE.Vector3(-2800, 0, 10));
    hallwayCollisionDetectorManager.setBoxHelperColorByIndex(hallway1, 0x00ff00);
    hallwayCollisionDetectorManager.setBoxHelperColorByIndex(hallway2, 0xF97316); // 주황색
    hallwayCollisionDetectorManager.setBoxHelperColorByIndex(hallway3, 0xffffff); // 주황색
    hallwayCollisionDetectorManager.viewAllBoxHelpers(false);

    // Event CollisionDetector 추가 (복도 중간)
    const hallwayEventCollisionDetectorManager = new CollisionDetectorManager(camera, scene);
    const hallwayEvent = hallwayEventCollisionDetectorManager.addCollisionDetector(
        hallway.scene,
        new THREE.Vector3(0.03, 0.7, 0.9), new THREE.Vector3(600, 0, 0)
    );
    hallwayEventCollisionDetectorManager.setBoxHelperColorByIndex(hallwayEvent, 0xffff00);
    hallwayEventCollisionDetectorManager.viewAllBoxHelpers(false);
    const hallwayEventManager = new CollisionEventManager(hallwayEventCollisionDetectorManager);

    let humanModelMixer = null;
    let skeletonAction = null;
    let humanAnimationGroup = null;
  
    hallway.scene.traverse((object) => {
        if (object.name === "HumanAnimation") {
            humanAnimationGroup = object;
        }
    });
    humanAnimationGroup.scale.set(3, 3, 3); 

    // Plane
    const planeGeometry = new THREE.PlaneGeometry(15000, 10000);
    const planeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -0.5 * Math.PI;
    scene.add(plane);

    // Human Skeleton Animation
    const humanDetectorManager = new CollisionDetectorManager(camera, scene);
    const human1 = humanDetectorManager.addCollisionDetector(
        humanAnimationGroup, 
        new THREE.Vector3(1, 20, 0.3), 
        new THREE.Vector3(0, 0, 0)  
    );
    humanDetectorManager.setBoxHelperColorByIndex(human1, 0xff0000);
    humanDetectorManager.viewAllBoxHelpers(false);
    
    if (humanAnimationGroup) {
        humanModelMixer = new THREE.AnimationMixer(humanAnimationGroup);
        const clips = hallway.animations;
        
        if (clips && clips.length > 0) {
            skeletonAction = humanModelMixer.clipAction(clips[0]);
            skeletonAction.reset();
            skeletonAction.time = 0;
        }
    }

    function updateHumanModelAnimation(delta) {
        if (humanModelMixer && skeletonAction && skeletonAction.isRunning()) {
            humanModelMixer.update(delta);
            const currentPos = humanAnimationGroup.position.clone();

            humanAnimationGroup.scale.set(3, 3, 3); 

            const endPosition = 59;
            if (currentPos.z > endPosition) {
                skeletonAction.stop();
                humanAnimationGroup.visible = false;
                humanDetectorManager.disableCollisionDetector(human1);
                return;
            }

            humanAnimationGroup.position.set(currentPos.x, currentPos.y, currentPos.z + delta);
            humanDetectorManager.updateCollisionDetectorPosition(human1, humanAnimationGroup.position);
        }
    }

    return {
        model: hallway,
        collisionDetectorManager: hallwayCollisionDetectorManager,
        eventManager: hallwayEventManager,
        visibilityManager: hallwayVisibilityManager,
        humanModel: {
            mixer: humanModelMixer,
            skeletonAction: skeletonAction,
            update: updateHumanModelAnimation,
            npc: {
                model: humanAnimationGroup,
                collisionDetectorManager: humanDetectorManager
            },
        }
    };
}

function cameraSettings(camera, scene, renderer) {
    // FP Camera 추가
    camera.position.set(90, 300, 0);
    camera.lookAt(-90, 300, 0);
    const firstPersonCamera = new FirstPersonController(camera, renderer, 400);
    scene.add(firstPersonCamera.getObject());

    return firstPersonCamera;
}

async function setupShaders(camera, scene, renderer, ambient) {
    // Night Vision 추가
    const nightVisionRenderer = new NightVisionRenderer(
        renderer.domElement.width, renderer.domElement.height, renderer, scene, camera, ambient,
        await loadShaderFile("../shader/nightVision/nightVisionVertexShader.glsl"),
        await loadShaderFile("../shader/nightVision/nightVisionFragmentShader.glsl")
    );
    
    return nightVisionRenderer;
}