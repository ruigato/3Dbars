// ––––– Uniforms de controlo –––––
uniform float u_time;
uniform int   u_current_bar;
uniform int   u_highlight_mode;
uniform float u_brightness;
uniform int   u_color_mode;
uniform float u_pulse_speed;
uniform float u_anim_speed;
uniform int   u_total_bars;

// ––––– Modo de saída –––––
uniform int   u_display_mode;   // 0 = visualização gerada, 1 = textura remapeada

// ––––– Constante de píxeis por barra –––––
const int PIXELS_PER_BAR = 50;

// ––––– Funções auxiliares –––––
vec3 hsvToRgb(vec3 hsv) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(hsv.xxx + K.xyz) * 6.0 - K.www);
    return hsv.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), hsv.y);
}

vec3 getBarColor(int bar_id) {
    float n = float(bar_id) / float(u_total_bars);
    if (u_color_mode == 0) {
        return hsvToRgb(vec3(n, 0.8, 1.0));
    } else if (u_color_mode == 1) {
        return mix(vec3(0.0, 0.2, 0.0), vec3(1.0, 0.0, 0.0), n);
    } else {
        float gv = fract(n * 10.0);
        return hsvToRgb(vec3(gv, 0.7, 1.0));
    }
}

float getPulseEffect() {
    return 0.6 + 0.4 * sin(u_time * u_pulse_speed);
}

vec3 highlightBar(vec3 c) {
    return mix(c, vec3(1.0), getPulseEffect() * 0.7);
}

out vec4 fragColor;

void main() {
    // 1) lê só B e A do position map (input 0)
    vec4 posData = texture(sTD2DInputs[0], vUV.st);
    int   barID = int(posData.b);  // ID da barra (0…u_total_bars-1)
    float pct   = posData.a;       // [0→1], já reflecte inversão

    // 2) calcula cor gerada (o teu pipeline original)
    vec3 barColor = getBarColor(barID);
    barColor *= (0.8 + 0.2 * sin(pct * 6.28318));
    bool isCur = (barID == u_current_bar);
    if (u_highlight_mode == 0 && isCur) {
        barColor = highlightBar(barColor);
    } else if (u_highlight_mode == 1 && barID % 2 == 0) {
        barColor = highlightBar(barColor);
    } else if (u_highlight_mode == 2 && barID % 3 == 0) {
        barColor = highlightBar(barColor);
    }
    barColor *= (sin(u_time * u_anim_speed) * 0.1 + 0.9);
    barColor *= u_brightness;

    // 3) saída
    if (u_display_mode == 1) {
        // converte pct em índice de píxel [0…PIXELS_PER_BAR-1]
        int pixIdx = int(floor(pct * float(PIXELS_PER_BAR)));
        // mapeia para o centro do texel na textura de input
        vec2 remapUV = vec2(
            (float(pixIdx) + 0.5) / float(PIXELS_PER_BAR),
            (float(barID)  + 0.5) / float(u_total_bars)
        );
        vec3 texColor = texture(sTD2DInputs[1], remapUV).rgb;
        fragColor = vec4(texColor * u_brightness, 1.0);
    }
    else {
        fragColor = vec4(barColor, 1.0);
    }
}
