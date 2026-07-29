import { create } from 'zustand';

export interface ShaderParams {
  // Fluid Simulation & Curl Noise
  radius: number;          // Brush radius (default: 0.065)
  strength: number;        // Impulse force (default: 4.5)
  dissipation: number;     // Decay rate (default: 0.96)
  curlStrength: number;    // Curl noise turbulence scale (default: 0.25)
  curlFreq: number;        // Curl noise frequency (default: 3.5)

  // Liquid Glass Optics
  refractStrength: number; // Refraction displacement (default: 0.35)
  dispersionScale: number; // Chromatic dispersion / RGB shift (default: 0.15)
  blurRadius: number;      // 9-tap Gaussian blur radius (default: 0.012)
  jitterStrength: number;  // 9-tap Blue noise jitter (default: 0.005)
}

export const DEFAULT_SHADER_PARAMS: ShaderParams = {
  radius: 0.05,
  strength: 8,
  dissipation: 0.93,
  curlStrength: 0.16,
  curlFreq: 1,
  refractStrength: 0.25,
  dispersionScale: 0.35,
  blurRadius: 0.04,
  jitterStrength: 0.02,
};

interface ShaderStore {
  params: ShaderParams;
  setParam: (key: keyof ShaderParams, value: number) => void;
  setParams: (params: Partial<ShaderParams>) => void;
  resetParams: () => void;
}

export const useShaderStore = create<ShaderStore>((set) => ({
  params: { ...DEFAULT_SHADER_PARAMS },
  setParam: (key, value) =>
    set((state) => ({
      params: {
        ...state.params,
        [key]: value,
      },
    })),
  setParams: (newParams) =>
    set((state) => ({
      params: {
        ...state.params,
        ...newParams,
      },
    })),
  resetParams: () => set({ params: { ...DEFAULT_SHADER_PARAMS } }),
}));
