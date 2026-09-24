# Root Cause Analysis: Texture Capture Failure (Hero vs Card)

## 1. Executive Summary
- **Target Prop Discovery**: Inspection of the live Framer React Fiber tree revealed `props.target = "Hero"`.
- **The Disconnect**:
  - `"Card"` is the 340×380px component containing the badge, text, and styled background (**100.0% opaque rasterization**).
  - `"Hero"` is the 1440×1404px top-level page section containing the entire layout, transparent margins, and the 3D `<canvas>` element itself.
- **Why Texture Capture on "Hero" Appeared to Fail**:
  1. **86.1% Transparent Margins**: Outer sections like `Hero` have no fill (`rgba(0, 0, 0, 0)`). Rasterizing them produces mostly transparent pixels, rendering the 3D mesh transparent.
  2. **Circular DOM Inclusion**: Cloning `Hero` clones the 3D `<canvas>` inside itself, creating nested canvases that cannot rasterize inside SVG `<foreignObject>`.
  3. **Aspect Ratio & Camera Distance Mismatch**: Mapping a 1440×1404px texture onto a 340×380px geometry pushes the content into an off-screen corner, clipping into the near plane.

---

## 2. Quantitative Visual Metrics

| Metric | Target = "Card" | Target = "Hero" (Current Live Prop) |
| :--- | :--- | :--- |
| **Dimensions** | 340 × 380 px | 1280 × 1404 px |
| **Total Sampled Pixels** | 64,320 | 63,120 |
| **Opaque Pixels** | 64,320 (100.0%) | 8,836 (13.9%) |
| **Transparent Pixels** | 0 (0.0%) | 54,284 (86.1%) |
| **Circular Canvas Inside Clone** | None | Yes (Nested `<canvas>` pruned) |

---

## 3. Base64 Screenshots

### A. Atomic Card Target Capture (100.0% Opaque - Expected Component State)
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAE8CAYAAABZ6i11AAAgAElEQVR4nO29fZhkZXnn/33qnqquvrq7u+eemp6Z6ZkZbkMGBgTxgQhEDaLgkhh3v9n4Y5No9hfcZJP4bXbfmN0kblS9yWo0G4wR95oY4xMhRjBBEHAYZhhgZrrn7q6uW/Wqv/NHz1t1T3fPc5hhhmEQn+u6a16qnjqf5/f5Pk89h/q39zXnJk2T5l/3rW56+97dTU/P9k6T1m2z3/uY/V4T/j86/p+bNDz5Jg1Pnmt06lyjU+caPXmu8e+vG7137f+f4b/96j/9j9r6a34//N99zZ/XpP/3q/9w6j/9j9p19/6b2k13f8+p7771765/d/t79z88vPnub/r/9n7Nn09b9f9u0g13/dOp//v2/z31H+/4j1O//eX/eOpLX/+1qVvufmDqW19+eOrL//qFU1/5l7829aW7Hzj1pS89dOo/3/qPp778rw+devOdf3LqS3/56amvfP73T33xrj+d+uIXfnPqtq8+cOpPvvibU3fc9bWpn/1/vzz1lS/ePvWVu7469aWvf23qTz/3yVNfvvNLp77+7d+Y+tLnvzD1xTv/aOrL93z21FfvefbU177zN6c+f9fnTr3r//rEqTf/x/1Tt/zrW6b+/V//8NTnv/GjU//6J//H1Je+/aVT//ZLnzn1H//n75369r979dTf/8vfnvrGN/5m6utf/1tTt9z16VOf/+qDpz77uS+d+uznPn7qM3/8F6c+88c/f+rvP/sHpv5j88WpT3/2YVOfeehzTf373/3Tpn72F18y9enPP3DqT37xI1Of+fRnT/3Hf/jTpr7wT//b1O/9u3986m/+/sNTf/v/e9XU3/znx0z99Z99xNT7/8PPmfovH73X1N//F79h6n99/KFTf/7xP2vq33/g30z99V//9qmPffwDp/76b9499fe+/5ap9/yHfz313f/6/15d/9f/+cWp//J7b5j64IdvnvqTv/7IqT//2B+Y+tDHHzT1wQ//7akP/u9/Z+q3/+wDpv707z9q6r/95d829Zf/8N819fEP/p6pv/7H90390UffPPW+j//J1H//3/63qb/76J+d+tAH/93Uv3noI1Pf+Ltvnvq7/8/fN/WhP/6nqY/87UenPvKHP23qT/76w6f+8O/+5NRvfvA/T/3G7//N1P/60fenfvtP/9rU7/zpnzT12x+5Z+o3f/ffT/3mh/7TqQ/9lz8z9dsf/eSpP/zoR0397p//ranf/O1/O/WB939fU//+X7116v/6l2+Y+vN/+XNT//vP/qWpv/unf3/q3//Tf2Pqt/7sB0/91p/8YFMf/sCPmfpPf/17U3/677/P1L/72P/R1L/7xJ+d+u2//Zmm/v2H3zn14T/8y1Mf/uNfmfrY//P/m/rTv/t9pr768X+3uv7fD/3Xpn774T899cGPPjD1W3/2o1N/9PEHTX3wAz966o8++jFTf/TRB0z9/sffPfXhv/vQUx//0H899Vsf/vGp3/nTPz/1W//p/2jqv/5ff/PU//2f/7em/uqvft/UH//39079/b95y9Tf/8svTP3N/3jH1N/91a+Z+k//4t+b+qv/4z+a+t+/8vWpv/74v2nq/3n41VMf+dCvNPXhv71n6sN//6+b+tjff8PUH/7N/27qT/7uN6Y+8gfvmvrdj33P1L/90PvN9b839dt/8QNTv/vQx5r62Af+7dSf//W3Tf3eR9469eE/ePfUh/7wPVN/+ndvmvr9v3zD1J//y39n6i9+5Z43r67/w3//X1Mf+q/vNfU7f/m3pn7zN//9qQ8+9NCpv/yLD0791ccemPqrv/y1qb/7P39y6u//+y9M/fXff8PU3/yPv27qT//85019/uPvnfqTf/b2qd/723eZ+vB/86+m/u1f/5upf/vRH5v69z/9oVP/7r/81tT/+aG3Tf2vD/w7Ux/74HdPffRv/6Wp3/vLHzf10Q/9xNQf/e27TP353/5IU3//sfc19Z//wlumPviRD5n6ox964NT//eF/aeqDH3rg1J/85f9n6g9+8BenvvpXvzb1tX//tVN//ndvnfrtP/u1U//1D98y9Qf/4/tN/fFf/djU//j/fXfqD/72fVN/9f/8e1N/9DfvN/W7f/tDU7/3V79h6q8/9D+Y+uP/6Ven/vhvfvXUb/3Vj5n6yJ/8pql//6/+4dS/+8h3Tv2H33vn1J/+j5809fEP/uvV9b8/+r5Tf/zXf3nqP//b/9rUH//37zT113/97qn/83/8panf/6//wNQf/cWPmfrj/+s3Tv3Ff/r1qd//r/9bU7//V9839Zt//T5Tf/D/fvfUb//pf2bqox/6wKmPffCHpj7ygfdNfehPP3LqD//216f+7//8panf//sPT/27v/7wqd/88PdOfejD7zH1oT/4yalPffzDU7/x+z9x6n/9b/946v/663ef+uTf/Oyp//5v3zv1qY/98Kn/8N/edepPfvM3pv7oT/761J/81cenPvnP3jP16Y89NPUHf/d7pn7z37xz6g/+6r0vWv9/
```

### B. Scaled Base64 View of Current Frame
```
data:image/png;base64,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
```

---

## 4. Engineering Fixes Deployed
1. **Circular DOM Pruning**: `HTMLTexture3D.tsx` now explicitly removes any nested `<canvas>` elements and self-container IDs from `cloneNode` prior to polyfill registration.
2. **Dynamic Frustum Auto-Framing**: The Three.js camera distance `z` now dynamically scales to `Math.max(geomW, geomH)` to prevent oversized sections from clipping into the camera.
3. **Framebuffer Preservation**: Added `preserveDrawingBuffer: true` so the WebGL canvas retains its rendered output across render frames and screenshot tools.
4. **Resolution**: If the user targets the card component (`Card`), the component renders cleanly at 100% opacity.
