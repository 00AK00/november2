#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tex0;
uniform vec2 uResolution;

uniform vec4 uChromaPlayer;
uniform vec4 uChromaEnemy;
uniform vec4 uChromaTerrain;
uniform vec4 uChromaBackground;
uniform vec4 uChromaUI;

varying vec2 vTexCoord;

void main() {
    vec2 uv = vTexCoord;
    vec4 maskColor = texture2D(tex0, uv);

    // Small threshold for comparing mask colors
    float eps = 0.05;
    bool isTerrain = distance(maskColor.rgb, uChromaTerrain.rgb) < eps;

    if (isTerrain) {

    //
    // ----------------------------
    // Voronoi Stone Wall Pattern
    // ----------------------------
    //

    // Increase frequency for finer cells
    vec2 p = uv * 60.0;

    // Integer cell
    vec2 i = floor(p);
    // Local coordinate inside cell
    vec2 f = fract(p);

    float minDist = 10.0;
    vec2 nearestCell = vec2(0.0);

    // Check neighbor cells (basic Voronoi)
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 cell = i + neighbor;

            // Random point inside the cell
            float h = fract(sin(dot(cell, vec2(12.9898,78.233))) * 43758.5453123);
            float g = fract(sin(dot(cell, vec2(93.9898,67.345))) * 13758.5453123);
            vec2 randPoint = vec2(h, g);

            // Distance to this cell’s random point
            vec2 diff = neighbor + randPoint - f;
            float d = dot(diff, diff);

            if (d < minDist) {
                minDist = d;
                nearestCell = randPoint;
            }
        }
    }

    // Base Voronoi cell color
    float stone = sqrt(minDist);

    // Add some edge darkening (gives stone grout look)
    float edge = smoothstep(0.02, 0.15, stone);

    // Final look: slight tint + stone shading
    vec3 stoneColor = mix(
        vec3(0.55, 0.55, 0.60),
        vec3(0.20, 0.20, 0.25),
        edge
    );

    gl_FragColor = vec4(stoneColor, 1.0);
    } else {
        // Pass through other colors unchanged
        gl_FragColor = maskColor;
    }
}