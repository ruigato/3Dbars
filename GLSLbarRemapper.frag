// ––––– Uniforms de controlo –––––
uniform float u_time;
uniform int   u_current_bar;
uniform float u_brightness;
uniform float u_pulse_speed;  // Speed of pulse animation
uniform int   u_total_bars;
uniform int   u_enable_remapping;  // Toggle remapping functionality

// ––––– Color constants –––––
const vec3 DARK_GREEN = vec3(0.0, 0.2, 0.0);
const vec3 WHITE = vec3(1.0, 1.0, 1.0);

// Get the remapped bar ID from the mapping texture
int getRemappedBarID(int original_id) {
    if (u_enable_remapping == 0) {
        return original_id; // No remapping
    }
    
    // Calculate texture coordinate to look up the mapping
    vec2 mapUV = vec2(
        0.5, // x position in the middle of the pixel
        (float(original_id) + 0.5) / float(u_total_bars) // y position based on bar ID
    );
    
    // Read the remapped ID from the mapping texture (R channel)
    vec4 mapData = texture(sTD2DInputs[2], mapUV); // Input 2 is the mapping texture
    return int(mapData.r);
}

// Check if the bar is inverted
bool isBarInverted(int original_id) {
    if (u_enable_remapping == 0) {
        return false; // No inversion
    }
    
    // Calculate texture coordinate to look up the mapping
    vec2 mapUV = vec2(
        1.5, // x position to read the inversion flag (column 2)
        (float(original_id) + 0.5) / float(u_total_bars)
    );
    
    // Read the inversion flag from the mapping texture (G channel)
    vec4 mapData = texture(sTD2DInputs[2], mapUV);
    return mapData.g > 0.5; // If > 0.5, bar is inverted
}

// Get pulsing effect for highlighting
float getPulseEffect() {
    return 0.6 + 0.4 * sin(u_time * u_pulse_speed);
}

out vec4 fragColor;

void main() {
    // 1) Read position map data (input 0)
    vec4 posData = texture(sTD2DInputs[0], vUV.st);
    int originalBarID = int(posData.b);  // Original bar ID
    float pct = posData.a;               // Position along bar [0→1]
    
    // 2) Apply remapping
    int remappedBarID = getRemappedBarID(originalBarID);
    bool isInverted = isBarInverted(originalBarID);
    
    // Adjust position if bar is inverted
    if (isInverted) {
        pct = 1.0 - pct;
    }
    
    // 3) Determine base bar color (dark green)
    vec3 barColor = DARK_GREEN;
    
    // Add slight variation along the bar for visual interest
    barColor *= (0.8 + 0.2 * sin(pct * 6.28318));
    
    // 4) Highlight the current bar - always use pulsing white effect
    bool isCurrentBar = (remappedBarID == u_current_bar);
    if (isCurrentBar) {
        float pulseAmount = getPulseEffect();
        barColor = mix(barColor, WHITE, pulseAmount * 0.7);
    }
    
    // Apply brightness
    barColor *= u_brightness;
    
    // Output final color
    fragColor = vec4(barColor, 1.0);
}