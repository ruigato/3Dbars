// LED Lion Animation Shader - Updated with Group Texture Input and New Patterns

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
uniform int u_num_groups;     // Number of groups (default: 7)
uniform vec3 u_base_color;    // Base color (default green)
uniform vec3 u_highlight_color; // Highlight color (default white)
uniform int u_active_group;   // Group to highlight (manual override for group sequence)

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
    float delay = distance * 0.3;
    float offset_phase = (sin(u_time * 0.02 - delay) + 1.0) / 2.0;
    
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
    vec2 u = f * f * (3.0 - 2.0 * f);
    
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
        float pulse = 0.5 + 0.5 * sin(u_time * 0.1 * u_wave_speed);
        
        // Increase intensity for smoother transition to highlight color
        float intensity = pulse * pulse;
        
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
    float pulse_rate = 0.05 * u_wave_speed;
    float t = u_time * pulse_rate;
    
    // Create multiple pulse zones based on angle
    // This divides the model into angular zones (number of zones can be adjusted)
    const float NUM_ZONES = 4.0;
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
    float cascade_width = 0.3;  // Width of the cascade effect
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
        float glow = 0.4 * (1.0 - trail_intensity);
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
    float chase_width = 0.15;
    
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
        intensity += burst * 0.7;  // Add to existing intensity
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
    const int NUM_RIPPLES = 5;
    float intensity = 0.05;  // Base intensity
    
    for (int i = 0; i < NUM_RIPPLES; i++) {
        // Stagger ripple start times
        float ripple_offset = float(i) / float(NUM_RIPPLES);
        float ripple_phase = mod(ripple_time + ripple_offset, 1.0);
        
        // Ripple grows from center to edge
        float ripple_size = ripple_phase * 1.2;  // Max size slightly larger than 1.0
        
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
        float bar_speed_factor = 0.5 + 0.8 * random(vec2(float(bar_id) / float(u_total_bars), 0.42));
        
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
    float group_cycle_time = 5.0; // seconds to cycle through all groups
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
        if (bar_id == 0) color = vec3(1.0, 0.0, 0.0); // Red
        else if (bar_id == 1) color = vec3(0.0, 1.0, 0.0); // Green
        else if (bar_id == 2) color = vec3(0.0, 0.0, 1.0); // Blue
        else if (bar_id == 3) color = vec3(1.0, 1.0, 0.0); // Yellow
        else if (bar_id == 4) color = vec3(1.0, 0.0, 1.0); // Magenta
        else if (bar_id == 5) color = vec3(0.0, 1.0, 1.0); // Cyan
        else if (bar_id == 6) color = vec3(1.0, 0.5, 0.0); // Orange
        else if (bar_id == 7) color = vec3(0.5, 0.0, 1.0); // Purple
        else if (bar_id == 8) color = vec3(0.5, 1.0, 0.5); // Lime
        else if (bar_id == 9) color = vec3(1.0, 0.5, 0.5); // Pink
    } else {
        // For other bars, create colors based on bar ID
        float normalized_bar_id = float(bar_id) / float(u_total_bars);
        color = vec3(
            fract(normalized_bar_id * 3.07),
            fract(normalized_bar_id * 5.13),
            fract(normalized_bar_id * 7.19)
        );
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
    
    // Define the group IDs for each facial feature
    // These should match your actual group assignments
    const int EYES_GROUP = 2;        // Group for eyes
    const int EYEBROWS_GROUP = 4;    // Group for eyebrows/brows
    const int NOSE_GROUP = 1;        // Group for nose
    const int TEETH_GROUP = 3;       // Group for teeth/mouth
    const int MANE_GROUP = 7;        // Group for mane
    const int CHEEKS_GROUP = 6;      // Group for cheeks
    const int EARS_GROUP = 5;        // Group for ears
    
    // Base color for inactive parts (dim)
    vec3 baseColor = u_base_color * 0.15;
    
    // Animation cycle time in seconds (how long the full expression takes)
    float cycle_duration = 20.0;
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
    float teeth_intensity = 0.0;
    float mane_intensity = 0.0;
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

out vec4 fragColor;

void main() {
    // Sample the position map at this pixel
    vec4 posData = texture(sTD2DInputs[0], vUV.st);
    // posData now contains:
    // R (x) = normalized angle
    // G (y) = normalized distance
    // B (z) = integer bar ID (not normalized)
    // A (w) = position along bar (0-1)
    
    // Sample the group information from the third input 
    vec4 groupData = texture(sTD2DInputs[2], vUV.st);
    // groupData contains:
    // R = BAR_ID (should match posData.z)
    // G = GROUP_NUMBER (integer group ID)
    
    // Get group ID from the new texture
    float group_id = groupData.g;
    
    // Calculate procedural animation color
    vec3 procColor;
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