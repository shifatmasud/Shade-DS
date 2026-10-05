#define GLSLIFY 1
uniform sampler2D u_screenPaintTexture;uniform sampler2D u_gradientTexture;uniform vec2 u_screenPaintTextureSize;uniform vec2 u_resolution;uniform float u_time;uniform float u_invertRatio;uniform sampler2D u_texture;varying vec2 v_uv;
#ifdef IS_EDGE
varying vec2 v_toNode;
#endif
#include <getBlueNoise>
#include <textureBicubic>
void main(){vec3 noise=getBlueNoise(gl_FragCoord.xy+vec2(38.,27.));vec2 screenPaintUv=gl_FragCoord.xy/u_resolution;vec4 screenPaintData=textureBicubic(u_screenPaintTexture,screenPaintUv,u_screenPaintTextureSize);float timeOffset=u_time;
#ifdef IS_EDGE
timeOffset+=3.1415926;
#endif
float d=cos((screenPaintUv.x+screenPaintUv.y)*4.+timeOffset)*0.5+0.5;float screenPaintStrength=1.;float constantStrength=0.;float alpha=1.0;
#ifdef IS_EDGE
vec2 toNode=v_toNode;float toNodeDist=length(toNode);alpha=smoothstep(1.0+fwidth(toNodeDist),1.0,toNodeDist);screenPaintStrength=4.;vec3 baseColor=vec3(0.004+d*d*0.15);constantStrength=max(0.,d*2.-1.)*0.15;
#else
vec3 baseColor=vec3(0.004+d*d*0.015);
#endif
float hue=(screenPaintData.x+screenPaintData.y)*1.5+d*2.;vec3 color=mix(baseColor,texture2D(u_gradientTexture,vec2(hue,0.0)).rgb,max(screenPaintData.z,screenPaintData.w)*screenPaintStrength+constantStrength)+noise.x*0.004;gl_FragColor=vec4(mix(color,1.-color,u_invertRatio),alpha);}