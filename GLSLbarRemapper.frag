// LED Bar Remapper Visualizer Shader - For Integer Bar IDs

uniform float u_time;         // Current time
uniform int u_current_bar;    // Currently selected bar index (1-69)
uniform int u_highlight_mode; // 0=bar index, 1=remapped bars, 2=inverted bars
uniform float u_brightness;   // Overall brightness adjustment (0.0-1.0)
uniform int u_color_mode;     // 0=rainbow, 1=sequential, 2=group-based
uniform float u_pulse_speed;  // Speed of pulsing effect for highlighted bars
uniform float u_anim_speed;   // Speed of color animation
uniform int u_total_bars;     // Total number of bars (default: 69)

// Color palette functions
vec3 hsvToRgb(vec3 hsv) {
    // Convert HSV to RGB
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

// Generate a color based on bar index
vec3 getBarColor(int bar_id) {
    // Normalize bar_id to 0-1 range
    float normalized_id = float(bar_id) / float(u_total_bars);
    
    if (u_color_mode == 0) {
        // Rainbow mode - each bar gets a unique hue
        return hsvToRgb(vec3(normalized_id, 0.8, 1.0));
    }
    else if (u_color_mode == 1) {
        // Sequential mode - gradient from blue to red
        return mix(vec3(0.0, 0.2, 0.0), vec3(0.0, 0.2, 0.0), normalized_id);
    }
    else if (u_color_mode == 2) {
        // Group-based - similar bars in similar colors
        float group_value = fract(normalized_id * 10.0); // Cycle colors every 0.1 range
        return hsvToRgb(vec3(group_value, 0.7, 1.0));
    }
    
    // Default fallback
    return hsvToRgb(vec3(normalized_id, 0.8, 1.0));
}

// Get a pulse effect for highlighting
float getPulseEffect() {
    return 0.6 + 0.4 * sin(u_time * u_pulse_speed);
}

// Highlight effect for current bar
vec3 highlightBar(vec3 baseColor) {
    float pulse = getPulseEffect();
    
    // Brighten and slightly shift color to white
    return mix(baseColor, vec3(1.0), pulse * 0.7);
}

// Main shader function
out vec4 fragColor;

void main() {
    // Sample the position map at this pixel
    vec4 posData = texture(sTD2DInputs[0], vUV.st);
    
    // Extract the actual bar ID from the blue channel
    // This now contains the actual integer value, not a normalized value
    int bar_id = int(posData.b);
    float position_along_bar = posData.a;
    
    // Debug output - uncomment to show bar IDs as grayscale
    // fragColor = vec4(vec3(float(bar_id) / 69.0), 1.0);
    // return;
    
    // Get base color for this bar using the integer bar ID
    vec3 barColor = getBarColor(bar_id);
    
    // Apply slight variation based on position along bar for better visibility
    float position_effect = 0.8 + 0.2 * sin(position_along_bar * 3.14159 * 2.0);
    barColor *= position_effect;
    
    // Simple exact comparison with integers
    bool is_current_bar = (bar_id == u_current_bar);
    
    // Determine highlight status based on highlight mode
    if (u_highlight_mode == 0) {
        // Highlight only current bar
        if (is_current_bar) {
            barColor = highlightBar(barColor);
        }
    }
    else if (u_highlight_mode == 1) {
        // Highlight remapped bars (this would need remapping info)
        // For now, we'll just highlight even-numbered bars as an example
        if (bar_id % 2 == 0) {
            barColor = highlightBar(barColor);
        }
    }
    else if (u_highlight_mode == 2) {
        // Highlight inverted bars (this would need inversion info)
        // For now, we'll highlight bars with IDs divisible by 3 as an example
        if (bar_id % 3 == 0) {
            barColor = highlightBar(barColor);
        }
    }
    
    // Add subtle animation based on time
    float time_effect = sin(u_time * u_anim_speed) * 0.1 + 0.9;
    barColor *= time_effect;
    
    // Adjust overall brightness
    barColor *= u_brightness;
    
    // Output final color
    fragColor = vec4(barColor, 1.0);
}