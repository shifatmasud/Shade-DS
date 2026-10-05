/**
 * @framerDisableUnlink
 * @framerIntrinsicWidth 340
 * @framerIntrinsicHeight 380
 */
import * as React from "react"
import { ControlType, addPropertyControls } from "framer"
import { animate } from "framer-motion"

// @ts-ignore
import * as THREE from "https://esm.sh/three@0.186.0"
// @ts-ignore
import { RoundedBoxGeometry } from "https://esm.sh/three@0.186.0/addons/geometries/RoundedBoxGeometry.js"
// @ts-ignore
import { installHtmlInCanvasPolyfill } from "https://esm.sh/three-html-render@0.1.2"

type Props = {
    target?: string
    width?: number | string
    height?: number | string
    depth?: number | string
    radius?: number | string
    segments?: number | string
    rotationX?: number | string
    rotationY?: number | string
    rotationZ?: number | string
    scale?: number | string
    background?: string
    metalness?: number | string
    roughness?: number | string
    transition?: any
    style?: React.CSSProperties
}

export default function HTMLTexture3D(props: Props) {
    const {
        target = "Card",
        width = 340,
        height = 380,
        depth = 45,
        radius = 20,
        segments = 6,
        rotationX = 12,
        rotationY = 28,
        rotationZ = -4,
        scale = 1,
        background = "transparent",
        metalness = 0.3,
        roughness = 0.2,
        transition = {
            type: "spring",
            duration: 0.8,
            bounce: 0.2,
        },
        style,
    } = props

    // Hydration guard: prevent SSR layout mismatch / Error #419 on published sites
    const [isClient, setIsClient] = React.useState(false)
    React.useEffect(() => {
        setIsClient(true)
    }, [])

    const containerRef = React.useRef<HTMLDivElement>(null)
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!isClient || !containerRef.current) return
        let disposed = false
        const container = containerRef.current

        // 1. Safely install HTML-in-Canvas polyfill on client
        try {
            installHtmlInCanvasPolyfill({ force: true })
        } catch (e: any) {
            console.warn("[HTMLTexture3D] Polyfill init:", e)
        }

        // Helper to locate target element in Framer DOM
        const findTarget = (): HTMLElement | null => {
            if (!target) return null
            try {
                return (
                    document.querySelector<HTMLElement>(`[data-framer-name="${CSS.escape(target)}"]`) ||
                    document.querySelector<HTMLElement>(`[data-framer-name="${target}"]`) ||
                    document.querySelector<HTMLElement>(target) ||
                    document.getElementById(target)
                )
            } catch {
                return document.querySelector<HTMLElement>(`[data-framer-name="${target}"]`)
            }
        }

        let animHandle: any = null
        let rafHandle: number | null = null
        let resizeObs: ResizeObserver | null = null
        let mutObs: MutationObserver | null = null
        let cloneNode: HTMLElement | null = null

        const initScene = (targetEl: HTMLElement) => {
            if (disposed) return

            try {
                // 2. Setup Canvas with WICG layoutsubtree attribute
                const canvas = document.createElement("canvas")
                canvas.setAttribute("layoutsubtree", "true")
                canvas.style.width = "100%"
                canvas.style.height = "100%"
                canvas.style.display = "block"
                container.innerHTML = ""
                container.appendChild(canvas)

                // 3. Measure target element & resolve dimension sanitization
                const compStyle = window.getComputedStyle(targetEl)
                const measuredW = targetEl.offsetWidth || parseFloat(compStyle.width) || 340
                const measuredH = targetEl.offsetHeight || parseFloat(compStyle.height) || 380

                // Strict sanitization: ensure no strings, percentages or NaNs enter Three.js geometry
                const parseDimension = (val: any, fallback: number): number => {
                    if (typeof val === "number" && Number.isFinite(val) && val > 0) return val
                    if (typeof val === "string") {
                        if (val.includes("%")) return fallback // If Framer passed "100%", use measured pixel size
                        const parsed = parseFloat(val)
                        if (Number.isFinite(parsed) && parsed > 0) return parsed
                    }
                    return fallback
                }

                const geomW = parseDimension(width, measuredW)
                const geomH = parseDimension(height, measuredH)
                const geomD = parseDimension(depth, 45)
                const rawRadius = parseDimension(radius, 20)
                const geomRadius = Math.max(0, Math.min(rawRadius, geomW / 2, geomH / 2, geomD / 2))
                const geomSegments = Math.max(1, Math.min(20, Math.round(parseDimension(segments, 6))))

                const numRotX = Number.isFinite(Number(rotationX)) ? Number(rotationX) : 12
                const numRotY = Number.isFinite(Number(rotationY)) ? Number(rotationY) : 28
                const numRotZ = Number.isFinite(Number(rotationZ)) ? Number(rotationZ) : -4
                const numScale = Number.isFinite(Number(scale)) && Number(scale) > 0 ? Number(scale) : 1
                const numMetalness = Number.isFinite(Number(metalness)) ? Math.max(0, Math.min(1, Number(metalness))) : 0.3
                const numRoughness = Number.isFinite(Number(roughness)) ? Math.max(0, Math.min(1, Number(roughness))) : 0.2

                // 4. Clone target element to serve as canvas child texture source
                cloneNode = targetEl.cloneNode(true) as HTMLElement
                cloneNode.removeAttribute("id")
                cloneNode.style.position = "absolute"
                cloneNode.style.left = "0"
                cloneNode.style.top = "0"
                cloneNode.style.margin = "0"
                cloneNode.style.pointerEvents = "none"
                cloneNode.style.width = `${measuredW}px`
                cloneNode.style.height = `${measuredH}px`

                // Prune any nested canvases or self-references to prevent circular SVG foreignObject rendering
                cloneNode.querySelectorAll("canvas").forEach((c) => c.remove())
                if (container.id) {
                    const nestedContainer = cloneNode.querySelector(`#${container.id}`)
                    if (nestedContainer) nestedContainer.remove()
                }

                // Collect ancestor classes so scoped Framer CSS rules (.framer-rKmX8 .framer-1up1sfh, etc.)
                // match inside the polyfill's generated SVG foreignObject wrapper
                const ancestorClasses: string[] = []
                let anc: HTMLElement | null = targetEl.parentElement
                while (anc && anc !== document.body) {
                    if (anc.className && typeof anc.className === "string") {
                        ancestorClasses.push(anc.className)
                    }
                    anc = anc.parentElement
                }
                const combinedAncestorClasses = ancestorClasses.join(" ")
                if (combinedAncestorClasses) {
                    canvas.className = combinedAncestorClasses
                    const host = document.querySelector("[data-html-in-canvas-host]") as HTMLElement | null
                    if (host) {
                        host.className = combinedAncestorClasses
                    }
                }

                // Synchronize computed styles from target element to clone
                const targetComputed = window.getComputedStyle(targetEl)
                if (targetComputed.backgroundColor && targetComputed.backgroundColor !== "rgba(0, 0, 0, 0)") {
                    cloneNode.style.backgroundColor = targetComputed.backgroundColor
                }
                if (targetComputed.borderRadius) {
                    cloneNode.style.borderRadius = targetComputed.borderRadius
                }

                // Append clone into canvas (polyfill registers it as child for rasterization)
                canvas.appendChild(cloneNode)

                // 5. Initial sleek dark card placeholder texture (seamlessly matches target card styles)
                const placeholder = document.createElement("canvas")
                placeholder.width = Math.max(measuredW, 256)
                placeholder.height = Math.max(measuredH, 256)
                const pctx = placeholder.getContext("2d")
                if (pctx) {
                    // Fill with card's background color (#13131f / rgb(19, 19, 31))
                    pctx.fillStyle = "#13131f"
                    pctx.fillRect(0, 0, placeholder.width, placeholder.height)
                    // Draw subtle gradient overlay
                    const grad = pctx.createLinearGradient(0, 0, 0, placeholder.height)
                    grad.addColorStop(0, "rgba(255, 255, 255, 0.05)")
                    grad.addColorStop(1, "rgba(255, 255, 255, 0.01)")
                    pctx.fillStyle = grad
                    pctx.fillRect(0, 0, placeholder.width, placeholder.height)
                }

                const texture = new THREE.CanvasTexture(placeholder)
                texture.minFilter = THREE.LinearFilter
                texture.magFilter = THREE.LinearFilter
                texture.generateMipmaps = false

                let snapshotLoaded = false

                // 6. Update texture whenever canvas fires paint event
                const updateFromCanvas = () => {
                    if (disposed || !cloneNode) return
                    try {
                        const snap = (canvas as any).captureElementImage(cloneNode)
                        if (snap && snap.width > 0 && snap.height > 0) {
                            texture.image = snap
                            texture.needsUpdate = true
                            snapshotLoaded = true
                        }
                    } catch {
                        // Snapshot not ready yet, render loop will continuously retry
                    }
                }

                canvas.addEventListener("paint", updateFromCanvas)
                ;(canvas as any).onpaint = updateFromCanvas

                // 7. Synchronize DOM changes from live target to clone
                const sync = () => {
                    if (disposed || !cloneNode || !targetEl) return
                    cloneNode.innerHTML = targetEl.innerHTML
                    cloneNode.className = targetEl.className
                    const s = window.getComputedStyle(targetEl)
                    const w = targetEl.offsetWidth || parseFloat(s.width) || measuredW
                    const h = targetEl.offsetHeight || parseFloat(s.height) || measuredH
                    cloneNode.style.width = `${w}px`
                    cloneNode.style.height = `${h}px`
                    if (s.backgroundColor && s.backgroundColor !== "rgba(0, 0, 0, 0)") {
                        cloneNode.style.backgroundColor = s.backgroundColor
                    }
                    if (s.borderRadius) {
                        cloneNode.style.borderRadius = s.borderRadius
                    }
                    const host = document.querySelector("[data-html-in-canvas-host]") as HTMLElement | null
                    if (host && combinedAncestorClasses && host.className !== combinedAncestorClasses) {
                        host.className = combinedAncestorClasses
                    }
                    if (typeof (canvas as any).requestPaint === "function") {
                        ;(canvas as any).requestPaint()
                    }
                }

                mutObs = new MutationObserver(sync)
                mutObs.observe(targetEl, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    characterData: true,
                })
                targetEl.addEventListener("input", sync)
                targetEl.addEventListener("mouseenter", sync)
                targetEl.addEventListener("mouseleave", sync)

                // 8. Setup WebGLRenderer with framebuffer preservation
                const renderer = new THREE.WebGLRenderer({
                    canvas,
                    antialias: true,
                    alpha: true,
                    powerPreference: "high-performance",
                    preserveDrawingBuffer: true,
                })
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
                const initW = container.clientWidth || geomW || 340
                const initH = container.clientHeight || geomH || 380
                renderer.setSize(initW, initH, false)
                renderer.setClearColor(0x000000, 0)

                // 9. Camera & Scene with dynamic auto-framing
                const camera = new THREE.PerspectiveCamera(35, initW / initH, 0.1, 4000)
                const maxDim = Math.max(geomW, geomH)
                const fovRad = THREE.MathUtils.degToRad(35)
                const fitDistance = (maxDim / 2) / Math.tan(fovRad / 2) * 1.3
                camera.position.z = Math.max(600, fitDistance)

                const scene = new THREE.Scene()
                scene.background = null

                const ambient = new THREE.AmbientLight(0xffffff, 2.4)
                scene.add(ambient)

                const keyLight = new THREE.DirectionalLight(0xffffff, 3.5)
                keyLight.position.set(300, 400, 500)
                scene.add(keyLight)

                const fillLight = new THREE.DirectionalLight(0x88ccff, 1.8)
                fillLight.position.set(-300, -200, 300)
                scene.add(fillLight)

                // 10. Robust RoundedBox Geometry with NaN-safe fallback
                let geometry: any
                try {
                    geometry = new RoundedBoxGeometry(geomW, geomH, geomD, geomSegments, geomRadius)
                    geometry.computeBoundingSphere()
                    if (isNaN(geometry.boundingSphere?.radius)) {
                        console.warn("[HTMLTexture3D] RoundedBox produced NaN, falling back to BoxGeometry")
                        geometry = new THREE.BoxGeometry(geomW, geomH, geomD)
                    }
                } catch {
                    geometry = new THREE.BoxGeometry(geomW, geomH, geomD)
                }

                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    roughness: numRoughness,
                    metalness: numMetalness,
                    transparent: true,
                })

                const mesh = new THREE.Mesh(geometry, material)
                mesh.scale.setScalar(numScale)
                mesh.rotation.set(
                    THREE.MathUtils.degToRad(numRotX),
                    THREE.MathUtils.degToRad(numRotY),
                    THREE.MathUtils.degToRad(numRotZ)
                )
                scene.add(mesh)

                // 11. Motion Animation
                animHandle = animate(0, 1, {
                    ...transition,
                    repeat: Infinity,
                    repeatType: "mirror",
                    onUpdate: (val: number) => {
                        if (!mesh) return
                        mesh.rotation.y = THREE.MathUtils.lerp(
                            THREE.MathUtils.degToRad(numRotY - 8),
                            THREE.MathUtils.degToRad(numRotY + 8),
                            val
                        )
                    },
                })

                // 12. Resize Observer
                resizeObs = new ResizeObserver(() => {
                    if (disposed || !container) return
                    const w = container.clientWidth
                    const h = container.clientHeight
                    if (!w || !h) return
                    camera.aspect = w / h
                    camera.updateProjectionMatrix()
                    renderer.setSize(w, h, false)
                })
                resizeObs.observe(container)

                // 13. Render Loop with active snapshot synchronization
                let consecutiveFails = 0
                const loop = () => {
                    if (disposed) return

                    // Continuously check for rasterized snapshot until captured, and pull live updates
                    if (cloneNode && typeof (canvas as any).captureElementImage === "function") {
                        try {
                            if (!snapshotLoaded && combinedAncestorClasses) {
                                const host = document.querySelector("[data-html-in-canvas-host]") as HTMLElement | null
                                if (host && host.className !== combinedAncestorClasses) {
                                    host.className = combinedAncestorClasses
                                }
                            }
                            const snap = (canvas as any).captureElementImage(cloneNode)
                            if (snap && snap.width > 0 && snap.height > 0) {
                                if (texture.image !== snap) {
                                    texture.image = snap
                                    texture.needsUpdate = true
                                    snapshotLoaded = true
                                }
                            }
                        } catch {
                            consecutiveFails++
                            if (!snapshotLoaded && consecutiveFails % 4 === 0) {
                                if (typeof (canvas as any).requestPaint === "function") {
                                    ;(canvas as any).requestPaint()
                                }
                            }
                        }
                    }

                    renderer.render(scene, camera)
                    rafHandle = requestAnimationFrame(loop)
                }
                loop()

                // Trigger initial paint with staggered retries to ensure stylesheet loading resolves
                if (typeof (canvas as any).requestPaint === "function") {
                    ;(canvas as any).requestPaint()
                    setTimeout(() => {
                        if (!disposed && typeof (canvas as any).requestPaint === "function") {
                            ;(canvas as any).requestPaint()
                        }
                    }, 100)
                    setTimeout(() => {
                        if (!disposed && typeof (canvas as any).requestPaint === "function") {
                            ;(canvas as any).requestPaint()
                        }
                    }, 400)
                }

            } catch (err: any) {
                console.error("[HTMLTexture3D] Scene init failed:", err)
                setErrorMsg(err?.message || String(err))
            }
        }

        // Wait for target element to appear in DOM
        let attempts = 0
        const poll = setInterval(() => {
            attempts++
            const el = findTarget()
            if (el) {
                clearInterval(poll)
                initScene(el)
            } else if (attempts > 60) {
                clearInterval(poll)
                setErrorMsg(`Target element "${target}" not found on canvas after 60 attempts.`)
            }
        }, 100)

        return () => {
            disposed = true
            clearInterval(poll)
            if (animHandle?.stop) animHandle.stop()
            if (rafHandle) cancelAnimationFrame(rafHandle)
            if (resizeObs) resizeObs.disconnect()
            if (mutObs) mutObs.disconnect()
            if (cloneNode) cloneNode.remove()
        }
    }, [
        isClient,
        target,
        width,
        height,
        depth,
        radius,
        segments,
        rotationX,
        rotationY,
        rotationZ,
        scale,
        background,
        metalness,
        roughness,
        transition,
    ])

    // SSR fallback: clean placeholder preventing hydration mismatches
    if (!isClient) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    background,
                    ...style,
                }}
            />
        )
    }

    if (errorMsg) {
        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    padding: 16,
                    background: "rgba(255, 50, 50, 0.1)",
                    border: "1px solid rgba(255, 50, 50, 0.4)",
                    borderRadius: 12,
                    color: "#ff8888",
                    fontSize: 13,
                    fontFamily: "monospace",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                    ...style,
                }}
            >
                ⚠️ HTMLTexture3D: {errorMsg}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                height: "100%",
                overflow: "hidden",
                background,
                ...style,
            }}
        />
    )
}

addPropertyControls(HTMLTexture3D, {
    target: {
        type: ControlType.String,
        title: "Target",
        defaultValue: "Card",
    },
    width: {
        type: ControlType.Number,
        title: "Width",
        min: 10,
        max: 1000,
        step: 1,
    },
    height: {
        type: ControlType.Number,
        title: "Height",
        min: 10,
        max: 1000,
        step: 1,
    },
    depth: {
        type: ControlType.Number,
        title: "Depth",
        min: 10,
        max: 1000,
        step: 1,
    },
    radius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 100,
        step: 1,
    },
    segments: {
        type: ControlType.Number,
        title: "Segments",
        min: 1,
        max: 20,
        step: 1,
    },
    rotationX: {
        type: ControlType.Number,
        title: "Rotation X",
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
    },
    rotationY: {
        type: ControlType.Number,
        title: "Rotation Y",
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
    },
    rotationZ: {
        type: ControlType.Number,
        title: "Rotation Z",
        min: -180,
        max: 180,
        step: 1,
        unit: "°",
    },
    scale: {
        type: ControlType.Number,
        title: "Scale",
        min: 0.1,
        max: 3,
        step: 0.01,
    },
    metalness: {
        type: ControlType.Number,
        title: "Metalness",
        min: 0,
        max: 1,
        step: 0.01,
    },
    roughness: {
        type: ControlType.Number,
        title: "Roughness",
        min: 0,
        max: 1,
        step: 0.01,
    },
    background: {
        type: ControlType.Color,
        title: "Background",
    },
    transition: {
        type: ControlType.Transition,
        title: "Motion",
    },
})
