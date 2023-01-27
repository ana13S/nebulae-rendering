const fragmentShader = `
precision highp float;
precision highp sampler3D;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

in vec3 r_origin;
in vec3 r_dir;

out vec4 color;

uniform vec3 base;
uniform sampler3D map; 

uniform float opacity;
uniform float steps;

const vec3 bounding_box_min = vec3( - 1 );
const vec3 bounding_box_max = vec3( 1 );

// One-liner from stackoverflow
float randF(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

// Treat sphere as box for now because it's easier
vec2 compute_near_far( vec3 orig, vec3 dir ) {
    vec3 inv_ray = 1.0 / dir;
    vec3 b1_tmp = ( bounding_box_min - orig ) * inv_ray;
    vec3 b2_tmp = ( bounding_box_max - orig ) * inv_ray;
    vec3 bmin = min( b1_tmp, b2_tmp );
    vec3 bmax = max( b1_tmp, b2_tmp );

    float near = max( bmin.x, max( bmin.y, bmin.z ) );
    float far = min( bmax.x, min( bmax.y, bmax.z ) );
    return vec2( near, far );
}

float compute_gradient( vec3 coord ) {
    float step = 0.02;
    return texture( map, coord + vec3( - step ) ).r - texture( map, coord + vec3( step ) ).r;
}

void main(){
    vec3 ray_dir = normalize( r_dir );
    vec2 ret = compute_near_far( r_origin, ray_dir );
    float near = ret.x;
    float far = ret.y;

    if ( near > far ) discard;

    vec3 p = r_origin + near * ray_dir;

    // Calculate step size
    vec3 inc = 1.0 / abs( ray_dir );
    float delta = min( inc.x, min(inc.y, inc.z) ) / steps;

    vec3 inv_size = 1.0 / vec3( textureSize( map, 0 ) );
    float randNum = randF( gl_FragCoord.xy ) * 2.0 - 1.0;

    // Reduce jaggies a little
    p += ray_dir * randNum * inv_size;
    vec4 c = vec4( base, 0.0 );

    for ( float i = near; i < far; i += delta ) {
        // Get sample
        float s = texture( map, p + 0.5 ).r;
        s = smoothstep(0.15, 0.65, s) * opacity;

        float grad = compute_gradient( p + 0.5 ) * 2.0 + ( (p.x + p.y) * 0.25 ) + 0.2;

        // Calculate rgba
        c.rgb += ( 1.0 - c.a ) * s * grad;
        c.a += ( 1.0 - c.a ) * s;

        if (c.a > 0.95) break;

        p += ray_dir * delta;

    }

    color = c;

}`

export default fragmentShader;