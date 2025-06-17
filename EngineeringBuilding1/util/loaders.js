import * as THREE from "three"
import { FBXLoader } from "three/addons/loaders/FBXLoader.js"
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// 교수님의 shader.js에서 필요한 function만 추린 후 추가로 필요한 function을 덧붙인 파일입니다.

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
/**
 * filePath로부터 shader 파일을 읽어옴
 * 
 * @param {string} filePath 
 * @returns shader file text
 */
export async function loadShaderFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        return `${content}`;
    } catch (error) {
        console.error('Error reading file:', error);
        throw error;
    }
}

/**
 * filePath로부터 fbx 파일을 읽어와서 해당 객체를 반환함
 * 
 * @param {string} filePath
 * @returns {THREE.Promise} elevator object의 promise
 */
export function loadFBX(filePath) {
    return new Promise((resolve, reject) => {
        fbxLoader.load(
            filePath, (fbx) => resolve(fbx), undefined, (error) => reject(error)
        );
    });
}


/**
 * filePath로부터 gltf/glb 파일을 읽어와서 해당 객체를 반환함
 * 
 * @param {string} filePath
 * @returns {THREE.Promise} elevator object의 promise
 */
export function loadGLTF(filePath) {
    return new Promise((resolve, reject) => {
        gltfLoader.load(
            filePath, (gltf) => resolve(gltf), undefined, (error) => reject(error)
            );
        });
    }
    