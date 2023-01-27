const vertexShader = `
in vec3 position;

uniform vec3 cameraPos;
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

// Ray origin and direction
out vec3 r_origin;
out vec3 r_dir;

void main() {
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    r_origin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
    r_dir = position - r_origin;

    gl_Position = projectionMatrix * mvPosition;
}`

export default vertexShader;