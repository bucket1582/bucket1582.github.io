#version 300 es

precision highp float;

out vec4 FragColor;
in vec3 fragPos;  
in vec3 normal;  
in vec2 texCoord;

struct Material {
    vec3 diffuse;   // 물체 diffuse
    vec3 specular;     // 표면의 specular color
    float shininess;   // specular 반짝임 정도
};

struct Light {
    //vec3 position;
    vec3 direction;
    vec3 ambient; // ambient 적용 strength
    vec3 diffuse; // diffuse 적용 strength
    vec3 specular; // specular 적용 strength
};

uniform Material material;
uniform Light light;
uniform vec3 u_viewPos;
uniform int toonLevel;

void main() {
    // ambient
    vec3 rgb = material.diffuse;
    vec3 ambient = light.ambient * rgb;
  	
    // diffuse 
    vec3 norm = normalize(normal);
    //vec3 lightDir = normalize(light.position - fragPos);
    vec3 lightDir = normalize(light.direction);
    float dotNormLight = dot(norm, lightDir);
    float diff = max(dotNormLight, 0.0);
    
    // specular
    vec3 viewDir = normalize(u_viewPos - fragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = 0.0;
    if (dotNormLight > 0.0) {
        spec = pow(max(dot(viewDir, reflectDir), 0.0), material.shininess);
    }

    // Toon shading (quantization)
    float gap = 1.0 / float(toonLevel + 1);
    bool isSet1 = false;
    bool isSet2 = false;

    for (int i = 0; i < toonLevel; i++) {
        float ifloat = float(i);
        if (diff < (ifloat + 1.0) * gap) {
            diff = ifloat * gap;
            isSet1 = true;
            break;
        }
    }

    for (int i = 0; i < toonLevel; i++) {
        float ifloat = float(i);
        if (spec < (ifloat + 1.0) * gap) {
            spec = ifloat * gap;
            isSet2 = true;
            break;
        }
    }

    if (!isSet1) {
        diff = 1.0;
        isSet1 = true;
    }

    if (!isSet2) {
        spec = 1.0;
        isSet2 = true;
    }

    vec3 diffuse = light.diffuse * diff * rgb;
    vec3 specular = light.specular * spec * material.specular;  
        
    vec3 result = ambient + diffuse + specular;
    FragColor = vec4(result, 1.0);
} 