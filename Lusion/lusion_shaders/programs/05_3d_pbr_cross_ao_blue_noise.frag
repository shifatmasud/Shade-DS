#define GLSLIFY 1
uniform vec3 u_color0;uniform vec3 u_color1;uniform vec3 u_colorPaint;uniform float u_aspect;uniform vec2 u_smooth;uniform vec2 u_resolution;uniform float u_activeRatio;uniform sampler2D u_screenPaintTexture;varying vec2 v_uv;
#include <getBlueNoise>
void main(){vec3 noise=getBlueNoise(gl_FragCoord.xy);vec2 q=vec2(v_uv-0.5);q.x*=u_aspect;float dst=length(q);dst=smoothstep(u_smooth.x,u_smooth.y,dst);vec3 color=mix(u_color0,u_color1,0.925+0.075*dst);color+=noise*0.004;gl_FragColor.rgb=color;gl_FragColor.a=0.0;}