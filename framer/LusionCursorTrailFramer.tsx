/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 800
 * @framerIntrinsicHeight 500
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
import * as React from "react"
import { motion } from "framer-motion"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

// @ts-ignore
import * as THREE from "https://esm.sh/three@0.183.2"

// ============================================================================
// Reverse-Engineered Shaders from Lusion.co (ScreenPaint & Dispersion)
// ============================================================================

const SIMULATION_VERTEX_SHADER = /* glsl */ `
varying vec2 v_uv;
void main() {
    v_uv = uv;
    gl_Position = vec4(position, 1.0);
}
`

const SIMULATION_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D u_lowPaintTexture;
uniform sampler2D u_prevPaintTexture;
uniform vec2 u_paintTexelSize;
uniform vec2 u_scrollOffset;
uniform vec4 u_drawFrom;
uniform vec4 u_drawTo;
uniform float u_pushStrength;
uniform vec3 u_dissipations;
uniform vec2 u_vel;
uniform float u_curlScale;
uniform float u_curlStrength;
uniform float u_useNoise;

varying vec2 v_uv;

vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
    return vec2(length(pa - ba * h), h);
}

vec2 hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}

vec3 noised(in vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    vec2 ga = hash(i + vec2(0.0, 0.0));
    vec2 gb = hash(i + vec2(1.0, 0.0));
    vec2 gc = hash(i + vec2(0.0, 1.0));
    vec2 gd = hash(i + vec2(1.0, 1.0));
    float va = dot(ga, f - vec2(0.0, 0.0));
    float vb = dot(gb, f - vec2(1.0, 0.0));
    float vc = dot(gc, f - vec2(0.0, 1.0));
    float vd = dot(gd, f - vec2(1.0, 1.0));
    return vec3(
        va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd),
        ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va)
    );
}

void main() {
    vec2 res = sdSegment(gl_FragCoord.xy, u_drawFrom.xy, u_drawTo.xy);
    vec2 radiusWeight = mix(u_drawFrom.zw, u_drawTo.zw, res.y);
    float d = 1.0 - smoothstep(-0.01, max(radiusWeight.x, 1.0), res.x);

    vec4 lowData = texture2D(u_lowPaintTexture, v_uv - u_scrollOffset);
    vec2 velInv = (0.5 - lowData.xy) * u_pushStrength;

    if (u_useNoise > 0.5) {
        vec3 noise3 = noised(gl_FragCoord.xy * u_curlScale * (1.0 - lowData.xy));
        vec2 noise = noised(gl_FragCoord.xy * u_curlScale * (2.0 - lowData.xy * (0.5 + noise3.x) + noise3.yz * 0.1)).yz;
        velInv += noise * (lowData.z + lowData.w) * u_curlStrength;
    }

    vec4 data = texture2D(u_prevPaintTexture, v_uv - u_scrollOffset + velInv * u_paintTexelSize);
    data.xy -= 0.5;

    vec4 delta = (u_dissipations.xxyz - 1.0) * data;
    vec2 newVel = u_vel * d;
    delta += vec4(newVel, radiusWeight.yy * d);
    delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));

    data += delta;
    data.xy += 0.5;
    gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
}
`

const COMPOSITOR_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

uniform sampler2D u_texture;
uniform sampler2D u_screenPaintTexture;
uniform vec2 u_screenPaintTexelSize;
uniform float u_amount;
uniform float u_rgbShift;
uniform float u_multiplier;
uniform float u_colorMultiplier;
uniform float u_shade;
uniform float u_time;

varying vec2 v_uv;

vec3 getProceduralNoise(vec2 coord) {
    float n1 = fract(sin(dot(coord, vec2(12.9898, 78.233))) * 43758.5453);
    float n2 = fract(sin(dot(coord + vec2(37.1, 92.7), vec2(26.419, 54.671))) * 38241.1234);
    float n3 = fract(sin(dot(coord + vec2(81.3, 19.4), vec2(73.156, 19.823))) * 51928.9876);
    return vec3(n1, n2, n3);
}

void main() {
    vec3 bnoise = getProceduralNoise(gl_FragCoord.xy + vec2(17.0, 29.0));
    vec4 data = texture2D(u_screenPaintTexture, v_uv);

    float weight = (data.z + data.w) * 0.5;
    vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;

    vec4 color = vec4(0.0);
    vec2 velocity = vel * u_amount / 4.0 * u_screenPaintTexelSize * u_multiplier;
    vec2 uv = v_uv + bnoise.xy * velocity;

    for (int i = 0; i < 9; i++) {
        color += texture2D(u_texture, uv);
        uv += velocity;
    }
    color /= 9.0;

    vec3 iridescence = sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * u_rgbShift);
    color.rgb += iridescence * smoothstep(0.4, -0.9, weight) * u_shade * max(abs(vel.x), abs(vel.y)) * u_colorMultiplier;

    gl_FragColor = color;
}
`

const SCENE_BACKDROP_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
varying vec2 v_uv;

void main() {
    vec2 st = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 baseColor = vec3(0.06, 0.06, 0.07);
    
    vec2 grid = abs(fract(st * 4.0 - 0.5) - 0.5) / fwidth(st * 4.0);
    float line = min(grid.x, grid.y);
    float c = 1.0 - min(line, 1.0);
    baseColor += vec3(c * 0.035);
    
    float dist = length(st);
    baseColor += mix(vec3(0.04, 0.06, 0.12), vec3(0.0), smoothstep(0.0, 1.4, dist));
    
    float ring = abs(length(st) - 0.45);
    baseColor += vec3(0.1, 0.15, 0.25) * smoothstep(0.03, 0.0, ring);
    
    gl_FragColor = vec4(baseColor, 1.0);
}
`

export interface Props {
    pushStrength?: number
    curlStrength?: number
    rgbShift?: number
    velocityDissipation?: number
    colorMultiplier?: number
    useNoise?: boolean
    interactiveControls?: boolean
    style?: React.CSSProperties
}

export default function LusionCursorTrail(props: Props) {
    const {
        pushStrength: propPush = 25,
        curlStrength: propCurl = 5.0,
        rgbShift: propRgb = 1.5,
        velocityDissipation: propDiss = 0.985,
        colorMultiplier: propColor = 1.8,
        useNoise: propNoise = true,
        interactiveControls = true,
        style,
    } = props

    const mountRef = React.useRef<HTMLDivElement>(null)

    const [pushStrength, setPushStrength] = React.useState(propPush)
    const [curlStrength, setCurlStrength] = React.useState(propCurl)
    const [rgbShift, setRgbShift] = React.useState(propRgb)
    const [velocityDissipation, setVelocityDissipation] = React.useState(propDiss)
    const [colorMultiplier, setColorMultiplier] = React.useState(propColor)
    const [useNoise, setUseNoise] = React.useState(propNoise)

    React.useEffect(() => setPushStrength(propPush), [propPush])
    React.useEffect(() => setCurlStrength(propCurl), [propCurl])
    React.useEffect(() => setRgbShift(propRgb), [propRgb])
    React.useEffect(() => setVelocityDissipation(propDiss), [propDiss])
    React.useEffect(() => setColorMultiplier(propColor), [propColor])
    React.useEffect(() => setUseNoise(propNoise), [propNoise])

    const [isClient, setIsClient] = React.useState(false)
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    React.useEffect(() => {
        if (!isClient) return
        const container = mountRef.current
        if (!container) return

        let width = container.clientWidth || 800
        let height = container.clientHeight || 500

        let renderer: any
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
            renderer.setSize(width, height)
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
            container.appendChild(renderer.domElement)
        } catch (e) {
            console.warn("[LusionCursorTrail] WebGL initialization fallback:", e)
            return
        }

        const simW = Math.max(width >> 2, 64)
        const simH = Math.max(height >> 2, 64)

        const fboOptions = {
            type: THREE.HalfFloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            format: THREE.RGBAFormat,
        }

        let rtCurr = new THREE.WebGLRenderTarget(simW, simH, fboOptions)
        let rtPrev = new THREE.WebGLRenderTarget(simW, simH, fboOptions)
        const rtLow = new THREE.WebGLRenderTarget(Math.max(simW >> 1, 32), Math.max(simH >> 1, 32), fboOptions)
        const rtScene = new THREE.WebGLRenderTarget(width, height, fboOptions)

        const quadGeo = new THREE.PlaneGeometry(2, 2)
        const orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

        const backdropMat = new THREE.ShaderMaterial({
            vertexShader: SIMULATION_VERTEX_SHADER,
            fragmentShader: SCENE_BACKDROP_FRAGMENT_SHADER,
            uniforms: {
                u_resolution: { value: new THREE.Vector2(width, height) },
                u_time: { value: 0 },
            },
        })
        const backdropMesh = new THREE.Mesh(quadGeo, backdropMat)
        const backdropScene = new THREE.Scene()
        backdropScene.add(backdropMesh)

        const fromDraw = new THREE.Vector4(0, 0, 0, 0)
        const toDraw = new THREE.Vector4(0, 0, 0, 0)
        const simMat = new THREE.ShaderMaterial({
            vertexShader: SIMULATION_VERTEX_SHADER,
            fragmentShader: SIMULATION_FRAGMENT_SHADER,
            uniforms: {
                u_lowPaintTexture: { value: rtLow.texture },
                u_prevPaintTexture: { value: rtPrev.texture },
                u_paintTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
                u_scrollOffset: { value: new THREE.Vector2(0, 0) },
                u_drawFrom: { value: fromDraw },
                u_drawTo: { value: toDraw },
                u_pushStrength: { value: pushStrength },
                u_curlScale: { value: 0.08 },
                u_curlStrength: { value: curlStrength },
                u_useNoise: { value: useNoise ? 1.0 : 0.0 },
                u_vel: { value: new THREE.Vector2(0, 0) },
                u_dissipations: { value: new THREE.Vector3(velocityDissipation, 0.985, 0.5) },
            },
        })
        const simMesh = new THREE.Mesh(quadGeo, simMat)
        const simScene = new THREE.Scene()
        simScene.add(simMesh)

        const compMat = new THREE.ShaderMaterial({
            vertexShader: SIMULATION_VERTEX_SHADER,
            fragmentShader: COMPOSITOR_FRAGMENT_SHADER,
            uniforms: {
                u_texture: { value: rtScene.texture },
                u_screenPaintTexture: { value: rtCurr.texture },
                u_screenPaintTexelSize: { value: new THREE.Vector2(1 / simW, 1 / simH) },
                u_amount: { value: 3.5 },
                u_rgbShift: { value: rgbShift },
                u_multiplier: { value: 1.2 },
                u_colorMultiplier: { value: colorMultiplier },
                u_shade: { value: 2.5 },
                u_time: { value: 0 },
            },
        })
        const compMesh = new THREE.Mesh(quadGeo, compMat)
        const compScene = new THREE.Scene()
        compScene.add(compMesh)

        renderer.setClearColor(new THREE.Color(0.5, 0.5, 0.0), 0)
        renderer.setRenderTarget(rtCurr)
        renderer.clear()
        renderer.setRenderTarget(rtPrev)
        renderer.clear()
        renderer.setRenderTarget(null)

        let prevMouseX = width / 2
        let prevMouseY = height / 2
        let currMouseX = width / 2
        let currMouseY = height / 2
        let isMoving = false
        let lastMoveTime = performance.now()

        const handlePointerMove = (e: MouseEvent | TouchEvent) => {
            const rect = container.getBoundingClientRect()
            const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX
            const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY

            prevMouseX = currMouseX
            prevMouseY = currMouseY
            currMouseX = clientX - rect.left
            currMouseY = rect.height - (clientY - rect.top)

            isMoving = true
            lastMoveTime = performance.now()
        }

        window.addEventListener("mousemove", handlePointerMove)
        window.addEventListener("touchmove", handlePointerMove)

        let animId: number
        let startTime = performance.now()

        const animate = () => {
            animId = requestAnimationFrame(animate)

            const now = performance.now()
            const elapsed = (now - startTime) * 0.001
            backdropMat.uniforms.u_time.value = elapsed
            compMat.uniforms.u_time.value = elapsed

            simMat.uniforms.u_pushStrength.value = pushStrength
            simMat.uniforms.u_curlStrength.value = curlStrength
            simMat.uniforms.u_useNoise.value = useNoise ? 1.0 : 0.0
            simMat.uniforms.u_dissipations.value.x = velocityDissipation
            compMat.uniforms.u_rgbShift.value = rgbShift
            compMat.uniforms.u_colorMultiplier.value = colorMultiplier

            const temp = rtPrev
            rtPrev = rtCurr
            rtCurr = temp

            simMat.uniforms.u_prevPaintTexture.value = rtPrev.texture
            compMat.uniforms.u_screenPaintTexture.value = rtCurr.texture

            const dx = (currMouseX - prevMouseX) / (width || 1)
            const dy = (currMouseY - prevMouseY) / (height || 1)
            const dist = Math.sqrt(dx * dx + dy * dy)

            fromDraw.copy(toDraw)
            const radius = isMoving ? Math.min(Math.max(dist * 250.0, 8.0), 38.0) : 0
            toDraw.set(
                (currMouseX / width) * simW,
                (currMouseY / height) * simH,
                radius,
                isMoving ? 1.0 : 0.0
            )

            simMat.uniforms.u_vel.value.set(dx * 4.0, dy * 4.0)

            renderer.setRenderTarget(rtScene)
            renderer.render(backdropScene, orthoCam)

            renderer.setRenderTarget(rtCurr)
            renderer.render(simScene, orthoCam)

            renderer.setRenderTarget(rtLow)
            renderer.render(simScene, orthoCam)

            renderer.setRenderTarget(null)
            renderer.render(compScene, orthoCam)

            if (now - lastMoveTime > 100) {
                isMoving = false
            }
        }

        animate()

        const handleResize = () => {
            if (!container) return
            width = container.clientWidth
            height = container.clientHeight
            renderer.setSize(width, height)
            backdropMat.uniforms.u_resolution.value.set(width, height)
            rtScene.setSize(width, height)
        }

        window.addEventListener("resize", handleResize)

        return () => {
            cancelAnimationFrame(animId)
            window.removeEventListener("mousemove", handlePointerMove)
            window.removeEventListener("touchmove", handlePointerMove)
            window.removeEventListener("resize", handleResize)
            renderer.dispose()
            rtCurr.dispose()
            rtPrev.dispose()
            rtLow.dispose()
            rtScene.dispose()
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement)
            }
        }
    }, [isClient, pushStrength, curlStrength, rgbShift, velocityDissipation, colorMultiplier, useNoise])

    const containerStyle: React.CSSProperties = {
        width: "100%",
        minHeight: "520px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0c0d0e",
        color: "#ffffff",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
        border: "1px solid #282a30",
        ...style,
    }

    const headerStyle: React.CSSProperties = {
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: "1px solid #282a30",
        backgroundColor: "#16171a",
    }

    const badgeStyle: React.CSSProperties = {
        fontSize: "11px",
        padding: "4px 8px",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
    }

    return (
        <motion.div layout style={containerStyle}>
            <div style={headerStyle}>
                <div>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>Lusion Cursor Trail</h3>
                    <span style={{ fontSize: "12px", color: "#888888" }}>
                        ScreenPaint GPGPU Fluid Advection + 9-Tap Motion Blur
                    </span>
                </div>
                <span style={badgeStyle}>Framer Component</span>
            </div>

            <div ref={mountRef} style={{ flex: 1, minHeight: "380px", position: "relative", cursor: "crosshair" }}>
                <div style={{
                    position: "absolute",
                    bottom: "16px",
                    left: "20px",
                    pointerEvents: "none",
                    padding: "8px 12px",
                    backgroundColor: "rgba(0, 0, 0, 0.75)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "#FFFFFF",
                }}>
                    ✨ Drag / move cursor across canvas to stimulate fluid trail & iridescent refraction
                </div>
            </div>

            {interactiveControls && (
                <div style={{
                    padding: "16px 20px",
                    backgroundColor: "#16171a",
                    borderTop: "1px solid #282a30",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "14px",
                }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "12px", color: "#888888", display: "flex", justifyContent: "space-between" }}>
                            <span>Push Strength</span>
                            <span>{pushStrength}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="60"
                            step="1"
                            value={pushStrength}
                            onChange={(e) => setPushStrength(Number(e.target.value))}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "12px", color: "#888888", display: "flex", justifyContent: "space-between" }}>
                            <span>Curl Turbulence</span>
                            <span>{curlStrength.toFixed(1)}</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="15"
                            step="0.5"
                            value={curlStrength}
                            onChange={(e) => setCurlStrength(Number(e.target.value))}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "12px", color: "#888888", display: "flex", justifyContent: "space-between" }}>
                            <span>RGB Shift</span>
                            <span>{rgbShift.toFixed(2)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.1"
                            max="4.0"
                            step="0.1"
                            value={rgbShift}
                            onChange={(e) => setRgbShift(Number(e.target.value))}
                        />
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ fontSize: "12px", color: "#888888", display: "flex", justifyContent: "space-between" }}>
                            <span>Dissipation</span>
                            <span>{velocityDissipation.toFixed(3)}</span>
                        </div>
                        <input
                            type="range"
                            min="0.900"
                            max="0.995"
                            step="0.005"
                            value={velocityDissipation}
                            onChange={(e) => setVelocityDissipation(Number(e.target.value))}
                        />
                    </div>
                </div>
            )}
        </motion.div>
    )
}

addPropertyControls(LusionCursorTrail, {
    pushStrength: {
        type: ControlType.Number,
        title: "Push Strength",
        min: 0,
        max: 60,
        step: 1,
        defaultValue: 25,
    },
    curlStrength: {
        type: ControlType.Number,
        title: "Curl Turbulence",
        min: 0,
        max: 15,
        step: 0.5,
        defaultValue: 5.0,
    },
    rgbShift: {
        type: ControlType.Number,
        title: "RGB Shift",
        min: 0.1,
        max: 4.0,
        step: 0.1,
        defaultValue: 1.5,
    },
    velocityDissipation: {
        type: ControlType.Number,
        title: "Dissipation",
        min: 0.9,
        max: 0.995,
        step: 0.005,
        defaultValue: 0.985,
    },
    colorMultiplier: {
        type: ControlType.Number,
        title: "Iridescence",
        min: 0.5,
        max: 4.0,
        step: 0.1,
        defaultValue: 1.8,
    },
    useNoise: {
        type: ControlType.Boolean,
        title: "Curl Noise",
        defaultValue: true,
    },
    interactiveControls: {
        type: ControlType.Boolean,
        title: "Show Sliders",
        defaultValue: true,
    },
})
