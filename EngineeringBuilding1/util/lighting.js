import * as THREE from 'three';
import * as Schedule from './timings.js';

export class Tubelight {
  /**
   * Constructor
   * Tubelight는 pointlight 3개를 활용하여 형광등을 mimic하는 클래스입니다
   * 
   * @param {THREE.Scene} scene : 라이트가 있는 씬
   * @param {THREE.Vector3} startPos : tubelight의 시작 지점
   * @param {THREE.Vector3} endPos : tubelight의 끝 지점
   */
  constructor(scene, startPos, endPos) {
    // 값 parsing
    this.scene = scene;
    this.startPos = startPos;
    this.midPos = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
    this.endPos = endPos;

    // Point light 생성
    const positions = [this.startPos, this.midPos, this.endPos];
    const lightObjects = positions.map(element => {
      const light = addPointLight(element.x, element.y, element.z, 0xff0000);
      this.scene.add(light.light);
      return light;
    });

    this.pointLights = lightObjects.map(lightObject => {
      return lightObject.light;
    });

    // Original Intensities
    this.intensities = this.pointLights.map(light => { return light.intensity; });
  }

  /**
   * 형광등 세기 조절
   * 
   * @param {Number} intensity 
   */
  setIntensity(intensity) {
    for (let i = 0; i < 3; i++) {
      this.pointLights[i].intensity = intensity;
    }
    this.intensities = [intensity, intensity, intensity];
  }

  /**
   * 형광등 세기 조절
   * 
   * @param {Array} intensityA
   * @param {Array} intensityB
   * @param {Array} intensityC
   */
  setIntensities(intensityA, intensityB, intensityC) {
    this.pointLights[0].intensity = intensityA;
    this.pointLights[1].intensity = intensityB;
    this.pointLights[2].intensity = intensityC;

    this.intensities = [intensityA, intensityB, intensityC];
  }

  /**
   * 형광등 조명 거리 조절
   * @param {Number} distance : 조명 거리 (0 = 무한대)
   */
  setDistance(distance) {
    this.pointLights.forEach(light => {
      light.distance = distance;
    });
  }

  /**
   * 형광등 조명 거리 조절
   * @param {Number} distanceA 
   * @param {Number} distanceB 
   * @param {Number} distanceC 
   */
  setDistances(distanceA, distanceB, distanceC) {
    this.pointLights[0].distance = distanceA;
    this.pointLights[1].distance = distanceB;
    this.pointLights[2].distance = distanceC;
  }

  /**
   * 형광등 켜기
   */
  turnOn() {
    for (let i = 0; i < 3; i++) {
      this.pointLights[i].intensity = this.intensities[i];
    }
  }

  /**
   * 형광등 끄기
   */
  turnOff() {
    for (let i = 0; i < 3; i++) {
      this.pointLights[i].intensity = 0;
    }
  }

  /**
   * 형광등 점진적으로 켜기
   * 
   * @param {Number} ms - 완전히 켤 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   */
  async turnOnGradually(ms, updateNum) {
    this.turnOnGradually(ms, updateNum, this.intensities);
  }

  /**
   * 형광등 점진적으로 켜기
   * 
   * @param {Number} ms - 완전히 켤 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   * @param {Array} targetIntensities - 완전히 켜졌을 때 광도 (Array of length 3)
   */
  async turnOnGradually(ms, updateNum, targetIntensities) {
    const originalIntensity = targetIntensities;
    const currentIntensities = [0, 0, 0];
    const intensityDeltas = [originalIntensity[0] / updateNum, originalIntensity[1] / updateNum, originalIntensity[2] / updateNum];
    const timeDelta = ms / updateNum;
    for (let i = 0; i < updateNum; i++) {
      // 광도 업데이트 (unrolled-loop)
      this.setIntensities(currentIntensities[0], currentIntensities[1], currentIntensities[2]);
      currentIntensities[0] += intensityDeltas[0];
      currentIntensities[1] += intensityDeltas[1];
      currentIntensities[2] += intensityDeltas[2];

      // 기다리기
      await Schedule.sleep(timeDelta);
    }

    // Original로 복구
    this.setIntensities(originalIntensity[0], originalIntensity[1], originalIntensity[2]);
  }

  /**
   * 형광등 점진적으로 끄기
   * 
   * @param {Number} ms - 완전히 끌 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   */
  async turnOffGradually(ms, updateNum) {
    const originalIntensity = this.intensities;
    const currentIntensities = [originalIntensity[0], originalIntensity[1], originalIntensity[2]];
    const intensityDeltas = [-originalIntensity[0] / updateNum, -originalIntensity[1] / updateNum, -originalIntensity[2] / updateNum];
    const timeDelta = ms / updateNum;
    for (let i = 0; i < updateNum; i++) {
      // 광도 업데이트 (unrolled-loop)
      this.setIntensities(currentIntensities[0], currentIntensities[1], currentIntensities[2]);
      currentIntensities[0] += intensityDeltas[0];
      currentIntensities[1] += intensityDeltas[1];
      currentIntensities[2] += intensityDeltas[2];

      // 기다리기
      await Schedule.sleep(timeDelta);
    }

    // 0으로 최종 확정
    this.setIntensity(0);
  }

  /**
   * 전등 깜박임
   * 
   * @param {Array} darkMs : 깜박 거릴 때 전등이 꺼져 있는 시간의 리스트 (반복 고려) (단위 - ms)
   * @param {Array} brightMs : 깜박 거릴 때 전등이 켜져 있는 시간의 리스트 (반복 고려) (단위 - ms)
   * @param {Array} midIntensities : 중간중간 light의 intensity를 어떻게 바꿀 것인지
   * 
   * @throws {Error} Light가 Scene에 속하지 않을 경우 error 발생
   * @throws {RangeError} midIntensities 배열의 길이가 다른 두 배열보다 길 경우 error 발생
   */
  async flicker(darkMs, brightMs, midIntensities) {
    if ((midIntensities.length > darkMs.length) || (midIntensities.length > brightMs.length)) {
      throw new RangeError("midIntensities의 배열 길이가 너무 깁니다!");
    }

    const originalIntensities = [this.intensities[0], this.intensities[1], this.intensities[2]];
    for (let i = 0; i < midIntensities.length; i++) {
      this.setIntensity(0);
      await Schedule.sleep(darkMs[i]);
      this.setIntensities(originalIntensities[0] * midIntensities[i], originalIntensities[1] * midIntensities[i], originalIntensities[2] * midIntensities[i]);
      await Schedule.sleep(brightMs[i]);
    }

    this.setIntensities(originalIntensities[0], originalIntensities[1], originalIntensities[2]);
  }

}

export class TubelightSystem {
  /**
   * Constructor
   * TubelightSystem은 Tubelight 여러개를 하나의 class로 조작하기 위해 존재하는 클래스입니다.
   * 
   * @param {...Tubelight} tubelights
   */
  constructor(...tubelights) {
    this.tubelights = tubelights;
  }

  /**
   * 전체 형광등 세기 조절
   * 
   * @param {Number} intensity 
   */
  setIntensity(intensity) {
    this.tubelights.forEach(tubelight => tubelight.setIntensity(intensity));
  }

  /**
   * 전체 형광등 세기 조절
   * 
   * @param {Array} intensityA
   * @param {Array} intensityB
   * @param {Array} intensityC
   */
  setIntensities(intensityA, intensityB, intensityC) {
    this.tubelights.forEach(tubelight => tubelight.setIntensities(intensityA, intensityB, intensityC));
  }

   /**
   * 전체 형광등 조명 거리 조절
   * @param {Number} distance 
   */
   setDistance(distance) {
    this.tubelights.forEach(tubelight => tubelight.setDistance(distance));
  }

  /**
   * 전체 형광등 조명 거리 조절
   * @param {Number} distanceA 
   * @param {Number} distanceB 
   * @param {Number} distanceC 
   */
  setDistances(distanceA, distanceB, distanceC) {
    this.tubelights.forEach(tubelight => tubelight.setDistances(distanceA, distanceB, distanceC));
  }

  /**
   * 형광등 조명 거리 조절 (인덱스 지정)
   * @param {Number} index 
   * @param {Number} distance 
   */
  setDistanceByIndex(index, distance) {
    this.tubelights[index].setDistance(distance);
  }

  /**
   * 전체 형광등 켜기
   */
  turnOn() {
    this.tubelights.forEach(tubelight => tubelight.turnOn());
  }

  /**
   * 전체 형광등 끄기
   */
  turnOff() {
    this.tubelights.forEach(tubelight => tubelight.turnOff());
  }

  /**
   * 형광등 점진적으로 켜기
   * 
   * @param {Number} ms - 완전히 켤 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   */
  async turnOnGradually(ms, updateNum) {
    this.tubelights.forEach(tubelight => tubelight.turnOnGradually(ms, updateNum));
    await Schedule.sleep(ms);
  }

  /**
   * 형광등 점진적으로 켜기
   * 
   * @param {Number} ms - 완전히 켤 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   * @param {Array} targetIntensities - 완전히 켜졌을 때 광도 (Array of length 3)
   */
  async turnOnGradually(ms, updateNum, targetIntensities) {
    this.tubelights.forEach(tubelight => tubelight.turnOnGradually(ms, updateNum, targetIntensities));
    await Schedule.sleep(ms);
  }

  /**
   * 형광등 점진적으로 끄기
   * 
   * @param {Number} ms - 완전히 끌 때까지 걸리는 시간
   * @param {Number} updateNum - 업데이트 횟수
   */
  async turnOffGradually(ms, updateNum) {
    this.tubelights.forEach(tubelight => tubelight.turnOffGradually(ms, updateNum));
    await Schedule.sleep(ms);
  }

  /**
   * 전등 깜박임
   * 
   * @param {Array} darkMs : 깜박 거릴 때 전등이 꺼져 있는 시간의 리스트 (반복 고려) (단위 - ms)
   * @param {Array} brightMs : 깜박 거릴 때 전등이 켜져 있는 시간의 리스트 (반복 고려) (단위 - ms)
   * @param {Array} midIntensities : 중간중간 light의 intensity를 어떻게 바꿀 것인지
   * 
   * @throws {Error} Light가 Scene에 속하지 않을 경우 error 발생
   * @throws {RangeError} midIntensities 배열의 길이가 다른 두 배열보다 길 경우 error 발생
   */
  async flicker(darkMs, brightMs, midIntensities) {
    this.tubelights.forEach(tubelight => tubelight.flicker(darkMs, brightMs, midIntensities));
    await Schedule.sleep(
      darkMs.reduce((acc, cur) => acc + cur, 0) + brightMs.reduce((acc, cur) => acc + cur, 0)
    );
  }

}

/**
 * Pointlight 생성
 * 
 * @param {*} x - 생성 위치 (x)
 * @param {*} y - 생성 위치 (y)
 * @param {*} z - 생성 위치 (z)
 * @returns obj.light - 조명
 */
export const addPointLight = (x, y, z) => {
  const color = 0xacacc1;
  const intensity = 1;
  const distance = 0;
  const decay = 0.1;

  const pointLight = new THREE.PointLight(color, intensity, distance, decay);
  pointLight.position.set(x, y, z);

  return {
    light: pointLight,
  };
};

export class AmbientLight {
  /**
   * Constructor
   * AmbientLight는 환경광을 관리하는 클래스입니다
   * 
   * @param {THREE.Scene} scene - 라이트가 있는 씬
   * @param {Number} color - 환경광 색상 (기본값: 0xffffff)
   * @param {Number} intensity - 환경광 강도 (기본값: 0.5)
   */
  constructor(scene, color = 0xffffff, intensity = 0.5) {
    this.scene = scene;
    this.originalIntensity = intensity;
    
    // 환경광 생성
    this.ambientLight = new THREE.AmbientLight(color, intensity);
    this.scene.add(this.ambientLight);
    this.turnOff();
  }

  /**
   * 환경광 강도 설정
   * @param {Number} intensity - 강도값
   */
  setIntensity(intensity) {
    this.ambientLight.intensity = intensity;
    this.originalIntensity = intensity;
  }

  /**
   * 환경광 색상 설정
   * @param {Number} color - 색상값
   */
  setColor(color) {
    this.ambientLight.color.setHex(color);
  }

  /**
   * 환경광 켜기
   */
  turnOn() {
    this.ambientLight.intensity = this.originalIntensity;
  }

  /**
   * 환경광 끄기
   */
  turnOff() {
    this.ambientLight.intensity = 0.02;
  }
}