/**
 * 
 * @param {Number} frameCount : 기다릴 프레임 수
 */
export async function waitFrames(frameCount) {
    for (let i = 0; i < frameCount; i++) {
        await waitFrame();
    }
}

/**
 * 
 * @param {Number} ms : 기다릴 시간 (단위 - ms)
 * @returns {Promise} 그만큼 기다리는 Promise 객체
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Boolean function (condition) 이 만족될 때까지 기다림
 * @param {Function} condition - check할 condition
 * @param {Number} interval - condition을 check할 주기 
 */
export function waitForCondition(condition, interval = 100) {
    return new Promise(
        resolve => {
            const timer = setInterval(() => {
                if (condition()) {
                    clearInterval(timer);
                    resolve();
                }
            }, interval)
        }
    );
}

function waitFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
}