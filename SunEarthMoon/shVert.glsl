#version 300 es
in vec3 aPosition;
in vec4 aColor;
uniform mat4 uModel;

out vec4 fragColor;

void main() {
    gl_Position = uModel * vec4(aPosition, 1.0);
    fragColor = aColor;
}
