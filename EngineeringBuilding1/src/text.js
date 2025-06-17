import { setupText } from '../util/util.js';

export function initializeTexts(canvas) {
    const gameDescriptionTexts = [];
    const controlInstructionTexts = [];

    const gameTitle = setupText(canvas, `[게임 설명]`, 1);
    const gameDescription1 = setupText(canvas, `공학관에서 일어나는 미스터리한 사건을 조사하세요.`, 2);
    const gameDescription2 = setupText(canvas, `엘리베이터와 복도에서 이상한 현상들을 발견할 수 있습니다.`, 3);
    const gameDescription3 = setupText(canvas, `야간 투시경을 사용하여 어둠 속에서 숨겨진 단서를 찾으세요.`, 4);
    const gameDescription4 = setupText(canvas, '이상 현상이 없으면 현재 타고 계신 엘레베이터를, 있다면 반대쪽 엘레베이터를 이용해주세요.', 5)
    const startInstruction = setupText(canvas, `마우스를 클릭하면 게임이 시작됩니다!`, 6);
    gameDescriptionTexts.push(gameTitle, gameDescription1, gameDescription2, gameDescription3, gameDescription4, startInstruction);

    const controlTitle = setupText(canvas, `[조작 방법]`, 1);
    const moveControl = setupText(canvas, `WASD : 이동`, 2);
    const mouseControl = setupText(canvas, `마우스 : 시점 전환`, 3);
    const nightVisionControl = setupText(canvas, `T : 야간 투시경 ON/OFF(불이 꺼져있을 때 사용 가능)`, 4);
    const helpControl = setupText(canvas, `G : 도움말 숨기기/보이기`, 5);
    const escControl = setupText(canvas, `ESC : 마우스 잠금 해제`, 6);
    controlInstructionTexts.push(controlTitle, moveControl, mouseControl, nightVisionControl, helpControl, escControl);

    for (const text of [...gameDescriptionTexts]) {
        text.style.left = '50%';
        text.style.transform = 'translateX(-50%)';
        text.style.fontSize = '24px';
    }

    gameTitle.style.top = '20%';
    gameDescription1.style.top = '30%';
    gameDescription2.style.top = '40%';
    gameDescription3.style.top = '50%';
    gameDescription4.style.top = '60%';
    startInstruction.style.top = '70%';

    return {
        gameDescriptionTexts,
        controlInstructionTexts,
        hideGameDescription: () => {
            for (const text of gameDescriptionTexts) {
                text.style.display = 'none';
            }
        },
        toggleControlDescription: () => {
            for (const text of controlInstructionTexts) {
                text.style.display = text.style.display === 'none' ? 'block' : 'none';
            }
        }
    };
} 

export function endingTexts(canvas) {
    const gameDescriptionTexts = [];

    const gameTitle = setupText(canvas, `[게임 종료]`, 1);
    const gameDescription1 = setupText(canvas, `당신은 공학관에서 탈출하였습니다.`, 2);
    const gameDescription2 = setupText(canvas, `클리어를 축하드립니다!`, 3);
    gameDescriptionTexts.push(gameTitle, gameDescription1, gameDescription2);

    for (const text of [...gameDescriptionTexts]) {
        text.style.left = '50%';
        text.style.transform = 'translateX(-50%)';
        text.style.fontSize = '24px';
    }

    gameTitle.style.top = '20%';
    gameDescription1.style.top = '30%';
    gameDescription2.style.top = '40%';

    return gameDescriptionTexts;
} 