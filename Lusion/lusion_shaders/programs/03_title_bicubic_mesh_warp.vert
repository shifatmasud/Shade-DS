#define GLSLIFY 1
#ifdef IS_EDGE
attribute vec2 instancedPositionA;attribute vec2 instancedPositionB;varying vec2 v_toNode;uniform float u_radius;
#endif
uniform float u_scrollRatio;
#include <ufxVert>
varying vec2 v_uv;varying float v_ddd;float linearStep(float edge0,float edge1,float x){return clamp((x-edge0)/(edge1-edge0),0.0,1.0);}void main(){
#ifdef IS_EDGE
bool isTop=position.y>0.;vec3 pos=vec3(isTop ? instancedPositionA : instancedPositionB,0.0);
#else
vec3 pos=position;
#endif
float lineRatio=floor(pos.y*6.)/6.;pos*=1.5;pos.x-=linearStep(lineRatio*0.4,0.56+lineRatio*0.4,u_scrollRatio)*0.5;vec3 basePos=getBasePosition(pos);vec3 screenPos=getScreenPosition(basePos);
#ifdef IS_EDGE
vec2 vAB=(instancedPositionA-instancedPositionB)*u_domWH;float angle=atan(vAB.y,vAB.x)+3.1415926*0.5;float s=sin(angle);float c=cos(angle);mat2 m=mat2(c,-s,s,c);v_toNode=m*(position.xy*vec2(1.,step(0.5,abs(position.y))));screenPos.xy+=v_toNode*u_radius;
#endif
gl_Position=projectionMatrix*modelViewMatrix*vec4(screenPos,1.0);v_uv=padUv(uv*0.002);}