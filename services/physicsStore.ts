import { create } from 'zustand';

interface CubeData {
  id: string;
  color: string;
  position: [number, number, number];
}

interface PhysicsStore {
  cubes: CubeData[];
  addCube: (cube: CubeData) => void;
  reset: () => void;
}

const COLORS = ['#ff0055', '#00ff88', '#0088ff', '#ffaa00', '#aa00ff'];

export const usePhysicsStore = create<PhysicsStore>((set) => ({
  cubes: [
    { id: '1', color: COLORS[0], position: [0, 5, 0] },
    { id: '2', color: COLORS[1], position: [1, 6, 0] },
    { id: '3', color: COLORS[2], position: [-1, 7, 0] },
  ],
  addCube: (cube) => set((state) => ({ cubes: [...state.cubes, cube] })),
  reset: () => set({ cubes: [] }),
}));
