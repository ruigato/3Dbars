// LED Lion Animation Shader - Updated for Bar Remapping

uniform float u_time;         // Current time
uniform float u_wave_speed;   // Wave speed parameter
uniform float u_wave_width;   // Wave width parameter 
uniform int u_pattern;        // Animation pattern selection
uniform int u_texture_mix;    // Texture mixing mode: 0=animations only, 1=blend, 2=texture only
uniform float u_blend_amount; // When in blend mode (1), how much to mix (0-1)
uniform int u_texture_mode;   // Texture mapping mode
uniform int u_use_direct_color; // 0=map to green/white, 1=use direct texture colors
uniform float u_zone_speed;   // Speed of zone transitions in group sequence
uniform float u_glitter_density; // Density of glitter particles (0.01-0.2)
uniform float u_glitter_speed;   // Speed of glitter animation
uniform float u_blink_speed;   // Speed of random bar blinking
uniform float u_blink_density; // Percentage of bars that are on at any time (0.0-1.0)
uniform int u_total_bars;     // Total number of bars (default: 69)
uniform int u_highlight_bar_id;  // Bar ID to highlight (0-68)
// Green color value (will be replaced with exact RGB later)
const vec3 GREEN_COLOR = vec3(0.0, 1.0, 0.0);
const vec3 WHITE_COLOR = vec3(1.0, 1.0, 1.0);

// Wave pattern
vec3 animateWave(vec2 uv, vec4 pos) {
    float distance = pos.y;  // Normalized distance in G channel
    float angle = pos.x;     // Normalized angle in R channel
    
    // Calculate wave position
    float t = u_time * 0.05 * u_wave_speed;
    float wave_position = mod(t, 1.0 + u_wave_width);
    float distance_from_wave = abs(distance - wave_position);
    
    // Calculate intensity
    float intensity = 0.05;  // Base intensity
    
    if (distance_from_wave < u_wave_width) {
        // Inside wave
        float wave_intensity = 1.0 - (distance_from_wave / u_wave_width);
        // Smooth with sine curve
        wave_intensity = sin(wave_intensity * 3.14159 / 2.0);
        intensity += (1.0 - 0.05) * wave_intensity;
    }
    
    // Green to white gradient based on intensity
    return mix(GREEN_COLOR, WHITE_COLOR, intensity);
}

// Breathing pattern
vec3 animateBreathing(vec2 uv, vec4 pos) {
    float distance = pos.y;  // Normalized distance
    
    // Calculate breathing phase with delay based on distance
    float phase = (sin(u_time * 0.02) + 1.0) / 2.0;
    float delay = distance * 0.3;
    float offset_phase = (sin(u_time * 0.02 - delay) + 1.0) / 2.0;
    
    // Calculate brightness
    float brightness = offset_phase * (1.0 - distance * 0.5);
    
    // Green to white gradient based on brightness
    return mix(GREEN_COLOR, WHITE_COLOR, brightness);
}

// Group sequence pattern (approximation using distance zones)
vec3 animateGroupSequence(vec2 uv, vec4 pos) {
    // Define zones in the distance map to simulate groups
    float distance = pos.y;
    
    // Define zones - these should ideally match the actual groups
    const float ZONES = 7.0;  // Number of groups
    // Zone thresholds (approximate - should be tuned to match actual group distances)
    const float ZONE_JUBA = 0.95;        // mane (back)
    const float ZONE_BOCHECHAS = 0.75;   // cheeks
    const float ZONE_ORELHAS = 0.65;     // ears
    const float ZONE_SOBRANCELHAS = 0.5; // eyebrows
    const float ZONE_OLHOS = 0.4;        // eyes
    const float ZONE_DENTES = 0.2;       // teeth
    const float ZONE_NARIZ = 0.1;        // nose (front)
    
    // Determine current zone
    int zone;
    if (distance > ZONE_JUBA) zone = 0;            // juba
    else if (distance > ZONE_BOCHECHAS) zone = 1;  // bochechas
    else if (distance > ZONE_ORELHAS) zone = 2;    // orelhas
    else if (distance > ZONE_SOBRANCELHAS) zone = 3; // sobrancelhas
    else if (distance > ZONE_OLHOS) zone = 4;      // olhos
    else if (distance > ZONE_DENTES) zone = 5;     // dentes
    else zone = 6;                               // nariz
    
    // Which zone is active - use zone_speed to control the transition rate
    int active_zone = int(mod(floor(u_time * 0.3 * u_zone_speed), ZONES));
    
    // Calculate phase within active zone
    float phase = mod(u_time * 0.3 * u_zone_speed, 1.0);
    
    if (zone == active_zone) {
        // Active zone - pulse with white
        float intensity = sin(phase * 3.14159) * 0.8 + 0.2;
        return mix(GREEN_COLOR, WHITE_COLOR, intensity);
    } else {
        // Inactive zone - dim green
        return GREEN_COLOR * 0.3;
    }
}

// Roaring pattern
vec3 animateRoaring(vec2 uv, vec4 pos) {
    float distance = pos.y;
    
    // Animation that builds from front to back
    float cycle_time = mod(u_time * 0.01, 4.0);
    float intensity;
    
    if (cycle_time < 3.2) {
        intensity = cycle_time / 3.2;
    } else {
        intensity = 1.0 - ((cycle_time - 3.2) / 0.8);
    }
    
    // Activation from front (nose) to back
    float front_activation = 1.0 - distance; // Invert distance for front-to-back
    float activation_threshold = intensity;
    float base_intensity;
    
    if (front_activation > activation_threshold) {
        // Front areas (closer to nose) activate first
        base_intensity = intensity;
    } else {
        // Other areas activate based on how far the wave has traveled
        if (front_activation / activation_threshold > (1.0 - intensity)) {
            float activation_progress = front_activation / activation_threshold;
            base_intensity = intensity * activation_progress;
        } else {
            base_intensity = 0.0;
        }
    }
    
    // Green to white color scheme
    return mix(GREEN_COLOR, WHITE_COLOR, base_intensity);
}

// Pseudo-random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Simplex-like noise function
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    // Four corners of a cell
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    // Smooth interpolation
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    // Mix the four corners
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Glittering/shimmering effect - like twinkling stars
vec3 animateGlitter(vec2 uv, vec4 pos) {
    float distance = pos.y;
    float angle = pos.x;
    
    // Base color (dim green)
    vec3 baseColor = GREEN_COLOR * 0.2;
    
    // Create a grid of potential glitter points
    float scale = 50.0;  // Adjust for more/fewer glitter points
    vec2 scaledPos = vec2(angle * scale, distance * scale * 2.0);
    
    // Add time dimension for animation
    float t = u_time * u_glitter_speed;
    
    // Create a 3D noise effect for twinkling
    float n1 = noise(scaledPos + vec2(t, t * 0.5));
    float n2 = noise(scaledPos * 1.5 + vec2(-t * 0.7, t * 0.3));
    float n3 = noise(scaledPos * 0.5 + vec2(t * 0.2, -t * 0.6));
    
    // Combine noise layers for varied effect
    float combined = (n1 * 0.5 + n2 * 0.3 + n3 * 0.2);
    
    // Make the glitter effect sparse by thresholding
    float threshold = 1.0 - u_glitter_density;  // Lower values = more glitter
    float glitter = (combined > threshold) ? pow((combined - threshold) / (1.0 - threshold), 3.0) : 0.0;  // Reduced exponent for broader highlights
    
    // Add some distance-based variation
    float distanceEffect = 1.0 - distance * 0.5;  // More glitter near the nose
    glitter *= distanceEffect;
    
    // Add some subtle pulsing throughout the model
    float globalPulse = (sin(u_time * 0.2) * 0.5 + 0.5) * 0.3;
    
    // Boost brightness for glitter (multiply by 1.5 for brighter whites)
    vec3 glitterColor = WHITE_COLOR * glitter * 1.5;
    
    // Add subtle green pulsing to the base
    vec3 pulsingBase = mix(baseColor, GREEN_COLOR * 0.6, globalPulse);
    
    // Combine base and glitter
    return pulsingBase + glitterColor;
}

// Bar-based animation - creates effects along each LED bar
vec3 animateBarPattern(vec2 uv, vec4 pos) {
    // Extract bar data from position map
    // UPDATED: Use actual integer bar ID from blue channel
    int bar_id = int(pos.z);  // Integer bar ID from B channel
    float bar_pos = pos.w;    // Position along bar (0-1) in A channel
    
    // Create a wave traveling along each bar
    float t = u_time * 0.2 * u_wave_speed;
    float wave_pos = mod(t, 2.0);  // Position of wave, cycles 0-2
    
    // Distance from current position to wave front
    float dist = abs(bar_pos - mod(wave_pos, 1.0));
    
    // If wave_pos > 1, the wave is traveling back
    if (wave_pos > 1.0) {
        dist = abs(bar_pos - (2.0 - wave_pos));
    }
    
    // Create pulse effect
    float intensity = 0.1;  // Base intensity
    float pulse_width = 0.3;
    
    if (dist < pulse_width) {
        // Inside pulse
        float pulse = 1.0 - (dist / pulse_width);
        // Smooth with sine curve
        pulse = sin(pulse * 3.14159 / 2.0);
        intensity += (1.0 - 0.1) * pulse;
    }
    
    // Green to white gradient based on intensity
    return mix(GREEN_COLOR, WHITE_COLOR, intensity);
}

// Random Bar Blinking - Each bar randomly turns on and off
vec3 animateRandomBars(vec2 uv, vec4 pos) {
    // Extract bar data from position map
    // UPDATED: Use actual integer bar ID from blue channel
    int bar_id = int(pos.z);              // Integer bar ID from B channel
    float position_along_bar = pos.w;     // Position along bar in A channel
    
    // Create time-based hash for each bar
    // Normalize the bar_id for use in the random function
    float normalized_bar_id = float(bar_id) / float(u_total_bars);
    float timeStep = floor(u_time * u_blink_speed);  // Controls blinking speed
    float hashValue = random(vec2(normalized_bar_id, timeStep));  // Unique hash for each bar at each time step
    
    // Determine if this bar should be on or off based on hash
    bool barOn = hashValue < u_blink_density;  // Higher density = more bars on
    
    // Optional: Flashing effect for each bar
    float flashEffect = 0.0;
    if (barOn) {
        // For on bars, create pulsing effect
        float flashPhase = fract(u_time * u_blink_speed * 0.5);
        flashEffect = 0.7 + 0.3 * sin(flashPhase * 6.28);  // Subtle pulsing between 0.7-1.0
    }
    
    // Create subtle variation along the bar
    float posVariation = 0.0;
    if (barOn) {
        // Make the ends slightly dimmer
        posVariation = 0.2 * (1.0 - pow(abs(position_along_bar - 0.5) * 2.0, 2.0));
    }
    
    // Combine effects for final intensity
    float intensity = barOn ? 0.2 + flashEffect + posVariation : 0.05;
    
    // Green to white gradient based on intensity
    return mix(GREEN_COLOR, WHITE_COLOR, intensity);
}

// Single bar highlight pattern - highlights specified bar with pulsating white
vec3 animateSingleBar(vec2 uv, vec4 pos) {
    int bar_id = int(pos.z);  // Integer bar ID from B channel
    
    // Base color for non-highlighted bars (dim green)
    vec3 baseColor = GREEN_COLOR * 0.2;
    
    // Check if this is the highlighted bar
    if (bar_id == u_highlight_bar_id) {
        // Calculate pulsating effect using wave_speed
        float pulse = 0.5 + 0.5 * sin(u_time * 0.1 * u_wave_speed);
        
        // Increase intensity for smoother transition to white
        float intensity = pulse * pulse;
        
        // This is the highlighted bar - make it pulse white
        return mix(GREEN_COLOR, WHITE_COLOR, intensity);
    } else {
        // Other bars - dim green
        return baseColor;
    }
}

// Sample texture using different mapping methods
vec3 sampleTexture(vec4 pos) {
    // Extract position data
    float angle = pos.x;                   // Normalized angle in R channel
    float distance = pos.y;                // Normalized distance in G channel
    int bar_id = int(pos.z);               // Integer bar ID from B channel
    float normalized_bar_id = float(bar_id) / float(u_total_bars); // Normalize for texture coords
    float bar_pos = pos.w;                 // Position along bar in A channel
    
    vec2 texCoord;
    
    // Different texture mapping modes
    if (u_texture_mode == 0) {
        // Mode 0: Radial mapping - angle and distance directly map to polar coordinates
        float u = angle;                     // Use angle directly as U
        float v = distance;                  // Use distance directly as V
        texCoord = vec2(u, v);
    }
    else if (u_texture_mode == 1) {
        // Mode 1: Linear mapping based on distance only (like bands)
        texCoord = vec2(distance, 0.5);
    }
    else if (u_texture_mode == 2) {
        // Mode 2: Spiral mapping
        float u = mod(angle + distance * 3.0, 1.0);
        float v = distance;
        texCoord = vec2(u, v);
    }
    else if (u_texture_mode == 3) {
        // Mode 3: Animated radial - rotate the texture over time
        float u = mod(angle + u_time * 0.1, 1.0);
        float v = distance;
        texCoord = vec2(u, v);
    }
    else if (u_texture_mode == 4) {
        // Mode 4: Bar-based mapping - map along each LED bar
        // UPDATED: Normalize bar_id for texture coordinates
        float u = bar_pos;                   // Position along bar
        float v = normalized_bar_id;         // Normalized bar ID for texture coord
        texCoord = vec2(u, v);
    }
    else if (u_texture_mode == 5) {
        // Mode 5: Animated bar mapping - move along bars over time
        // UPDATED: Normalize bar_id for texture coordinates
        float u = mod(bar_pos + u_time * 0.1, 1.0); // Animated position
        float v = normalized_bar_id;               // Normalized bar ID for texture coord
        texCoord = vec2(u, v);
    }
    else {
        // Default - direct mapping
        texCoord = pos.xy;
    }
    
    // Sample the texture at the calculated coordinates
    vec4 texColor = texture(sTD2DInputs[1], texCoord);
    
    // Either use direct texture colors or map to green-white scheme
    if (u_use_direct_color == 1) {
        // Use the actual texture colors directly
        return texColor.rgb;
    } else {
        // Apply green-white color scheme
        float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
        return mix(GREEN_COLOR, WHITE_COLOR, brightness);
    }
}

out vec4 fragColor;

void main() {
    // Sample the position map at this pixel
    vec4 posData = texture(sTD2DInputs[0], vUV.st);
    // posData now contains:
    // R (x) = normalized angle
    // G (y) = normalized distance
    // B (z) = integer bar ID (not normalized)
    // A (w) = position along bar (0-1)
    
    // Calculate procedural animation color
    vec3 procColor;
    if (u_pattern == 0) {
        procColor = animateWave(vUV.st, posData);
    } else if (u_pattern == 1) {
        procColor = animateBreathing(vUV.st, posData);
    } else if (u_pattern == 2) {
        procColor = animateGroupSequence(vUV.st, posData);
    } else if (u_pattern == 3) {
        procColor = animateRoaring(vUV.st, posData);
    } else if (u_pattern == 4) {
        procColor = animateGlitter(vUV.st, posData);
    } else if (u_pattern == 5) {
        procColor = animateBarPattern(vUV.st, posData);
    } else if (u_pattern == 6) {
        procColor = animateRandomBars(vUV.st, posData);
} else if (u_pattern == 7) {
    procColor = animateSingleBar(vUV.st, posData);

    } else {
        procColor = animateWave(vUV.st, posData);
    }
    
    // Sample texture if needed
    vec3 texColor = vec3(0.0);
    if (u_texture_mix > 0) {
        texColor = sampleTexture(posData);
    }
    
    // Choose final color based on mixing mode
    vec3 finalColor;
    
    if (u_texture_mix == 0) {
        // Mode 0: Animation only
        finalColor = procColor;
    }
    else if (u_texture_mix == 1) {
        // Mode 1: Blend animation and texture
        finalColor = mix(procColor, texColor, u_blend_amount);
    }
    else if (u_texture_mix == 2) {
        // Mode 2: Texture only
        finalColor = texColor;
    }
    else {
        // Default fallback
        finalColor = procColor;
    }
    
    // Output final color
    fragColor = vec4(finalColor, 1.0);
}