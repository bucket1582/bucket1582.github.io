precision mediump float;

// Uniform
uniform sampler2D uBeforeTexture;
uniform float uTime;
uniform float uDeathTime;
uniform float uDeathSpeed;
uniform float uScanlineStrength;
uniform float uBrightness;
uniform vec3 uTint;

// Varying
in vec2 vTextureCoords;

out vec4 fragColor;

void main() {
  vec4 color = texture(uBeforeTexture, vTextureCoords);

  // 밝기 조정
  if (uDeathTime > 0.0f) {
    color.rgb *= uBrightness;
    color.rgb /= 1.0f + uDeathSpeed * (uTime - uDeathTime);
  } else {
    color.rgb *= uBrightness;
  }

  // 초록색 쪽으로 편향되도록
  color.rgb *= uTint;

  // 스캔 라인
  float remainder = 1.0 - (mod(uTime / 20.0, 100.0) * 0.01);
  float difference = abs(vTextureCoords.y - remainder);
  float gap = 0.01;
  if (difference < gap) {
    float ratio = (gap - difference) / gap;
    color.rgb += vec3(0, ratio * uScanlineStrength, 0);
  }

  // 클램핑
  vec3 clampedColor = clamp(color.rgb, 0.0, 1.0);
  
  // 최종 출력
  fragColor = vec4(clampedColor, 1.0);
}
