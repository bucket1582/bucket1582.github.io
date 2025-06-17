// Attribute
in vec3 position;
in vec2 uv;

// Varying
out vec2 vTextureCoords;

void main() {
    vTextureCoords = uv;
    gl_Position = vec4(position, 1.0);
}