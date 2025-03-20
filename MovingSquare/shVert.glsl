#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aColor;

uniform float x;
uniform float y;

out vec3 ourColor;
void main() {
    gl_Position = vec4(aPos[0] + x, aPos[1] + y, aPos[2], 1.0);
    ourColor = aColor;
}