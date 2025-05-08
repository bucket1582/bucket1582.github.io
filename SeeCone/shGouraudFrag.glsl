#version 300 es

precision highp float;

in vec3 lightingColor;
out vec4 FragColor;

uniform vec3 u_objectColor;

void main() {
    FragColor = vec4(lightingColor, 1.0);
}