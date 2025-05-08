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
uniform float u_glitter_scale;   // Speed of glitter animation
uniform float u_bar_width;   // Width of each bar pulse animation (0.0-1.0)
uniform float u_blink_speed;   // Speed of random bar blinking
uniform float u_blink_density; // Percentage of bars that are on at any time (0.0-1.0)
uniform int u_total_bars;     // Total number of bars (default: 69)
uniform int u_highlight_bar_id;  // Bar ID to highlight (0-68)
uniform int u_num_groups;     // Number of groups (default: 7)
uniform vec3 u_base_color;    // Base color (default green)
uniform vec3 u_highlight_color; // Highlight color (default white)
uniform int u_active_group;   // Group to highlight (manual override for group sequence)

// Independent facial feature controls
uniform int u_eyes_override;      // 0=off (use base pattern), 1=on (apply eyes effect)
uniform float u_eyes_intensity;   // 0.0-1.0 brightness multiplier for eyes
uniform int u_eyes_mode;          // 0=steady, 1=blink, 2=look around, 3=alert/wide, 4=per-bar blink
uniform vec3 u_eyes_color;        // Independent color for eyes highlight

uniform int u_teeth_override;     // 0=off (use base pattern), 1=on (apply teeth effect)
uniform float u_teeth_intensity;  // 0.0-1.0 brightness multiplier for teeth
uniform int u_teeth_mode;         // 0=steady, 1=chattering, 2=snarl, 3=roar
uniform vec3 u_teeth_color;       // Independent color for teeth highlight

// NEW: Transition control uniforms
uniform int u_enable_transition;      // 0=disabled, 1=enabled
uniform float u_transition_progress;  // 0.0 (from) to 1.0 (to)
uniform int u_from_pattern;           // Pattern transitioning from
uniform int u_to_pattern;             // Pattern transitioning to
uniform float u_transition_duration;  // Duration in seconds (for timing effects)

uniform float u_DEBUG; // Debugging variable (0=off, 1=on)

// Define the group IDs for each facial feature
const int EYES_GROUP = 2;        // Group for eyes
const int EYEBROWS_GROUP = 4;    // Group for eyebrows/brows
const int NOSE_GROUP = 1;        // Group for nose
const int TEETH_GROUP = 3;       // Group for teeth/mouth
const int MANE_GROUP = 7;        // Group for mane
const int CHEEKS_GROUP = 6;      // Group for cheeks
const int EARS_GROUP = 5;        // Group for ears

// Sample group data from the bar-group mapping texture (9x9 resolution)
vec4 sampleGroupTexture(int bar_id) {
    // For a 9x9 texture with bar ID data
    // Map the bar ID (0-68) to a specific pixel in the texture
    
    // Make sure bar_id is valid
    bar_id = clamp(bar_id, 0, u_total_bars - 1);
    
    // Calculate row and column in the 9x9 texture
    float row = floor(float(bar_id) / 9.0);
    float col = mod(float(bar_id), 9.0);
    
    // Convert to normalized texture coordinates (centered in pixels)
    float u = (col + 0.5) / 9.0;
    float v = (row + 0.5) / 9.0;
    
    // Sample the texture at the calculated coordinates
    return texture(sTD2DInputs[2], vec2(u, v));
}

// Wave pattern
vec3 animateWave(vec2 uv, vec4 pos, float group_id) {
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
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// Breathing pattern
vec3 animateBreathing(vec2 uv, vec4 pos, float group_id) {
    float distance = pos.y;  // Normalized distance
    
    // Calculate breathing phase with delay based on distance
    float phase = (sin(u_time * 0.02) + 1.0) / 2.0;
    float delay = distance * 1.3;
    float offset_phase = (sin(u_time * 1.02 - delay) + 1.0) / 2.0;
    
    // Calculate brightness
    float brightness = offset_phase * (1.0 - distance * 0.5);
    
    // Base to highlight color gradient based on brightness
    return mix(u_base_color, u_highlight_color, brightness);
}

// Group sequence pattern - UPDATED for 1-based group numbering and proper texture sampling
vec3 animateGroupSequence(vec2 uv, vec4 pos, float group_id) {
    // Get the bar ID from the position map
    int bar_id = int(pos.z);
    
    // Only process valid bar IDs
    if (bar_id < 0 || bar_id >= u_total_bars) {
        // Invalid bar - show warning color (dim purple)
        return vec3(0.3, 0.0, 0.3);
    }
    
    // Sample the group data using our helper function
    vec4 groupData = sampleGroupTexture(bar_id);
    
    // Extract the group ID from G channel (1-based indexing)
    int group = int(groupData.g + 0.5); // Round to nearest integer
    
    // Calculate which group is active (adjusted for 1-based indexing)
    int active_group;
    if (u_active_group >= 1) {
        // Direct group selection (1-7)
        active_group = u_active_group;
    } else {
        // Cycle through groups 1-7 based on time
        active_group = int(mod(floor(u_time * 0.3 * u_zone_speed), float(u_num_groups))) + 1;
    }
    
    // Calculate phase within active group
    float phase = mod(u_time * 0.3 * u_zone_speed, 1.0);
    
    if (group == active_group) {
        // Active group - pulse with bright highlight
        float intensity = sin(phase * 3.14159) * 0.8 + 0.2;
        return mix(u_base_color, u_highlight_color, intensity);
    } else {
        // Inactive group - dim base color
        // Add slight variation for each group to make them distinguishable
        float group_factor = 0.2 + 0.1 * sin(float(group) * 0.7);
        return u_base_color * group_factor;
    }
}

// Roaring pattern
vec3 animateRoaring(vec2 uv, vec4 pos, float group_id) {
    float distance = pos.y;
    
    // Animation that builds from front to back
    float cycle_time = mod(u_time * 2.01, 4.0);
    float intensity;
    
    if (cycle_time < 3.2) {
        intensity = cycle_time / 3.2;
    } else {
        intensity = 5.0 - ((cycle_time - 3.2) / 0.8);
    }
    
    // Activation from front (nose) to back
    float front_activation = 1 - distance; // Invert distance for front-to-back
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
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, base_intensity);
}

// Pseudo-random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Helper function to find closest match in a list of color stops
vec3 getGradientColor(float t, vec3 colors[4], float stops[4]) {
    if (t <= stops[0]) return colors[0];
    if (t >= stops[3]) return colors[3];
    
    // Find the right segment
    int i = 0;
    for (i = 0; i < 3; i++) {
        if (t >= stops[i] && t <= stops[i+1]) break;
    }
    
    // Normalize t to segment
    float segmentT = (t - stops[i]) / (stops[i+1] - stops[i]);
    
    // Interpolate colors
    return mix(colors[i], colors[i+1], segmentT);
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
    vec2 u = f * f * (1.0 - 2.0 * f);
    
    // Mix the four corners
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Glittering/shimmering effect - like twinkling stars
vec3 animateGlitter(vec2 uv, vec4 pos, float group_id) {
    float distance = pos.y;
    float angle = pos.x;
    
    // Base color (dim base)
    vec3 baseColor = u_base_color * 0.2;
    
    // Create a grid of potential glitter points
    float scale = u_glitter_scale;  // Adjust for more/fewer glitter points
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
    
    // Boost brightness for glitter (multiply by 1.5 for brighter highlights)
    vec3 glitterColor = u_highlight_color * glitter * 1.5;
    
    // Add subtle base pulsing to the base
    vec3 pulsingBase = mix(baseColor, u_base_color * 0.6, globalPulse);
    
    // Combine base and glitter
    return pulsingBase + glitterColor;
}

// Bar-based animation - creates effects along each LED bar
vec3 animateBarPattern(vec2 uv, vec4 pos, float group_id) {
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
    if (wave_pos > 0.99) {
        dist = abs(bar_pos - (2.0 - wave_pos));
    }
    
    // Create pulse effect
    float intensity = 0.1;  // Base intensity
    float pulse_width = u_bar_width;
    
    if (dist < pulse_width) {
        // Inside pulse
        float pulse = 1.0 - (dist / pulse_width);
        // Smooth with sine curve
        pulse = sin(pulse * 3.14159 / 2.0);
        intensity += (1.0 - 0.1) * pulse;
    }
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// Random Bar Blinking - Each bar randomly turns on and off
vec3 animateRandomBars(vec2 uv, vec4 pos, float group_id) {
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
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// Single bar highlight pattern - highlights specified bar with pulsating white
vec3 animateSingleBar(vec2 uv, vec4 pos, float group_id) {
    int bar_id = int(pos.z);  // Integer bar ID from B channel
    
    // Base color for non-highlighted bars (dim base color)
    vec3 baseColor = u_base_color * 0.2;
    
    // Check if this is the highlighted bar
    if (bar_id == u_highlight_bar_id) {
        // Calculate pulsating effect using wave_speed
        float pulse = 0.5 + 0.5 * sin(u_time * 0.1 * u_wave_speed * 10);

    int bar_id = int(pos.z);  // Integer bar ID from B channel
    float bar_pos = pos.w;    // Position along bar (0-1) in A channel
    
    // Create a wave traveling along each bar
    float t = u_time * 0.2 * u_wave_speed;
    float wave_pos = mod(t, 2.0);  // Position of wave, cycles 0-2
    
    // Distance from current position to wave front
    float dist = abs(bar_pos - mod(wave_pos, 1.0));
    
    // If wave_pos > 1, the wave is traveling back
 

        // Increase intensity for smoother transition to highlight color
        float intensity = pulse * dist;
        
        // This is the highlighted bar - make it pulse
        return mix(u_base_color, u_highlight_color, intensity);
    } else {
        // Other bars - dim base color
        return baseColor;
    }
}

// NEW ANIMATION 1: Symmetrical Face Pulse - Highlights both sides of the face at once
vec3 animateSymmetricalPulse(vec2 uv, vec4 pos, float group_id) {
    float angle = pos.x;         // Normalized angle in R channel
    float distance = pos.y;      // Normalized distance in G channel
    
    // Find the symmetrical point (opposite side of the face)
    // If angle is 0.1, symmetrical point would be at 0.1 + 0.5 = 0.6
    // If angle is 0.7, symmetrical point would be at 0.7 - 0.5 = 0.2
    float symmetry_angle = mod(angle + 0.5, 1.0);
    
    // Calculate base pulse timing
    float pulse_rate = 1.05 * u_wave_speed;
    float t = u_time * pulse_rate;
    
    // Create multiple pulse zones based on angle
    // This divides the model into angular zones (number of zones can be adjusted)
    const float NUM_ZONES = 7.0;
    float zone_size = 1.0 / NUM_ZONES;
    float zone_index = floor(angle * NUM_ZONES);
    
    // Calculate angular distance within each zone
    float zone_center = (zone_index + 0.5) * zone_size;
    float angle_dist_in_zone = abs(angle - zone_center) / zone_size * 2.0;
    
    // Phase offset based on distance from nose - further points pulse later
    float phase_delay = distance * 0.5;
    
    // Calculate pulse wave
    float pulse_phase = sin(t - phase_delay);
    // Convert to 0-1 range
    pulse_phase = (pulse_phase + 1.0) * 0.5;
    
    // Modulate pulse based on symmetry and zone
    // Points closer to zone center are brighter
    float symmetry_factor = 1.0 - angle_dist_in_zone * 0.7;
    
    // Combine effects for final intensity
    float intensity = pulse_phase * symmetry_factor;
    // Add distance falloff (less intense further from nose)
    intensity *= (1.0 - distance * 0.3);
    
    // Add a subtle background glow
    intensity = max(intensity, 0.15);
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// NEW ANIMATION 2: Vertical Cascade - Light "pours" from top to bottom
vec3 animateVerticalCascade(vec2 uv, vec4 pos, float group_id) {
    float angle = pos.x;         // Normalized angle in R channel
    float distance = pos.y;      // Normalized distance in G channel
    int bar_id = int(pos.z);     // Integer bar ID from B channel
    float bar_pos = pos.w;       // Position along bar (0-1) in A channel
    
    // Since we don't have direct Y position, we'll approximate vertical position
    // using a combination of distance and angle
    
    // Approximate vertical position (0 = top, 1 = bottom)
    // This is a heuristic based on the lion's shape - may need tuning
    // Formula: combine distance from nose with angle-based adjustment
    float vertical_pos;
    
    // Front of face (nose area) - use primarily angle-based
    if (distance < 0.3) {
        // Bottom of face (closer to 0.5 angle which is bottom)
        vertical_pos = abs(angle - 0.5) < 0.2 ? 0.8 + distance : 0.5 + distance;
    }
    // Middle of face (eyes, brows) - blend
    else if (distance < 0.6) {
        vertical_pos = 0.4 + (1.0 - abs(angle - 0.5)) * 0.4;
    }
    // Back of head/mane - higher up
    else {
        vertical_pos = 0.3 * distance;
    }
    
    // Make the cascade travel from top (0) to bottom (1)
    float cascade_speed = 0.15 * u_wave_speed;
    float cascade_position = mod(u_time * cascade_speed, 1.5);  // Cycle from 0 to 1.5
    
    // Distance from current position to cascade front
    float dist_from_cascade = vertical_pos - cascade_position;
    
    // Calculate intensity based on distance to cascade
    float cascade_width = 0.1;  // Width of the cascade effect
    float intensity = 0.1;      // Base intensity
    
    if (dist_from_cascade > 0.0 && dist_from_cascade < cascade_width) {
        // We're in the active cascade region
        float cascade_intensity = 1.0 - (dist_from_cascade / cascade_width);
        // Smooth with sine curve
        cascade_intensity = sin(cascade_intensity * 3.14159 / 2.0);
        intensity += (1.0 - 0.1) * cascade_intensity;
        
        // Add some variation based on angle (left/right)
        // This creates a more natural flow pattern
        float angle_variation = 0.2 * sin(angle * 12.0 + u_time * 0.1);
        intensity += angle_variation * cascade_intensity;
    }
    
    // Add some trailing glow after the main cascade passed
    if (dist_from_cascade < 0.0 && dist_from_cascade > -0.5) {
        float trail_intensity = abs(dist_from_cascade) / 0.5;  // Fade out over 0.5 units
        float glow = 0.8 * (1.0 - trail_intensity);
        intensity = max(intensity, glow);
    }
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// NEW ANIMATION 3: Symmetrical Chase - Lights chase around both sides of the face
vec3 animateSymmetricalChase(vec2 uv, vec4 pos, float group_id) {
    float angle = pos.x;            // Normalized angle in R channel (0-1)
    float distance = pos.y;         // Normalized distance in G channel (0-1)
    
    // Calculate chase position (0-1, travels around the face)
    float chase_speed = 0.15 * u_wave_speed;
    float base_chase_pos = mod(u_time * chase_speed, 1.0);
    
    // Create two chase points traveling in opposite directions
    float chase_pos1 = base_chase_pos;  // Moving normally
    float chase_pos2 = 1.0 - base_chase_pos;  // Moving in opposite direction
    
    // Calculate distances from each chase point (in angle space)
    float dist1 = min(abs(angle - chase_pos1), min(abs(angle - (chase_pos1 - 1.0)), abs(angle - (chase_pos1 + 1.0))));
    float dist2 = min(abs(angle - chase_pos2), min(abs(angle - (chase_pos2 - 1.0)), abs(angle - (chase_pos2 + 1.0))));
    
    // Find the minimum distance to any chase point
    float min_dist = min(dist1, dist2);
    
    // Width of the chase effect
    float chase_width = 0.05;
    
    // Base intensity
    float intensity = 0.15;  // Dim base glow
    
    // Add intensity when near a chase point
    if (min_dist < chase_width) {
        float chase_intensity = 1.0 - (min_dist / chase_width);
        // Smooth with sine curve
        chase_intensity = sin(chase_intensity * 3.14159 / 2.0);
        
        // Scale intensity based on distance from nose
        // Brighter near nose, dimmer further away
        float distance_scale = 1.0 - (distance * 0.5);
        
        // Apply intensity, scaled by distance
        intensity += chase_intensity * distance_scale * 0.8;
    }
    
    // Special effect when the chase points meet!
    // They meet at angles 0.0/1.0 and 0.5
    float meeting_point1 = 0.0;  // When chase_pos1 and chase_pos2 are 0 or 1
    float meeting_point2 = 0.5;  // When chase_pos1 and chase_pos2 are 0.5
    
    // Check if we're near a meeting and the chase points are also near that meeting
    float meeting_threshold = 0.1;
    bool near_meeting1 = (abs(angle) < 0.1 || abs(angle - 1.0) < 0.1) && 
                         ((chase_pos1 < meeting_threshold || chase_pos1 > 1.0 - meeting_threshold) &&
                          (chase_pos2 < meeting_threshold || chase_pos2 > 1.0 - meeting_threshold));
                          
    bool near_meeting2 = abs(angle - 0.5) < 0.1 && 
                         (abs(chase_pos1 - 0.5) < meeting_threshold && 
                          abs(chase_pos2 - 0.5) < meeting_threshold);
    
    // Create a burst effect at meeting points
    if (near_meeting1 || near_meeting2) {
        // Calculate how close the chase points are to exactly meeting
        float meeting_progress;
        if (near_meeting1) {
            meeting_progress = 1.0 - min(
                min(chase_pos1, 1.0 - chase_pos1) + min(chase_pos2, 1.0 - chase_pos2), 
                meeting_threshold * 2.0
            ) / (meeting_threshold * 2.0);
        } else {
            meeting_progress = 1.0 - (abs(chase_pos1 - 0.5) + abs(chase_pos2 - 0.5)) / (meeting_threshold * 2.0);
        }
        
        // Add a burst effect proportional to meeting progress
        float burst = meeting_progress * (1.0 - distance * 0.5);  // Stronger near nose
        intensity += burst * 0.3;  // Add to existing intensity
    }
    
    // Apply distance-based falloff to create depth
    intensity *= (1.0 - distance * 0.3) + 0.2;
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// NEW ANIMATION 4: Axis Ripple - Expanding oval ripples along axes
vec3 animateAxisRipple(vec2 uv, vec4 pos, float group_id) {
    float angle = pos.x;         // Normalized angle in R channel (0-1)
    float distance = pos.y;      // Normalized distance in G channel (0-1)
    
    // Convert angle to radians (0-2π)
    float angle_rad = angle * 2.0 * 3.14159;
    
    // Calculate ripple timing
    float ripple_speed = 0.05 * u_wave_speed;
    float ripple_time = u_time * ripple_speed;
    
    // Multiple ripple centers, starting at different times
    const int NUM_RIPPLES = 7;
    float intensity = 0.05;  // Base intensity
    
    for (int i = 0; i < NUM_RIPPLES; i++) {
        // Stagger ripple start times
        float ripple_offset = float(i) / float(NUM_RIPPLES);
        float ripple_phase = mod(ripple_time + ripple_offset, 1.0);
        
        // Ripple grows from center to edge
        float ripple_size = ripple_phase * 1.5;  // Max size slightly larger than 1.0
        
        // Calculate the axes stretching effect
        // This creates an oval shape by modifying the distance based on angle
        float stretch_x = 1.0 + 0.5 * sin(ripple_time * 0.2);  // X axis stretch factor
        float stretch_y = 1.0 + 0.5 * cos(ripple_time * 0.2);  // Y axis stretch factor
        
        // Calculate the stretched distance value
        // We're essentially creating an oval by scaling the X and Y components differently
        float stretched_distance = distance * sqrt(
            pow(cos(angle_rad) * stretch_x, 2.0) + 
            pow(sin(angle_rad) * stretch_y, 2.0)
        );
        
        // Calculate distance from current ripple front
        float dist_from_ripple = abs(stretched_distance - ripple_size);
        
        // Width of the ripple effect
        float ripple_width = 0.08;
        
        // Add intensity when near a ripple front
        if (dist_from_ripple < ripple_width && ripple_size > 0.05) {
            float ripple_intensity = 1.0 - (dist_from_ripple / ripple_width);
            // Smooth with sine curve
            ripple_intensity = sin(ripple_intensity * 3.14159 / 2.0);
            
            // Fade out as ripple expands
            float fadeout = max(0.0, 1.0 - ripple_size / 1.0);
            ripple_intensity *= fadeout;
            
            // Add this ripple's contribution to total intensity
            intensity += ripple_intensity * 0.8;
        }
    }
    
    // Clamp intensity to avoid over-brightening when ripples overlap
    intensity = min(intensity, 1.0);
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// NEW ANIMATION 5: Nose Triangle Line Expansion - Lines expand from the nose at different speeds
vec3 animateNoseLines(vec2 uv, vec4 pos, float group_id) {
    float angle = pos.x;           // Normalized angle in R channel (0-1)
    float distance = pos.y;        // Normalized distance in G channel (0-1)
    int bar_id = int(pos.z);       // Integer bar ID from B channel
    float bar_pos = pos.w;         // Position along bar (0-1) in A channel
    
    // Base intensity (dim glow)
    float intensity = 0.1;
    
    // Only animate points in bars (bar_id >= 0)
    if (bar_id >= 0) {
        // Assign a unique speed to each bar based on its ID
        // We'll use a pseudo-random function to distribute speeds
        float bar_speed_factor = 1.5 + 0.8 * random(vec2(float(bar_id) / float(u_total_bars), 100.42));
        
        // Calculate the line expansion progress
        float base_speed = 0.15 * u_wave_speed;
        float expansion_time = u_time * base_speed * bar_speed_factor;
        
        // Restart the expansion with a cycle
        float cycle_time = 4.0; // seconds per full cycle
        float expansion_phase = mod(expansion_time, cycle_time) / cycle_time;
        
        // Animate the line filling from the nose (bar_pos=0) outward
        // Calculate the active segment of each bar
        float active_segment;
        
        if (expansion_phase < 0.75) {
            // Outward expansion phase (0-0.75)
            active_segment = expansion_phase / 0.75;
        } else {
            // Retraction phase (0.75-1.0)
            float retraction = (expansion_phase - 0.75) / 0.25;
            active_segment = 1.0 - retraction;
        }
        
        // Check if this point's position along the bar is within the active segment
        if (bar_pos <= active_segment) {
            // This point should be lit
            
            // Brighter at the leading edge, dimmer at the base
            float edge_effect = smoothstep(active_segment - 0.1, active_segment, bar_pos);
            
            // Add brightness based on position along bar and distance from nose
            float position_brightness = 0.7 * edge_effect;
            
            // Add base brightness that's stronger near the nose
            float base_brightness = 0.3 * (1.0 - bar_pos * 0.7);
            
            // Combined brightness with distance falloff
            intensity += (position_brightness + base_brightness) * (1.0 - distance * 0.3);
        }
    }
    
    // Base to highlight color gradient based on intensity
    return mix(u_base_color, u_highlight_color, intensity);
}

// NEW ANIMATION 6: Group Highlight - Sequentially highlight each group
vec3 animateGroupHighlight(vec2 uv, vec4 pos, float group_id) {
    // Get the bar ID from the position map
    int bar_id = int(pos.z);
    
    // Only process valid bar IDs
    if (bar_id < 0 || bar_id >= u_total_bars) {
        // Invalid bar - show warning color (dim purple)
        return vec3(0.3, 0.0, 0.3);
    }
    
    // Sample the group data using our helper function
    vec4 groupData = sampleGroupTexture(bar_id);
    
    // Extract the group ID from G channel (1-based indexing)
    int group = int(groupData.g + 0.5); // Round to nearest integer
    
    // Base color for all groups (dim)
    vec3 baseColor = u_base_color * 0.2;
    
    // Calculate which group to highlight based on time (adjusted for 1-based indexing)
    float group_cycle_time = 2.0; // seconds to cycle through all groups
    float cycle_speed = 1.0 / (group_cycle_time * float(u_num_groups));
    int active_group = int(mod(floor(u_time * cycle_speed * u_zone_speed), float(u_num_groups))) + 1;
    
    // Override with manual selection if set (ensure 1-based)
    if (u_active_group >= 1) {
        active_group = u_active_group;
    }
    
    // Calculate the intensity based on whether this is the active group
    float intensity = 0.0;
    
    if (group == active_group) {
        // This is the active group - create a pulsing effect
        float pulse = (sin(u_time * 2.0) * 0.3) + 0.7; // Pulsing between 0.4 and 1.0
        intensity = pulse;
    } 
    // Add subtle pulsing for adjacent groups (previous and next)
    else if (group == ((active_group % u_num_groups) + 1) || // Next group (with wraparound)
             group == ((active_group - 2 + u_num_groups) % u_num_groups) + 1) { // Previous group (with wraparound)
        intensity = 0.3;
    }
    
    // Create the color for this point
    return mix(baseColor, u_highlight_color, intensity);
}

// Improved debug visualization for group texture
vec3 debugGroupVisualization(vec2 uv, vec4 pos, float group_id) {
    // Bar ID and position from position map
    int bar_id = int(pos.z);
    float bar_pos = pos.w;
    
    // Create a color specifically for each bar (not group)
    // This helps us see if bars are being properly identified
    vec3 color;
    
    // First, use fixed colors for the first 10 bars to easily identify them
    if (bar_id >= 0 && bar_id < 10) {
        // Bright, distinct colors for easy identification
        if (bar_id == 0) color = vec3(0.0, 1.0, 0.0); // Red
        else if (bar_id == 1) color = vec3(0.0, 1.0, 0.0); // Green
        else if (bar_id == 2) color = vec3(0.0, 1.0, 0.0); // Blue
        else if (bar_id == 3) color = vec3(0.0, 1.0, 0.0); // Yellow
        else if (bar_id == 4) color = vec3(0.0, 1.0, 0.0); // Magenta
        else if (bar_id == 5) color = vec3(0.0, 1.0, 0.0); // Cyan
        else if (bar_id == 6) color = vec3(0.0, 1.0, 0.0); // Orange
        else if (bar_id == 7) color = vec3(0.0, 1.0, 0.0); // Purple
        else if (bar_id == 8) color = vec3(0.0, 1.0, 0.0);// Lime
        else if (bar_id == 9) color = vec3(0.0, 1.0, 0.0); // Pink
    } else {
        // For other bars, create colors based on bar ID
        float normalized_bar_id = float(bar_id) / float(u_total_bars);
        color = vec3(0.0, 1.0, 0.0);
    }
    
    // Now add variation along the bar to see bar position
    // This helps verify that bar position is working correctly
    // Brighten the middle of each bar to make them more visible
    float bar_position_effect = 0.6 + 0.4 * (1.0 - abs(bar_pos - 0.5) * 2.0);
    color *= bar_position_effect;
    
    // Add time-based animation to help identify bar orientation
    // This will create a "traveling" effect along each bar
    float time_effect = 0.7 + 0.3 * sin(u_time * 2.0 + bar_pos * 6.28);
    color *= time_effect;
    
    // Highlight bars with special conditions
    if (bar_id < 0) {
        // Invalid bar ID (below 0)
        color = vec3(1.0, 0.0, 0.0) * (0.5 + 0.5 * sin(u_time * 5.0)); // Blinking red
    } else if (bar_id >= u_total_bars) {
        // Bar ID too high
        color = vec3(1.0, 1.0, 0.0) * (0.5 + 0.5 * sin(u_time * 5.0)); // Blinking yellow
    }
    
    // Add group ID information by adjusting brightness based on group
    // Sample the group texture to get raw group ID value
    vec4 groupData = texture(sTD2DInputs[2], vUV.st);
    float raw_group_id = groupData.g;
    
    // Display the raw group ID value as pulsing brightness
    // Each group will pulse at a different rate to make them distinguishable
    float group_pulse_rate = 0.5 + float(int(raw_group_id)) * 0.1;
    float group_pulse = 0.7 + 0.3 * sin(u_time * group_pulse_rate);
    
    // Only apply group pulsing if we have a valid group ID
    if (raw_group_id >= 0.0) {
        color *= group_pulse;
    }
    
    return color;
}

// Anatomical Expression Sequence Animation
// A sequence that mimics a lion's facial expressions by activating groups in a specific pattern

// Cubic Bezier curve function for natural easing
float cubicBezier(float t, vec4 ctrl) {
    float u = 1.0 - t;
    float tt = t * t;
    float uu = u * u;
    float uuu = uu * u;
    float ttt = tt * t;
    
    return uuu * ctrl.x + 3.0 * uu * t * ctrl.y + 3.0 * u * tt * ctrl.z + ttt * ctrl.w;
}

// Exponential ease in-out function
float expEaseInOut(float t) {
    if (t == 0.0 || t == 1.0) return t;
    
    if (t < 0.5) {
        // Ease in
        return 0.5 * pow(2.0, 20.0 * (t - 0.5));
    } else {
        // Ease out
        return 0.5 * (2.0 - pow(2.0, -20.0 * (t - 0.5)));
    }
}

// Animation function for the anatomical expression sequence
vec3 animateAnatomicalExpression(vec2 uv, vec4 pos, float group_id) {
    // Get the bar ID from the position map
    int bar_id = int(pos.z);
    
    // Only process valid bar IDs
    if (bar_id < 0 || bar_id >= u_total_bars) {
        return vec3(0.3, 0.0, 0.3); // Invalid bar - show warning color
    }
    
    // Sample the group data to get the actual group ID
    vec4 groupData = sampleGroupTexture(bar_id);
    int group = int(groupData.g + 0.5); // Round to nearest integer (1-based)
    
    // Base color for inactive parts (dim)
    vec3 baseColor = u_base_color * 0.15;
    
    // Animation cycle time in seconds (how long the full expression takes)
    float cycle_duration = 3.0;
    float t = mod(u_time, cycle_duration) / cycle_duration;
    
    // Define timing for each facial feature activation (when each starts & ends)
    // Using the full 0-1 range for the complete animation
    
    // Eyes activation (0.0 - 0.25)
    float eyes_start = 0.0;
    float eyes_peak = 0.15;
    float eyes_end = 0.35;
    
    // Eyebrows activation (0.15 - 0.4)
    float brows_start = 0.15;
    float brows_peak = 0.25;
    float brows_end = 0.45;
    
    // Nose activation (0.3 - 0.55)
    float nose_start = 0.0;
    float nose_peak = 0.5;
    float nose_end = 1.0;
    
    // Teeth activation (0.45 - 0.7)
    float teeth_start = 0.45;
    float teeth_peak = 0.6;
    float teeth_end = 0.8;
    
    // Mane activation (0.6 - 1.0)
    float mane_start = 0.0;
    float mane_peak = 0.85;
    float mane_end = 1.0;
    
    // Intensity for each group
    float eyes_intensity = 0.0;
    float brows_intensity = 0.0;
    float nose_intensity = 0.0;
    float teeth_intensity = 0.2;
    float mane_intensity = 0.2;
    float ears_intensity = 0.0;
    float cheeks_intensity = 0.0;
    
    // Calculate intensity for eyes group with cubic bezier easing
    if (t >= eyes_start && t <= eyes_end) {
        // Normalize t to 0-1 range for this segment
        float normalized_t = (t - eyes_start) / (eyes_end - eyes_start);
        
        // Use cubic bezier for natural easing - customize control points as needed
        // Control points for fast rise and slow decay
        vec4 ctrl = vec4(0.0, 0.2, 0.8, 1.0);
        
        // If we're before the peak, ease in, else ease out
        if (t < eyes_peak) {
            float segment_t = (t - eyes_start) / (eyes_peak - eyes_start);
            eyes_intensity = cubicBezier(segment_t, ctrl);
        } else {
            float segment_t = (t - eyes_peak) / (eyes_end - eyes_peak);
            eyes_intensity = cubicBezier(1.0 - segment_t, ctrl);
        }
        
        // Keep some base intensity for eyes after activation
        eyes_intensity = max(eyes_intensity, 0.3);
    } else if (t > eyes_end) {
        // After eyes activation, keep a base intensity
        eyes_intensity = 0.3;
    }
    
    // Calculate intensity for eyebrows with exponential easing
    if (t >= brows_start && t <= brows_end) {
        // Normalize t to 0-1 range for this segment
        float normalized_t = (t - brows_start) / (brows_end - brows_start);
        
        // Use exponential ease in-out for natural movement
        if (t < brows_peak) {
            float segment_t = (t - brows_start) / (brows_peak - brows_start);
            brows_intensity = expEaseInOut(segment_t);
        } else {
            float segment_t = (t - brows_peak) / (brows_end - brows_peak);
            brows_intensity = expEaseInOut(1.0 - segment_t);
        }
        
        // Keep some base intensity for brows after activation
        brows_intensity = max(brows_intensity, 0.2);
    } else if (t > brows_end) {
        // After brow activation, keep a base intensity
        brows_intensity = 0.2;
    }
    
    // Calculate intensity for nose with oscillation for "twitching" effect
    if (t >= nose_start && t <= nose_end) {
        // Base intensity with cubic bezier
        float normalized_t = (t - nose_start) / (nose_end - nose_start);
        
        // Control points for quick twitch
        vec4 ctrl = vec4(0.0, 0.1, 0.3, 1.0);
        
        // Base curve
        float base_curve;
        if (t < nose_peak) {
            float segment_t = (t - nose_start) / (nose_peak - nose_start);
            base_curve = cubicBezier(segment_t, ctrl);
        } else {
            float segment_t = (t - nose_peak) / (nose_end - nose_peak);
            base_curve = cubicBezier(1.0 - segment_t, ctrl);
        }
        
        // Add oscillation for twitching effect
        float twitch = 0.2 * sin(normalized_t * 40.0);
        nose_intensity = base_curve ;
        
        // Ensure intensity stays in valid range
        nose_intensity = clamp(nose_intensity, 0.0, 1.0);
    }
    
    // Calculate intensity for teeth with dramatic rise
    if (t >= teeth_start && t <= teeth_end) {
        // Dramatic curve with quick rise and slow decay
        if (t < teeth_peak) {
            // Quick rise with exp ease
            float segment_t = (t - teeth_start) / (teeth_peak - teeth_start);
            teeth_intensity = pow(segment_t, 0.5); // Quick rise
        } else {
            // Slower decay
            float segment_t = (t - teeth_peak) / (teeth_end - teeth_peak);
            teeth_intensity = 1.0 - pow(segment_t, 2.0); // Slower decay
        }
        
        // Make teeth the brightest at peak
        teeth_intensity *= 1.2; // Boost brightness
        teeth_intensity = clamp(teeth_intensity, 0.0, 1.0); // Ensure valid range
    }
    
    // Calculate intensity for mane with ripple effect
    if (t >= mane_start && t <= mane_end) {
        // Base intensity with cubic bezier
        float normalized_t = (t - mane_start) / (mane_end - mane_start);
        
        // Control points for smooth rise
        vec4 ctrl = vec4(0.0, 0.4, 0.8, 1.0);
        
        // Add position variation to create a rising wave effect in the mane
        float base_curve = cubicBezier(normalized_t, ctrl);
        
        // Distance affects timing - further points in mane activate later
        float distance = pos.y;
        float delay = 0.2 * distance; // Delay based on distance
        float adjusted_t = normalized_t - delay;
        
        // Only include points that have reached the wave
        if (adjusted_t > 0.0) {
            mane_intensity = base_curve * expEaseInOut(clamp(adjusted_t * 2.0, 0.0, 1.0));
        }
    }
    
    // Ears follow the eyebrows
    if (t >= brows_start) {
        ears_intensity = brows_intensity * 0.8;
    }
    
    // Cheeks follow the nose and teeth
    if (t >= nose_start) {
        cheeks_intensity = max(nose_intensity * 0.6, teeth_intensity * 0.4);
    }
    
    // Determine the color based on which group this pixel belongs to
    float intensity = 0.0;
    
    // Set intensity based on group
    if (group == EYES_GROUP) {
        intensity = eyes_intensity;
    } else if (group == EYEBROWS_GROUP) {
        intensity = brows_intensity;
    } else if (group == NOSE_GROUP) {
        intensity = nose_intensity;
    } else if (group == TEETH_GROUP) {
        intensity = teeth_intensity;
    } else if (group == MANE_GROUP) {
        intensity = mane_intensity;
    } else if (group == EARS_GROUP) {
        intensity = ears_intensity;
    } else if (group == CHEEKS_GROUP) {
        intensity = cheeks_intensity;
    }
    
    // Add subtle pulsing to all parts for liveliness
    float subtle_pulse = 0.05 * sin(u_time * 2.0 + float(group) * 0.7);
    intensity += subtle_pulse;
    
    // Ensure intensity stays in valid range
    intensity = clamp(intensity, 0.0, 1.0);
    
    // Final color
    return mix(baseColor, u_highlight_color, intensity);
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
    
    // Either use direct texture colors or map to base-highlight scheme
    if (u_use_direct_color == 1) {
        // Use the actual texture colors directly
        return texColor.rgb;
    } else {
        // Apply base-highlight color scheme
        float brightness = (texColor.r + texColor.g + texColor.b) / 3.0;
        return mix(u_base_color, u_highlight_color, brightness);
    }
}

// NEW FUNCTIONS FOR INDEPENDENT FACIAL FEATURE CONTROL

// Eyes animation function with multiple modes
vec3 animateEyes(vec2 uv, vec4 pos, float group_id) {
    float distance = pos.y;  // Normalized distance in G channel
    float angle = pos.x;     // Normalized angle in R channel
    int bar_id = int(pos.z); // Integer bar ID from B channel
    float bar_pos = pos.w;   // Position along bar (0-1) in A channel
    
    // Verify we're working with eye group data
    vec4 groupData = sampleGroupTexture(bar_id);
    int group = int(groupData.g + 0.5); // Round to nearest integer
    if (group != EYES_GROUP) {
        // Not part of eyes group, return dim base color
        return u_base_color * 0.2;
    }
    
    // Base color (dim glow for inactive areas)
    vec3 baseColor = u_base_color * 0.2;
    float intensity = 0.0;
    
    // Adjust for left/right eye
    bool is_left_eye = angle < 0.5;
    
    // Approximation: Eyes are at approximately 0.25 and 0.75 angles
    float eye_center = is_left_eye ? 0.25 : 0.75;
    
    // Calculate distance from eye center (in angular space)
    // Increase the effective radius of eye effect
    float eye_angle_dist = abs(angle - eye_center);
    
    // Calculate proximity to eye center (1.0 at center, 0.0 far away)
    // Increased from 0.15 to 0.25 for wider spread
    float eye_proximity = 1.0 - smoothstep(0.0, 0.25, eye_angle_dist);
    
    // Add vertical expansion based on distance
    // This helps the effect spread up and down from the eye centers
    float vertical_factor = 1.0 - smoothstep(0.0, 0.5, distance);
    eye_proximity *= (0.7 + 0.3 * vertical_factor);
    
    // Different eye animation modes
    if (u_eyes_mode == 0) {
        // Steady glow
        intensity = 1.7 * eye_proximity;
        
        // Add subtle breathing effect
        float breath = 1.1 * sin(u_time * 5.5);
        intensity += breath * eye_proximity;
        
        // Add subtle background glow for wider eye region
        intensity = max(intensity, 0.2 * eye_proximity);
    }
    else if (u_eyes_mode == 1) {
        // Natural blinking effect with randomization and proper closed phase
        
        // Use multiple time scales to create pseudo-random blink timing
        float base_time = u_time * 0.1;  // Slow time base
        
        // Create a compound time value using sine waves at different frequencies
        // This creates a non-repeating pattern that feels random but is deterministic
        float compound_time = base_time + 
                             0.3 * sin(base_time * 0.763) + 
                             0.2 * sin(base_time * 1.547) +
                             0.1 * sin(base_time * 3.891);
                             
        // Sample noise to determine when blinks should occur
        float noise_val = noise(vec2(compound_time, 0.42));
        
        // Blink threshold - higher value = less frequent blinks
        // Humans blink roughly every 4-6 seconds on average
        float blink_threshold = 0.85;  // Only blink when noise exceeds this value
        
        // Blink duration in seconds (real blinks take ~0.3-0.4 seconds total)
        float blink_duration = 0.4;
        
        // Calculate blink time in seconds and blink progress
        float blink_time_offset = 0.0;
        float blink_progress = 0.0;
        bool is_blinking = false;
        
        // Check if we should be in a blink right now
        if (noise_val > blink_threshold) {
            // Calculate how far into the blink we are
            float time_since_blink_trigger = mod(u_time, 15.0) - compound_time;
            
            // Only process if we're within the blink duration
            if (time_since_blink_trigger < blink_duration) {
                is_blinking = true;
                blink_progress = time_since_blink_trigger / blink_duration;
            }
        }
        
        // Now calculate the blink curve
        float blink_amount = 0.0;
        if (is_blinking) {
            // Natural blink curve has three phases:
            // 1. Quick closing (0.0-0.3)
            // 2. Fully closed (0.3-0.7)
            // 3. Quick opening (0.7-1.0)
            
            if (blink_progress < 0.3) {
                // Eyelids closing - use smoothstep for natural easing
                blink_amount = smoothstep(0.0, 1.0, blink_progress / 0.3);
            } 
            else if (blink_progress < 0.7) {
                // Eyes fully closed
                blink_amount = 1.0;
            }
            else {
                // Eyelids opening - use smoothstep for natural easing
                blink_amount = smoothstep(1.0, 0.0, (blink_progress - 0.7) / 0.3);
            }
        }
        
        // Apply blink (reduces intensity when blinking)
        // When fully closed (blink_amount = 1.0), the eyes should be very dark
        float open_intensity = eye_proximity * 2;
        float closed_intensity = eye_proximity * 0.05; // Nearly black when closed
        intensity = mix(open_intensity, closed_intensity, blink_amount);
        
        // Add subtle breathing effect when eyes are open
        float breath = 1.1 * sin(u_time * 0.7);
        intensity += breath * eye_proximity * (1.0 - blink_amount);
        
        // Add wider glow around eyes (dimmer when blinking)
        float glow_intensity = 0.2 * eye_proximity * (1.0 - blink_amount * 0.8);
        intensity = max(intensity, glow_intensity);
    }
    else if (u_eyes_mode == 2) {
        // Looking around effect - shift the bright spot
        float look_cycle = 8.0; // seconds to complete a look cycle
        float look_phase = mod(u_time*2, look_cycle) / look_cycle;
        
        // Calculate look direction offset
        // At phase 0.25: looking right
        // At phase 0.75: looking left
        float look_offset = 0.06 * sin(look_phase * 6.28318); // +/- 0.06 angle shift
        
        // Adjust eye center based on looking direction
        float adjusted_eye_center = eye_center + look_offset;
        
        // Recalculate distance from adjusted eye center
        float adjusted_eye_dist = abs(angle - adjusted_eye_center);
        
        // Recalculate proximity with the adjusted center
        float adjusted_proximity = 1.0 - smoothstep(0.0, 0.15, adjusted_eye_dist);
        
        // Apply the adjusted intensity
        intensity = 2 * adjusted_proximity;
    }
    else if (u_eyes_mode == 3) {
        // Alert/wide eyes mode with pupil dilation
        // Simulate dilated pupils with brighter centers
        float flash = mod( u_time * 30, 2)/2;
        // Make the bright spot smaller but more intense (dilated pupil)

        
        intensity = flash;
        

    }
    else if (u_eyes_mode == 4) {
        // Progressive pixel animation along each bar
        // Each bar fills from pixel 1 to 50 in 1 second, then back in 0.3 seconds
        
        // Calculate the cycle time (1.0s fill + 0.3s empty = 1.3s total)
        float cycle_duration = 1.3;
        float cycle_phase = mod(u_time, cycle_duration) / cycle_duration;
        
        // Determine if we're in the filling phase (0-0.77) or emptying phase (0.77-1.0)
        // 1.0s out of 1.3s total is ~0.77 of the cycle
        bool filling_phase = cycle_phase < 0.77;
        
        // Calculate progress within the current phase
        float phase_progress;
        if (filling_phase) {
            // Normalize progress within the 1.0s filling phase
            phase_progress = cycle_phase / 0.77;
        } else {
            // Normalize progress within the 0.3s emptying phase
            phase_progress = (cycle_phase - 0.77) / 0.23;
        }
        
        // Now determine the cutoff position along the bar
        float cutoff_position;
        
        if (filling_phase) {
            // During filling: move from position 0 to 1
            cutoff_position = phase_progress;
        } else {
            // During emptying: move from position 1 back to 0
            cutoff_position = 1.0 - phase_progress;
        }
        
        // Determine if this specific point on the bar is "on" based on position
        // We want a sharp transition point that moves along the bar
        float transition_width = 0.05; // Width of the transition zone
        
        // Calculate distance from the cutoff point
        float dist_from_cutoff = bar_pos - cutoff_position;
        
        // Calculate intensity based on position relative to cutoff
        // Points behind the cutoff get full intensity, ahead get zero
        float fill_amount;
        
        if (dist_from_cutoff < 0.0) {
            // Behind the cutoff - fully on
            fill_amount = 1.0;
        } 
        else if (dist_from_cutoff < transition_width) {
            // In the transition zone - gradual falloff
            fill_amount = 1.0 - (dist_from_cutoff / transition_width);
        }
        else {
            // Ahead of the cutoff - fully off
            fill_amount = 0.0;
        }
        
        // Apply the fill amount to the intensity
        float filled_intensity = eye_proximity * 0.8;
        float empty_intensity = eye_proximity * 0.05; // Nearly black when empty
        intensity = mix(empty_intensity, filled_intensity, fill_amount);
        
        // Add wider glow around eyes
        float glow_intensity = 0.2 * eye_proximity;
        intensity = max(intensity, glow_intensity)*5;
    }
    
    // Apply user-defined intensity multiplier
    intensity *= u_eyes_intensity;
    
    // Clamp to valid range
    intensity = clamp(intensity, 0.0, 1.0);
    
    // Create the final color
    return mix(baseColor, u_eyes_color, intensity);
}

// Teeth animation function with multiple modes
vec3 animateTeeth(vec2 uv, vec4 pos, float group_id) {
    float distance = pos.y;  // Normalized distance in G channel
    float angle = pos.x;     // Normalized angle in R channel
    int bar_id = int(pos.z); // Integer bar ID from B channel
    float bar_pos = pos.w;   // Position along bar (0-1) in A channel
    
    // Verify we're working with teeth group data
    vec4 groupData = sampleGroupTexture(bar_id);
    int group = int(groupData.g + 0.5); // Round to nearest integer
    if (group != TEETH_GROUP) {
        // Not part of teeth group, return dim base color
        return u_base_color * 0.2;
    }
    
    // Base color (dim glow for inactive teeth)
    vec3 baseColor = u_base_color * 0.2;
    float intensity = 0.0;
    
    // Different teeth animation modes
    if (u_teeth_mode == 0) {
        // Steady glow for teeth
        intensity = .7;
        
        // Add subtle breathing variation
        float breath = .75 * sin(u_time * 0.6);
        intensity += breath;
    }
    else if (u_teeth_mode == 1) {
        // Chattering/pulsing teeth
        float chatter_speed = 8.0; // Adjust for faster/slower chattering
        float chatter_phase = sin(u_time * chatter_speed) * 1.5 + 0.5;
        
        // Create a pulsing effect with some randomization
        float random_offset = random(vec2(bar_id, 0.42)) *0.8; // Per-bar variation
        float chatter_effect = chatter_phase + random_offset;
        
        // Apply chattering effect
        intensity = 0.5 + 0.5 * chatter_effect;
    }
    else if (u_teeth_mode == 2) {
        // Snarling effect - progressive activation from back to front
        // In a snarl, teeth are revealed gradually from one side to the other
        
        // Create a slow side-to-side snarl motion
        float snarl_cycle = 6.0; // seconds per snarl cycle
        float snarl_phase = mod(u_time, snarl_cycle) / snarl_cycle;
        
        // Triangle wave pattern for back-and-forth movement
        float triangle_wave;
        if (snarl_phase < 0.5) {
            triangle_wave = snarl_phase * 2.0; // 0 to 1
        } else {
            triangle_wave = 2.0 - snarl_phase * 2.0; // 1 to 0
        }
        
        // Direction of the snarl wave (left to right or right to left)
        float snarl_pos = angle; // Use angle directly for side-to-side
        
        // Calculate snarl effect - teeth light up as the wave passes over them
        float snarl_threshold = triangle_wave; // Position of the snarl wave (0-1)
        float snarl_width = 0.1; // Width of the active snarl region
        
        // Calculate proximity to the snarl wave
        float dist_from_snarl = abs(snarl_pos - snarl_threshold);
        float snarl_proximity = 1.0 - smoothstep(0.0, snarl_width, dist_from_snarl);
        
        // Create the snarl effect
        intensity = 0.3 + 0.7 * snarl_proximity;
    }
    else if (u_teeth_mode == 3) {
        // Roaring effect - teeth fully bared with pulsing intensity
        // Create a strong pulsing effect with some variation across teeth
        
        // Base roar intensity - strong
        float roar_base = 0.1 + 0.9 * distance; // Distance-based intensity
        // Roar intensity is stronger at the center and weaker at the edges
        
        // Add pulsing to simulate roaring
        float roar_pulse_rate = 5.0; // Adjust for different roar speeds
        float roar_pulse = 0.2 * sin(u_time * roar_pulse_rate);
        
        // Add some variation based on position
        float variation = 0.1 * sin(bar_pos * 50.0 + u_time * 3.0);
        
        // Combine for final roar effect
        intensity = roar_base + roar_pulse + variation;
    }
    
    // Apply user-defined intensity multiplier
    intensity *= u_teeth_intensity;
    
    // Clamp to valid range
    intensity = clamp(intensity, 0.0, 1.0);
    
    // Create the final color
    return mix(baseColor, u_teeth_color, intensity);
}

// NEW: Pattern Transition Functions

// Basic crossfade transition between any two patterns (fallback)
vec3 crossfadeTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    // Get colors from both patterns
    vec3 fromColor, toColor;
    
    // Calculate the 'from' pattern color
    if (u_from_pattern == 0) fromColor = animateWave(uv, pos, group_id);
    else if (u_from_pattern == 1) fromColor = animateBreathing(uv, pos, group_id);
    else if (u_from_pattern == 2) fromColor = animateGroupSequence(uv, pos, group_id);
    else if (u_from_pattern == 3) fromColor = animateRoaring(uv, pos, group_id);
    else if (u_from_pattern == 4) fromColor = animateGlitter(uv, pos, group_id);
    else if (u_from_pattern == 5) fromColor = animateBarPattern(uv, pos, group_id);
    else if (u_from_pattern == 6) fromColor = animateRandomBars(uv, pos, group_id);
    else if (u_from_pattern == 7) fromColor = animateSingleBar(uv, pos, group_id);
    else if (u_from_pattern == 8) fromColor = animateSymmetricalPulse(uv, pos, group_id);
    else if (u_from_pattern == 9) fromColor = animateVerticalCascade(uv, pos, group_id);
    else if (u_from_pattern == 10) fromColor = animateSymmetricalChase(uv, pos, group_id);
    else if (u_from_pattern == 11) fromColor = animateAxisRipple(uv, pos, group_id);
    else if (u_from_pattern == 12) fromColor = animateNoseLines(uv, pos, group_id);
    else if (u_from_pattern == 13) fromColor = animateGroupHighlight(uv, pos, group_id);
    else if (u_from_pattern == 14) fromColor = debugGroupVisualization(uv, pos, group_id);
    else if (u_from_pattern == 15) fromColor = animateAnatomicalExpression(uv, pos, group_id);
    else fromColor = animateWave(uv, pos, group_id);
    
    // Calculate the 'to' pattern color
    if (u_to_pattern == 0) toColor = animateWave(uv, pos, group_id);
    else if (u_to_pattern == 1) toColor = animateBreathing(uv, pos, group_id);
    else if (u_to_pattern == 2) toColor = animateGroupSequence(uv, pos, group_id);
    else if (u_to_pattern == 3) toColor = animateRoaring(uv, pos, group_id);
    else if (u_to_pattern == 4) toColor = animateGlitter(uv, pos, group_id);
    else if (u_to_pattern == 5) toColor = animateBarPattern(uv, pos, group_id);
    else if (u_to_pattern == 6) toColor = animateRandomBars(uv, pos, group_id);
    else if (u_to_pattern == 7) toColor = animateSingleBar(uv, pos, group_id);
    else if (u_to_pattern == 8) toColor = animateSymmetricalPulse(uv, pos, group_id);
    else if (u_to_pattern == 9) toColor = animateVerticalCascade(uv, pos, group_id);
    else if (u_to_pattern == 10) toColor = animateSymmetricalChase(uv, pos, group_id);
    else if (u_to_pattern == 11) toColor = animateAxisRipple(uv, pos, group_id);
    else if (u_to_pattern == 12) toColor = animateNoseLines(uv, pos, group_id);
    else if (u_to_pattern == 13) toColor = animateGroupHighlight(uv, pos, group_id);
    else if (u_to_pattern == 14) toColor = debugGroupVisualization(uv, pos, group_id);
    else if (u_to_pattern == 15) toColor = animateAnatomicalExpression(uv, pos, group_id);
    else toColor = animateWave(uv, pos, group_id);
    
    // Simple linear interpolation
    return mix(fromColor, toColor, progress);
}

// Custom transition: Roaring to Group Sequence
// Energy ripples from mouth outward to mane
vec3 roaringToGroupSequenceTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    float distance = pos.y;  // Normalized distance in G channel
    float angle = pos.x;     // Normalized angle in R channel
    int bar_id = int(pos.z); // Integer bar ID from B channel
    
    // Sample group data to identify which facial feature this is
    vec4 groupData = sampleGroupTexture(bar_id);
    int group = int(groupData.g + 0.5); // Round to nearest integer
    
    // Calculate the transition wave that travels outward from the mouth (teeth)
    // The wave moves from distance 0 (mouth) to distance 1 (edge) based on progress
    float wave_position = progress * 1.5; // Go slightly beyond to ensure complete transition
    
    // Adjust intensity based on distance from the wave front
    float wave_width = 0.3; // Width of transition wave
    float dist_from_wave = abs(distance - wave_position);
    float wave_intensity = 1.0 - smoothstep(0.0, wave_width, dist_from_wave);
    
    // Get the colors from both patterns
    vec3 roaringColor = animateRoaring(uv, pos, group_id);
    vec3 groupSequenceColor = animateGroupSequence(uv, pos, group_id);
    
    // Custom color for the transition wave - fiery orange
    vec3 waveHighlight = vec3(1.0, 0.5, 0.0); 
    
    // Determine how to blend based on the wave position
    vec3 resultColor;
    
    if (distance < wave_position - wave_width * 0.5) {
        // Area behind wave front (closer to mouth) - already transitioned to new pattern
        resultColor = groupSequenceColor;
    }
    else if (dist_from_wave < wave_width) {
        // Within the wave front - add highlight and blend
        // Mix in some of the wave highlight based on proximity to wave center
        float highlight_amount = (1.0 - dist_from_wave / wave_width) * 0.7;
        resultColor = mix(roaringColor, groupSequenceColor, progress);
        resultColor = mix(resultColor, waveHighlight, highlight_amount);
    }
    else {
        // Area ahead of wave front (farther from mouth) - still using old pattern 
        resultColor = roaringColor;
    }
    
    // Special effect for mouth area (TEETH_GROUP)
    if (group == TEETH_GROUP) {
        // Teeth/mouth starts the transition with a bright flash 
        float flash_intensity = max(0.0, 1.0 - progress * 3.0); // Flash during first third
        resultColor = mix(resultColor, waveHighlight, flash_intensity);
    }
    
    // Special effect for mane area (MANE_GROUP)
    if (group == MANE_GROUP) {
        // Mane "catches fire" as the wave approaches
        // Calculate distance from wave to mane
        float wave_to_mane = max(0.0, distance - wave_position);
        // Pre-glow effect that appears before the wave arrives
        float pre_glow = max(0.0, 1.0 - wave_to_mane / (wave_width * 2.0));
        pre_glow = pre_glow * pre_glow; // Square to make the effect more focused
        resultColor = mix(resultColor, waveHighlight, pre_glow * 0.3);
    }
    
    return resultColor;
}

// Custom transition: Wave to Glitter
// Wave pattern "breaks apart" into glitter particles
vec3 waveToGlitterTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    // Extract position data
    float distance = pos.y;
    float angle = pos.x;
    
    // During the transition we'll:
    // 1. Start with the wave pattern
    // 2. Gradually increase the noise/glitter frequency and randomness
    // 3. Reduce the wave coherence until it fully breaks apart
    
    // Get base colors from patterns
    vec3 waveColor = animateWave(uv, pos, group_id);
    vec3 glitterColor = animateGlitter(uv, pos, group_id);
    
    // Calculate transition-specific effects
    
    // 1. Wave pattern becomes increasingly distorted
    float wave_t = u_time * 0.05 * u_wave_speed;
    float wave_position = mod(wave_t, 1.0 + u_wave_width);
    float distance_from_wave = abs(distance - wave_position);
    
    // Add increasing distortion to the wave
    float distortion_amount = progress * 0.5;
    distance_from_wave += distortion_amount * noise(vec2(angle * 20.0, u_time * 2.0));
    
    // Calculate wave intensity with distortion
    float wave_intensity = 0.05;  // Base intensity
    if (distance_from_wave < u_wave_width) {
        float wave_contribution = 1.0 - (distance_from_wave / u_wave_width);
        wave_contribution = sin(wave_contribution * 3.14159 / 2.0);
        wave_intensity += (1.0 - 0.05) * wave_contribution;
    }
    
    // 2. Gradually introduce glitter particles
    // Scale glitter density based on progress
    float transition_glitter_density = mix(0.05, u_glitter_density, progress);
    
    // Create glitter effect with increasing density
    float scale = 50.0 + progress * 30.0;  // Increase density of glitter points
    vec2 scaledPos = vec2(angle * scale, distance * scale * 2.0);
    
    float t = u_time * u_glitter_speed;
    
    // Increase noise complexity as transition progresses
    float n1 = noise(scaledPos + vec2(t, t * 0.5));
    float n2 = noise(scaledPos * 1.5 + vec2(-t * 0.7, t * 0.3));
    float n3 = noise(scaledPos * 0.5 + vec2(t * 0.2, -t * 0.6));
    
    // Combine with increasing weight on complexity
    float combined = mix(n1, (n1 * 0.5 + n2 * 0.3 + n3 * 0.2), progress);
    
    // Calculate glitter effect with increasing density
    float threshold = 1.0 - transition_glitter_density;
    float glitter = (combined > threshold) ? pow((combined - threshold) / (1.0 - threshold), 2.0) : 0.0;
    
    // Adjust glitter brightness based on distance and progress
    float distanceEffect = 1.0 - distance * 0.5;
    glitter *= distanceEffect;
    
    // 3. Blend between wave and glitter effects
    // Base color (dim green)
    vec3 baseColor = u_base_color * 0.2;
    
    // Create wave component with decreasing intensity
    vec3 waveComponent = mix(u_base_color, u_highlight_color, wave_intensity);
    
    // Create glitter component with increasing intensity
    vec3 glitterEffect = u_highlight_color * glitter * (1.0 + progress * 0.5);
    
    // Blend base color with calculated effects
    vec3 transitionColor = baseColor;
    
    // Add wave component (decaying with progress)
    transitionColor = mix(transitionColor, waveComponent, 1.0 - progress);
    
    // Add glitter component (increasing with progress)
    transitionColor += glitterEffect * progress;
    
    // Add sparkles that appear to break off from the wave
    if (distance_from_wave < u_wave_width + 0.1) {
        float sparkle_chance = noise(vec2(angle * 30.0 + u_time, distance * 20.0));
        if (sparkle_chance > 0.7 && sparkle_chance < 0.7 + 0.2 * progress) {
            // Create sparkles that break off from the wave
            float sparkle_brightness = (sparkle_chance - 0.7) / 0.2 * progress;
            transitionColor = mix(transitionColor, u_highlight_color, sparkle_brightness);
        }
    }
    
    return transitionColor;
}

// Custom transition: Breathing to Vertical Cascade
// Breathing animation accelerates then collapses into a top-down cascade
vec3 breathingToVerticalCascadeTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    float distance = pos.y;  // Normalized distance in G channel
    float angle = pos.x;     // Normalized angle in R channel
    
    // Get base colors from patterns
    vec3 breathingColor = animateBreathing(uv, pos, group_id);
    vec3 cascadeColor = animateVerticalCascade(uv, pos, group_id);
    
    // Modify the breathing timing during transition
    // Make breathing increasingly faster in first half of transition
    float breathing_rate;
    if (progress < 0.5) {
        // Accelerate breathing rate (0.5 to 4.0)
        breathing_rate = 0.5 + progress * 7.0;
    } else {
        // Keep maximum breathing rate
        breathing_rate = 4.0;
    }
    
    // Calculate enhanced breathing phase with modified timing
    float enhanced_phase = (sin(u_time * breathing_rate) + 1.0) / 2.0;
    
    // Approximate vertical position (0 = top, 1 = bottom)
    // This is a heuristic similar to the vertical cascade implementation
    float vertical_pos;
    
    // Front of face (nose area) - use primarily angle-based
    if (distance < 0.3) {
        // Bottom of face (closer to 0.5 angle which is bottom)
        vertical_pos = abs(angle - 0.5) < 0.2 ? 0.8 + distance : 0.5 + distance;
    }
    // Middle of face (eyes, brows) - blend
    else if (distance < 0.6) {
        vertical_pos = 0.4 + (1.0 - abs(angle - 0.5)) * 0.4;
    }
    // Back of head/mane - higher up
    else {
        vertical_pos = 0.3 * distance;
    }
    
    // Create a collapse effect in the second half of the transition
    // This is a vertical wave moving from top to bottom
    float collapse_position = 0.0;
    float collapse_width = 0.3;
    
    if (progress > 0.5) {
        // Map progress 0.5-1.0 to collapse position 0.0-1.5
        collapse_position = (progress - 0.5) * 3.0;
        
        // Distance from current position to collapse front
        float dist_from_collapse = vertical_pos - collapse_position;
        
        // Points above the collapse line use breathing
        // Points below use cascade with increasing intensity
        if (dist_from_collapse > 0.0) {
            // Above collapse line - modified breathing
            float brightness = enhanced_phase * (1.0 - distance * 0.5);
            return mix(u_base_color, u_highlight_color, brightness);
        }
        else if (dist_from_collapse > -collapse_width) {
            // In the transition zone - blend with cascade effect
            float zone_progress = -dist_from_collapse / collapse_width;
            float brightness = enhanced_phase * (1.0 - distance * 0.5) * (1.0 - zone_progress);
            vec3 transitionColor = mix(u_base_color, u_highlight_color, brightness);
            
            // Add bright highlight at the collapse wave edge
            float edge_highlight = smoothstep(0.0, 0.1, zone_progress) * smoothstep(0.3, 0.2, zone_progress);
            transitionColor = mix(transitionColor, u_highlight_color, edge_highlight * 0.7);
            
            // Mix with cascade as we move through the transition zone
            return mix(transitionColor, cascadeColor, zone_progress);
        }
        else {
            // Below collapse line - already using cascade
            return cascadeColor;
        }
    }
    
    // In the first half of the transition, just use accelerated breathing
    float breathing_brightness = enhanced_phase * (1.0 - distance * 0.5);
    
    // Gradually introduce some vertical streaking to hint at the coming cascade
    float vertical_streaks = 0.0;
    if (progress > 0.3) {
        // Create subtle vertical streaking effect
        float streak_amount = (progress - 0.3) / 0.2; // 0->1 as progress goes 0.3->0.5
        float streak_pattern = sin(vertical_pos * 20.0 + u_time * 2.0);
        vertical_streaks = streak_pattern * streak_pattern * streak_amount * 0.2;
    }
    
    // Combine breathing with vertical streaks
    breathing_brightness = clamp(breathing_brightness + vertical_streaks, 0.0, 1.0);
    
    return mix(u_base_color, u_highlight_color, breathing_brightness);
}

// Custom transition: Symmetrical Pulse to Axis Ripple
// Pulses converge inward to center, then explode outward as ripples along axes
vec3 symmetricalPulseToAxisRippleTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    float angle = pos.x;         // Normalized angle in R channel
    float distance = pos.y;      // Normalized distance in G channel
    
    // Get colors from both patterns for reference
    vec3 pulseColor = animateSymmetricalPulse(uv, pos, group_id);
    vec3 rippleColor = animateAxisRipple(uv, pos, group_id);
    
    // Convert angle to radians for axis calculations
    float angle_rad = angle * 2.0 * 3.14159;
    
    // PHASE 1 (0.0-0.4): Pulses converge toward center
    if (progress < 0.4) {
        // Normalize to 0-1 for the first phase
        float phase1_progress = progress / 0.4;
        
        // Modify the pulse timing to create a "sucking in" effect
        float pulse_rate = 0.05 * u_wave_speed * (1.0 + phase1_progress * 3.0); // Accelerating pulse
        float t = u_time * pulse_rate;
        
        // Create multiple pulse zones converging toward center
        const float NUM_ZONES = 4.0;
        float zone_size = 1.0 / NUM_ZONES;
        float zone_index = floor(angle * NUM_ZONES);
        
        // Calculate angular distance within each zone
        float zone_center = (zone_index + 0.5) * zone_size;
        float angle_dist_in_zone = abs(angle - zone_center) / zone_size * 2.0;
        
        // Phase delay gets smaller as progress increases (pulses converge)
        float max_delay = 0.5 * (1.0 - phase1_progress);
        float phase_delay = distance * max_delay;
        
        // Calculate converging pulse waves
        float pulse_phase = sin(t - phase_delay);
        pulse_phase = (pulse_phase + 1.0) * 0.5;
        
        // Calculate symmetry factor that increases focus toward center
        float center_focus = phase1_progress * 0.7; // Gradually increase center focus
        float symmetry_factor = 1.0 - (angle_dist_in_zone * (0.7 - center_focus));
        
        // Calculate radial convergence - pulses move inward
        float convergence_factor = phase1_progress;
        float radial_effect = 1.0 - distance * (1.0 - convergence_factor);
        
        // Combine effects
        float intensity = pulse_phase * symmetry_factor * radial_effect;
        
        // Add a brightening center as energy converges
        float center_brightness = phase1_progress * max(0.0, 1.0 - distance / 0.3);
        intensity = max(intensity, center_brightness);
        
        // Apply color
        return mix(u_base_color, u_highlight_color, intensity);
    }
    // PHASE 2 (0.4-0.6): Energy builds at center and axis structure forms
    else if (progress < 0.6) {
        // Normalize to 0-1 for the second phase
        float phase2_progress = (progress - 0.4) / 0.2;
        
        // Create a bright energy core that grows at the center
        float core_size = 0.1 + phase2_progress * 0.2;
        float core_intensity = (1.0 - smoothstep(0.0, core_size, distance)) * 0.8;
        
        // Create axis structure that extends from the core
        // Calculate the stretched distance value along cardinal axes
        float axis_stretch = 1.0 + phase2_progress * 4.0; // Gradually extend axes
        
        // X and Y axis stretch factors
        float stretch_x = axis_stretch;
        float stretch_y = axis_stretch;
        
        // Calculate the stretched distance value
        float stretched_distance = distance * sqrt(
            pow(cos(angle_rad) * stretch_x, 2.0) + 
            pow(sin(angle_rad) * stretch_y, 2.0)
        );
        
        // Create energy along the axes
        float axis_distance = stretched_distance * 0.5;
        float axis_intensity = max(0.0, 1.0 - smoothstep(0.0, 0.3, axis_distance));
        axis_intensity *= phase2_progress; // Gradually increase axis effect
        
        // Pulsing energy at the core
        float pulse_rate = 5.0 + phase2_progress * 10.0; // Accelerating pulse
        float pulse = 0.5 + 0.5 * sin(u_time * pulse_rate);
        
        // Add pulsing to core intensity
        core_intensity += pulse * 0.2 * (1.0 - distance / 0.3);
        
        // Combine core and axis effects
        float intensity = max(core_intensity, axis_intensity);
        
        // Mix in some ripple color as the structure forms
        vec3 baseColor = mix(u_base_color, u_highlight_color, intensity);
        return mix(baseColor, rippleColor, phase2_progress * 0.3);
    }
    // PHASE 3 (0.6-1.0): Energy explodes outward as axis ripples
    else {
        // Normalize to 0-1 for the final phase
        float phase3_progress = (progress - 0.6) / 0.4;
        
        // Start with the full ripple pattern
        vec3 finalRippleColor = rippleColor;
        
        // Add an explosion wave during the transition
        float explosion_radius = phase3_progress * 1.5; // Expands beyond screen
        float dist_from_explosion = abs(distance - explosion_radius);
        
        // Create bright wave at the explosion front
        float explosion_width = 0.2;
        if (dist_from_explosion < explosion_width) {
            float explosion_intensity = 1.0 - (dist_from_explosion / explosion_width);
            explosion_intensity = sin(explosion_intensity * 3.14159 / 2.0);
            
            // Brighten the ripple color at the explosion front
            finalRippleColor = mix(finalRippleColor, u_highlight_color, explosion_intensity * 0.6);
        }
        
        return finalRippleColor;
    }
}

// Custom transition: Random Bars to Bar Pattern
// Random flickering gradually synchronizes into organized bar waves
vec3 randomBarsToBarPatternTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    // Extract bar data from position map
    int bar_id = int(pos.z);     // Integer bar ID from B channel
    float bar_pos = pos.w;       // Position along bar (0-1) in A channel
    
    // Get colors from both patterns
    vec3 randomColor = animateRandomBars(uv, pos, group_id);
    vec3 barPatternColor = animateBarPattern(uv, pos, group_id);
    
    // The transition concept:
    // 1. Start with random flickering
    // 2. Gradually synchronize nearby bars
    // 3. Form coherent waves that eventually become the bar pattern
    
    // PHASE 1: Modified random bars with increasing synchronization
    // Create a normalized bar_id (0-1) for calculations
    float normalized_bar_id = float(bar_id) / float(u_total_bars);
    
    // Create time-based noise that depends on bar ID
    // Early in transition: each bar has unique timing
    // Later in transition: bars synchronize in groups
    
    // Determine the synchronization group size (smaller number = more synced)
    // Start with very fine-grained randomization, end with just a few groups
    float sync_granularity = max(0.01, 0.3 * (1.0 - progress));
    
    // Calculate the sync group this bar belongs to (synchronizes bars by proximity)
    float sync_group = floor(normalized_bar_id / sync_granularity) * sync_granularity;
    
    // Time step that determines which bars are on/off
    // Interpolate between bar-specific randomness and group-synchronized timing
    float individual_time_step = floor(u_time * u_blink_speed * (1.0 + normalized_bar_id));
    float group_time_step = floor(u_time * u_blink_speed * (1.0 + sync_group));
    float time_step = mix(individual_time_step, group_time_step, progress);
    
    // Generate random hash value for this bar at this time step
    float hash_value = random(vec2(normalized_bar_id, time_step));
    
    // Determine if the bar should be on based on hash and density
    // Increase density as transition progresses to make more bars active
    float effective_density = mix(u_blink_density, 1.0, progress * 0.7);
    bool bar_on = hash_value < effective_density;
    
    // PHASE 2: Gradually introduce wave-like pattern
    // Wave position calculation (similar to bar pattern)
    float t = u_time * 0.2 * u_wave_speed;
    float wave_pos = mod(t, 2.0);  // Position of wave, cycles 0-2
    
    // Distance from current position to wave front
    float dist = abs(bar_pos - mod(wave_pos, 1.0));
    
    // If wave_pos > 1, the wave is traveling back
    if (wave_pos > 1.0) {
        dist = abs(bar_pos - (2.0 - wave_pos));
    }
    
    // Create pulse effect for the wave
    float wave_intensity = 0.1;  // Base intensity
    float pulse_width = 0.3 + 0.2 * progress;  // Wider pulse as transition progresses
    
    if (dist < pulse_width) {
        // Inside pulse
        float pulse = 1.0 - (dist / pulse_width);
        // Smooth with sine curve
        pulse = sin(pulse * 3.14159 / 2.0);
        wave_intensity += (1.0 - 0.1) * pulse;
    }
    
    // Calculate the transition color
    vec3 transitionColor;
    
    if (bar_on) {
        // For active bars, gradually introduce the wave pattern
        float random_intensity = 0.3 + 0.7 * random(vec2(normalized_bar_id, bar_pos + time_step));
        float wave_blend = smoothstep(0.0, 1.0, progress);
        float final_intensity = mix(random_intensity, wave_intensity, wave_blend);
        
        // Add positional variation along bar for active bars
        // This creates a subtle gradient effect
        float pos_variation = 0.2 * (1.0 - pow(abs(bar_pos - 0.5) * 2.0, 2.0));
        final_intensity += pos_variation * (1.0 - progress);
        
        transitionColor = mix(u_base_color, u_highlight_color, final_intensity);
    } else {
        // For inactive bars, gradually increase base glow
        float base_glow = 0.05 * (1.0 + progress);
        transitionColor = mix(u_base_color, u_highlight_color, base_glow);
    }
    
    // In the last 20% of the transition, directly blend with the final pattern
    if (progress > 0.8) {
        float final_blend = (progress - 0.8) / 0.2;
        transitionColor = mix(transitionColor, barPatternColor, final_blend);
    }
    
    return transitionColor;
}

// Custom transition: Group Highlight to Nose Lines
// Groups drain their energy into lines extending from the nose
vec3 groupHighlightToNoseLinesTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    float distance = pos.y;        // Normalized distance in G channel
    float angle = pos.x;           // Normalized angle in R channel
    int bar_id = int(pos.z);       // Integer bar ID from B channel
    float bar_pos = pos.w;         // Position along bar (0-1) in A channel
    
    // Sample group data to identify which facial feature this is
    vec4 groupData = sampleGroupTexture(bar_id);
    int group = int(groupData.g + 0.5); // Round to nearest integer
    
    // Get colors from both patterns
    vec3 groupHighlightColor = animateGroupHighlight(uv, pos, group_id);
    vec3 noseLinesColor = animateNoseLines(uv, pos, group_id);
    
    // The transition concept:
    // 1. Groups flash/pulse more intensely during first phase
    // 2. Lines start to form from nose toward each group
    // 3. Groups dim as their energy "drains" into the lines
    // 4. Lines fully form, groups fully dim, completing transition
    
    // Calculate transition timing:
    // Phase 1 (0.0-0.3): Intensify group highlights
    // Phase 2 (0.2-0.8): Lines gradually extend from nose
    // Phase 3 (0.5-1.0): Groups gradually dim
    
    // PHASE 1: Enhanced group highlight (0.0-0.3)
    float groupIntensity = 0.0;
    if (progress < 0.3) {
        // Get the base group highlight color
        groupIntensity = length(groupHighlightColor - u_base_color) / length(u_highlight_color - u_base_color);
        
        // Enhance the pulsing to make it more intense
        float phase1_progress = progress / 0.3;
        float pulse_rate = 2.0 + phase1_progress * 5.0; // Accelerate pulsing
        float enhanced_pulse = 0.5 + 0.5 * sin(u_time * pulse_rate + float(group) * 0.7);
        
        // Add enhanced pulsing to group intensity
        groupIntensity += enhanced_pulse * 0.3 * phase1_progress;
        groupIntensity = min(groupIntensity, 1.0); // Clamp to valid range
    }
    // PHASE 2+3: Continue with decreasing group intensity (0.3-1.0)
    else {
        // Calculate a dimming factor for the groups
        float dimming_start = 0.5;
        float dimming_factor = 1.0;
        
        if (progress > dimming_start) {
            // Gradually dim the groups as energy flows to lines
            dimming_factor = 1.0 - (progress - dimming_start) / (1.0 - dimming_start);
        }
        
        // Get the base group highlight color with dimming applied
        groupIntensity = length(groupHighlightColor - u_base_color) / length(u_highlight_color - u_base_color);
        groupIntensity *= dimming_factor;
    }
    
    // PHASE 2: Line formation from nose (0.2-0.8)
    float lineIntensity = 0.0;
    
    // Only for bars (not individual points)
    if (bar_id >= 0) {
        // Nose lines logic: each bar grows outward from the nose at a different speed
        if (progress > 0.2) {
            // Map 0.2-0.8 progress to 0.0-1.0 line formation phase
            float line_phase = (progress - 0.2) / 0.6;
            line_phase = clamp(line_phase, 0.0, 1.0);
            
            // Generate a unique speed for each bar based on its ID
            float bar_speed_factor = 0.5 + 0.8 * random(vec2(float(bar_id) / float(u_total_bars), 0.42));
            
            // Calculate the line expansion progress with unique speed
            float active_segment = line_phase * bar_speed_factor;
            active_segment = clamp(active_segment, 0.0, 1.0);
            
            // Check if this point's position along the bar is within the active segment
            if (bar_pos <= active_segment) {
                // This point should be lit
                // Brighter at the leading edge, dimmer at the base
                float edge_effect = smoothstep(active_segment - 0.1, active_segment, bar_pos);
                
                // Add brightness based on position along bar and distance from nose
                float position_brightness = 0.7 * edge_effect;
                
                // Base brightness stronger near the nose
                float base_brightness = 0.3 * (1.0 - bar_pos * 0.7);
                
                // Combined brightness with distance falloff
                lineIntensity += (position_brightness + base_brightness) * (1.0 - distance * 0.3);
                
                // Add energy transfer effect - brighter for recently activated segments
                float recent_activation = 1.0 - abs(active_segment - bar_pos - 0.05) / 0.1;
                recent_activation = max(0.0, recent_activation);
                
                // Energy transfer glow
                float transfer_glow = recent_activation * 0.4 * (1.0 - progress); // Fades as transition completes
                lineIntensity += transfer_glow;
            }
        }
    }
    
    // Combine the group and line effects
    float combinedIntensity = max(groupIntensity, lineIntensity);
    
    // Determine color based on which effect is dominant
    vec3 transitionColor;
    
    if (lineIntensity > groupIntensity) {
        // Line is dominant - use line color (brighter)
        transitionColor = mix(u_base_color, u_highlight_color, combinedIntensity);
        
        // Add slight color variation for the energy transfer
        if (progress < 0.8) {
            // Calculate a unique hue for each group
            float hue_shift = float(group) / float(u_num_groups);
            vec3 groupColor = vec3(
                0.9 + 0.1 * sin(hue_shift * 6.28),
                0.9 + 0.1 * sin(hue_shift * 6.28 + 2.1),
                0.9 + 0.1 * sin(hue_shift * 6.28 + 4.2)
            );
            
            // Mix in the group color during transfer
            float transfer_amount = (1.0 - progress / 0.8) * 0.3;
            transitionColor = mix(transitionColor, groupColor, transfer_amount);
        }
    } else {
        // Group is dominant - use group color
        // Use the actual color from groupHighlightColor instead of recalculating
        float normalizedGroupIntensity = combinedIntensity / max(0.001, groupIntensity);
        transitionColor = mix(u_base_color, groupHighlightColor, normalizedGroupIntensity);
    }
    
    // In the last 20% of the transition, blend directly with the final nose lines pattern
    if (progress > 0.8) {
        float final_blend = (progress - 0.8) / 0.2;
        transitionColor = mix(transitionColor, noseLinesColor, final_blend);
    }
    
    return transitionColor;
}

// Main transition dispatcher function
vec3 calculateTransition(vec2 uv, vec4 pos, float group_id, float progress) {
    // Check for specific pattern transitions with custom animations
    
    // Transition: Roaring (3) to Group Sequence (2)
    if (u_from_pattern == 3 && u_to_pattern == 2) {
        return roaringToGroupSequenceTransition(uv, pos, group_id, progress);
    }
    // Transition: Wave (0) to Glitter (4)
    else if (u_from_pattern == 0 && u_to_pattern == 4) {
        return waveToGlitterTransition(uv, pos, group_id, progress);
    }
    // Transition: Breathing (1) to Vertical Cascade (9)
    else if (u_from_pattern == 1 && u_to_pattern == 9) {
        return breathingToVerticalCascadeTransition(uv, pos, group_id, progress);
    }
    // Transition: Symmetrical Pulse (8) to Axis Ripple (11)
    else if (u_from_pattern == 8 && u_to_pattern == 11) {
        return symmetricalPulseToAxisRippleTransition(uv, pos, group_id, progress);
    }
    // Transition: Random Bars (6) to Bar Pattern (5)
    else if (u_from_pattern == 6 && u_to_pattern == 5) {
        return randomBarsToBarPatternTransition(uv, pos, group_id, progress);
    }
    // Transition: Group Highlight (13) to Nose Lines (12)
    else if (u_from_pattern == 13 && u_to_pattern == 12) {
        return groupHighlightToNoseLinesTransition(uv, pos, group_id, progress);
    }
    
    // Fallback: use default crossfade transition for any other combination
    return crossfadeTransition(uv, pos, group_id, progress);
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
    
    // Get the bar ID from the position map
    int bar_id = int(posData.z);
    
    // Sample the group information using the proper sampleGroupTexture function
    // to properly map from the 9x9 texture
    vec4 groupData = sampleGroupTexture(bar_id);
    // groupData contains:
    // R = BAR_ID (should match posData.z)
    // G = GROUP_NUMBER (integer group ID)
    
    // Get group ID from the texture (1-based indexing)
    float group_id = groupData.g;
    int group = int(group_id + 0.5); // Round to nearest integer
    
    // Calculate procedural animation color
    vec3 procColor;
    
    // NEW: Handle transitions if enabled
    if (u_enable_transition > 0) {
        procColor = calculateTransition(vUV.st, posData, group_id, u_transition_progress);
    }
    // Otherwise, use the standard pattern selection
    else {
        if (u_pattern == 0) {
            procColor = animateWave(vUV.st, posData, group_id);
        } else if (u_pattern == 1) {
            procColor = animateBreathing(vUV.st, posData, group_id);
        } else if (u_pattern == 2) {
            procColor = animateGroupSequence(vUV.st, posData, group_id);
        } else if (u_pattern == 3) {
            procColor = animateRoaring(vUV.st, posData, group_id);
        } else if (u_pattern == 4) {
            procColor = animateGlitter(vUV.st, posData, group_id);
        } else if (u_pattern == 5) {
            procColor = animateBarPattern(vUV.st, posData, group_id);
        } else if (u_pattern == 6) {
            procColor = animateRandomBars(vUV.st, posData, group_id);
        } else if (u_pattern == 7) {
            procColor = animateSingleBar(vUV.st, posData, group_id);
        } 
        // Add new animations (patterns 8-15)
        else if (u_pattern == 8) {
            procColor = animateSymmetricalPulse(vUV.st, posData, group_id);
        } else if (u_pattern == 9) {
            procColor = animateVerticalCascade(vUV.st, posData, group_id);
        } else if (u_pattern == 10) {
            procColor = animateSymmetricalChase(vUV.st, posData, group_id);
        } else if (u_pattern == 11) {
            procColor = animateAxisRipple(vUV.st, posData, group_id);
        } else if (u_pattern == 12) {
            procColor = animateNoseLines(vUV.st, posData, group_id);
        } else if (u_pattern == 13) {
            procColor = animateGroupHighlight(vUV.st, posData, group_id);
        } else if (u_pattern == 14) {
            procColor = debugGroupVisualization(vUV.st, posData, group_id);
        } else if (u_pattern == 15) {
            procColor = animateAnatomicalExpression(vUV.st, posData, group_id);
        } else {
            procColor = animateWave(vUV.st, posData, group_id);
        }
    }
    
    // Apply independent facial feature controls - NEW!
    
    // Eyes override
    if (u_eyes_override > 0 && group == EYES_GROUP) {
        procColor = animateEyes(vUV.st, posData, group_id);
    }
    
    // Teeth override
    if (u_teeth_override > 0 && group == TEETH_GROUP) {
        procColor = animateTeeth(vUV.st, posData, group_id);
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