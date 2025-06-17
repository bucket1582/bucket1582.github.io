import { loadGLTF} from "../util/loaders.js";

async function generateVisibilityConfig() {
    try {
        // GLB 파일 로드
        const hallway = await loadGLTF('../model/Hallway/Hallway.gltf');
        
        // mesh 이름을 상태별로 분류하여 수집
        const defaultVisible = [];
        const indexStates = {};
        
        const parsePrefix = (prefix) => {
            const match = prefix.match(/^([shc])(\d+)$/);
            if (match) {
                return {
                    action: match[1],
                    index: parseInt(match[2])
                };
            }
            return null;
        };
        
        hallway.scene.traverse((object) => {
            if (object.isMesh) {
                const name = object.name;
                
                const parts = name.split('-');
                let isSpecialMesh = false;
                let hasHPrefix = false; 
                
                for (let i = 0; i < parts.length; i++) {
                    const parsed = parsePrefix(parts[i]);
                    if (parsed) {
                        isSpecialMesh = true;
                        
                        if (!indexStates[parsed.index]) {
                            indexStates[parsed.index] = {
                                add: [],
                                delete: [],
                                conditional: []
                            };
                        }
                        
                        if (parsed.action === 's') {
                            if (!indexStates[parsed.index].add.includes(name)) {
                                indexStates[parsed.index].add.push(name);
                            }
                        } else if (parsed.action === 'h') {
                            hasHPrefix = true;
                            if (!indexStates[parsed.index].delete.includes(name)) {
                                indexStates[parsed.index].delete.push(name);
                            }
                        } else if (parsed.action === 'c') {
                            if (!indexStates[parsed.index].conditional.includes(name)) {
                                indexStates[parsed.index].conditional.push(name);
                            }
                        }
                    }
                }
                
                if (!isSpecialMesh || hasHPrefix) {
                    defaultVisible.push(name);
                }
            }
        });
        const config = {
            "default": {
                "visible": defaultVisible
            }
        };
        
        Object.keys(indexStates).forEach(index => {
            config[`index${index}`] = indexStates[index];
        });
        
        // 설정을 콘솔에 출력
        console.log('=== hallwayVisibility.json에 아래 설정을 복사하세요 ===');
        console.log(JSON.stringify(config, null, 2));
        console.log('=============================================');
    
    } catch (error) {
        console.error('설정 생성 중 오류 발생:', error);
    }
}

// 스크립트 실행
generateVisibilityConfig();