// textmode.js 0.18.0 source conversion contract: palette RG encodes atlas glyph coordinates.
// Luminance controls glyph choice; original RGB controls ink independently.
export const labFragment = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_image;
uniform sampler2D u_charPaletteTexture;
uniform ivec2 u_charPaletteDimensions;
uniform int u_charCount;
uniform float u_contrast;
uniform float u_gamma;
uniform int u_colorMode;
layout(location=0) out vec4 o_character;
layout(location=1) out vec4 o_primaryColor;
layout(location=2) out vec4 o_secondaryColor;
layout(location=3) out vec4 o_statePayload;

vec3 limitedInk(vec3 rgb) {
  const vec3 palette[12] = vec3[12](
    vec3(0.91,0.90,0.86), vec3(0.60,0.65,0.60), vec3(0.35,0.42,0.40),
    vec3(0.78,0.86,0.58), vec3(0.37,0.60,0.46), vec3(0.36,0.69,0.70),
    vec3(0.36,0.48,0.73), vec3(0.67,0.57,0.77), vec3(0.83,0.57,0.57),
    vec3(0.84,0.43,0.27), vec3(0.79,0.63,0.35), vec3(0.57,0.43,0.30));
  float nearest = 100.0;
  vec3 ink = palette[0];
  for (int i=0; i<12; i++) {
    vec3 d = rgb - palette[i];
    float distance = dot(d*d, vec3(0.2126,0.7152,0.0722));
    if (distance < nearest) { nearest = distance; ink = palette[i]; }
  }
  return ink;
}
void main() {
  vec4 sampleColor = texture(u_image, vec2(v_uv.x, 1.0-v_uv.y));
  if (sampleColor.a < 0.01) discard;
  float luminance = dot(sampleColor.rgb, vec3(0.2126,0.7152,0.0722));
  float tone = pow(clamp((luminance-128.0/255.0)*u_contrast+128.0/255.0,0.0,1.0), 1.0/u_gamma);
  int index = int(floor(tone * float(max(u_charCount-1,0))+0.5));
  int columns = max(u_charPaletteDimensions.x,1);
  vec2 glyph = texelFetch(u_charPaletteTexture, ivec2(index%columns,index/columns),0).rg;
  vec3 ink = vec3(231.0,229.0,220.0)/255.0;
  if (u_colorMode == 1) ink = sampleColor.rgb;
  if (u_colorMode == 2) ink = limitedInk(sampleColor.rgb);
  o_character = vec4(glyph,0.0,0.0);
  o_primaryColor = vec4(ink,1.0);
  o_secondaryColor = vec4(vec3(17.0,19.0,16.0)/255.0,1.0);
  o_statePayload = vec4(0.0);
}
`;
