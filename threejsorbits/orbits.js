import * as THREE from 'three';  
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const scene = new THREE.Scene();

// Camera를 perspective와 orthographic 두 가지로 switching 해야 해서 const가 아닌 let으로 선언
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = 120;
camera.position.y = 60;
camera.position.z = 180;
camera.lookAt(scene.position);
scene.add(camera);

const renderer = new THREE.WebGLRenderer();
renderer.setClearColor(new THREE.Color(0x000000));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const stats = new Stats();
document.body.appendChild(stats.dom);

// Camera가 바뀔 때 orbitControls도 바뀌어야 해서 let으로 선언
let orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;

const textureLoader = new THREE.TextureLoader();

const sunGeometry = new THREE.SphereGeometry(10);
const sunMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
directionalLight.position.set(-20, 40, 60);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x292929);
scene.add(ambientLight);

// GUI
const gui = new GUI();

function cameraControlSettings() {
    const cameraControlParams = {
        "Current Camera": "Perspective",
        "Switch Camera Type": function () {
            if (camera instanceof THREE.PerspectiveCamera) {
                // Perspective -> Orthographic
                scene.remove(camera);
                camera = null; 
                camera = new THREE.OrthographicCamera(window.innerWidth / -16, 
                    window.innerWidth / 16, window.innerHeight / 16, window.innerHeight / -16, -200, 500);
                camera.position.x = 120;
                camera.position.y = 60;
                camera.position.z = 180;
                camera.lookAt(scene.position);

                // Update orbit controls
                orbitControls.dispose();
                orbitControls = null;
                orbitControls = new OrbitControls(camera, renderer.domElement);
                orbitControls.enableDamping = true;

                // Set params
                this['Current Camera'] = "Orthographic";
            } else {
                // Orthographic -> Perspective
                scene.remove(camera);
                camera = null; 
                camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.x = 120;
                camera.position.y = 60;
                camera.position.z = 180;
                camera.lookAt(scene.position);

                // Update orbit controls
                orbitControls.dispose();
                orbitControls = null;
                orbitControls = new OrbitControls(camera, renderer.domElement);
                orbitControls.enableDamping = true;

                // Set params
                this['Current Camera'] = "Perspective";
            }
        }
    };

    const guiCam = gui.addFolder('Camera');
    guiCam.add(cameraControlParams, 'Switch Camera Type');
    guiCam.add(cameraControlParams, 'Current Camera').listen();
}

const planetMeshObjects = {};
function addPlanet(planet) {
    const planetFolder = gui.addFolder(planet.planetName);
    const planetParams = {
        "Rotation Speed": planet.rotationSpeed,
        "Orbit Speed": planet.orbitSpeed
    };

    planetFolder.add(planetParams, "Rotation Speed", 0.001, 0.1);
    planetFolder.add(planetParams, "Orbit Speed", 0.001, 0.1);

    const material = new THREE.MeshStandardMaterial(
        {
            map: planet.texture,
            roughness: 0.8,
            metalness: 0.2
        }
    );
    const planetGeometry = new THREE.SphereGeometry(planet.radius);
    const planetMesh = new THREE.Mesh(planetGeometry, material);

    const orbitAnchor = new THREE.Object3D();
    orbitAnchor.position.set(0, 0, 0);

    planetMesh.position.set(planet.distance, 0, 0);
    orbitAnchor.add(planetMesh);

    const meshInfo = {
        control: planetParams,
        mesh: planetMesh,
        anchor: orbitAnchor,
        rotationSpeed: planet.rotationSpeed,
        orbitSpeed: planet.orbitSpeed
    };

    planetMeshObjects[planet.planetName] = meshInfo;
    scene.add(orbitAnchor);
}

const planets = [
    {
        planetName: "Mercury",
        radius: 1.5,
        distance: 20,
        color: "#a6a6a6",
        rotationSpeed: 0.02,
        orbitSpeed: 0.02,
        texture: textureLoader.load("./textures/Mercury.jpg")
    },
    {
        planetName: "Venus",
        radius: 3,
        distance: 35,
        color: "#e39e1c",
        rotationSpeed: 0.015,
        orbitSpeed: 0.015,
        texture: textureLoader.load("./textures/Venus.jpg")
    },
    {
        planetName: "Earth",
        radius: 3.5,
        distance: 50,
        color: "#3498db",
        rotationSpeed: 0.01,
        orbitSpeed: 0.01,
        texture: textureLoader.load("./textures/Earth.jpg")
    },
    {
        planetName: "Mars",
        radius: 2.5,
        distance: 65,
        color: "#c0392b",
        rotationSpeed: 0.008,
        orbitSpeed: 0.008,
        texture: textureLoader.load("./textures/Mars.jpg")
    }
]


const clock = new THREE.Clock();

cameraControlSettings();

planets.forEach(planet => {
    addPlanet(planet);
});

render();

function render() {
    orbitControls.update();
    stats.update();

    for (let planetMeshObjectName in planetMeshObjects) {
        const planetMeshObject = planetMeshObjects[planetMeshObjectName];
        const newRotationSpeed = planetMeshObject.control["Rotation Speed"];
        const newOrbitSpeed = planetMeshObject.control["Orbit Speed"];
        planetMeshObject.rotationSpeed = newRotationSpeed;
        planetMeshObject.orbitSpeed = newOrbitSpeed;

        const planetMesh = planetMeshObject.mesh;
        planetMesh.rotation.y += planetMeshObject.rotationSpeed;
        
        const planetAnchor = planetMeshObject.anchor;
        planetAnchor.rotation.y += planetMeshObject.orbitSpeed;
    }

    // render using requestAnimationFrame
    requestAnimationFrame(render);
    renderer.render(scene, camera);
}