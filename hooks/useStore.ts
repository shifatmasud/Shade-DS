import { create } from 'zustand';
import { WindowId, WindowState, MetaButtonProps, LogEntry } from '../types/index.tsx';

/**
 * Shade Store Interface
 * Follows the Reactive Architecture: FSM -> Store -> Observer
 */
interface AppState {
  // --- UI STATE ---
  windows: Record<WindowId, WindowState>;
  uiMode: 'default' | 'lean';
  showMeasurements: boolean;
  showTokens: boolean;
  showThemeToggle: boolean;
  view3D: boolean;
  
  // --- DATA STATE ---
  btnProps: MetaButtonProps;
  logs: LogEntry[];
  history: MetaButtonProps[];
  future: MetaButtonProps[];
  confettiTrigger: number;
  
  // --- SESSION STATE ---
  geminiKey: string;
  isAiThinking: boolean;
  
  // --- ACTIONS ---
  // Window Management
  toggleWindow: (id: WindowId) => void;
  setWindowState: (id: WindowId, isOpen: boolean) => void;
  bringToFront: (id: WindowId) => void;
  updateWindowHeight: (id: WindowId, height: number) => void;
  
  // Prop Management
  updateBtnProps: (updates: Partial<MetaButtonProps>, saveHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  
  // UI Toggles
  setUiMode: (mode: 'default' | 'lean') => void;
  toggleMeasurements: () => void;
  toggleTokens: () => void;
  toggleThemeToggle: () => void;
  toggleView3D: () => void;
  triggerConfetti: () => void;
  
  // Session Actions
  setGeminiKey: (key: string) => void;
  setAiThinking: (isThinking: boolean) => void;
  logEvent: (msg: string) => void;
}

const WINDOW_WIDTH = 400;
const CONTROL_PANEL_HEIGHT = 640;
const CODE_PANEL_HEIGHT = 408;
const CONSOLE_PANEL_HEIGHT = 200;

/**
 * Global application store for modular components.
 * [CHANGE]: Implemented Zustand for reactive, atomic broadstate.
 */
export const useStore = create<AppState>((set, get) => ({
  // Initial State
  windows: {
    control: { id: 'control', title: 'Control', isOpen: false, zIndex: 1, x: -WINDOW_WIDTH / 2, y: -CONTROL_PANEL_HEIGHT / 2, height: CONTROL_PANEL_HEIGHT },
    code: { id: 'code', title: 'Code I/O', isOpen: false, zIndex: 2, x: -WINDOW_WIDTH / 2, y: -CODE_PANEL_HEIGHT / 2, height: CODE_PANEL_HEIGHT },
    console: { id: 'console', title: 'Console', isOpen: false, zIndex: 3, x: -WINDOW_WIDTH / 2, y: -CONSOLE_PANEL_HEIGHT / 2, height: CONSOLE_PANEL_HEIGHT },
    styles: { id: 'styles', title: 'Style Guide', isOpen: false, zIndex: 4, x: -WINDOW_WIDTH / 2, y: -CONTROL_PANEL_HEIGHT / 2, height: CONTROL_PANEL_HEIGHT },
    systemSpec: { id: 'systemSpec', title: 'System Spec', isOpen: false, zIndex: 5, x: -WINDOW_WIDTH / 2, y: -CONTROL_PANEL_HEIGHT / 2, height: CONTROL_PANEL_HEIGHT },
    ai: { id: 'ai', title: 'AI Agent', isOpen: false, zIndex: 6, x: -WINDOW_WIDTH / 2, y: -240, height: 480 },
    settings: { id: 'settings', title: 'Settings', isOpen: false, zIndex: 7, x: -WINDOW_WIDTH / 2, y: -CONTROL_PANEL_HEIGHT / 2, height: CONTROL_PANEL_HEIGHT },
  },
  uiMode: 'lean',
  showMeasurements: false,
  showTokens: false,
  showThemeToggle: false,
  view3D: false,

  btnProps: {
    componentType: 'button',
    label: 'Do Magic',
    variant: 'primary',
    size: 'L',
    icon: 'ph-sparkle',
    customFill: '',
    customColor: '',
    customRadius: '56px',
    disabled: false,
    forcedHover: false,
    forcedFocus: false,
    forcedActive: false,
  },
  logs: [],
  history: [],
  future: [],
  confettiTrigger: 0,
  
  geminiKey: localStorage.getItem('GEMINI_API_KEY') || localStorage.getItem('geminiApiKey') || '',
  isAiThinking: false,

  // Window Actions
  toggleWindow: (id) => {
    const { windows, setWindowState } = get();
    setWindowState(id, !windows[id].isOpen);
  },

  setWindowState: (id, open) => set((state) => {
    const prev = state.windows[id];
    if (prev.isOpen === open) return state;
    
    const nextWindows = { ...state.windows };
    nextWindows[id] = { ...prev, isOpen: open };
    
    if (open) {
      const maxZ = Math.max(...Object.values(state.windows).map(w => w.zIndex));
      nextWindows[id].zIndex = maxZ + 1;
    }
    
    return { windows: nextWindows };
  }),

  bringToFront: (id) => set((state) => {
    const maxZ = Math.max(...Object.values(state.windows).map(w => w.zIndex));
    if (state.windows[id].zIndex === maxZ) return state;
    return {
      windows: {
        ...state.windows,
        [id]: { ...state.windows[id], zIndex: maxZ + 1 }
      }
    };
  }),

  updateWindowHeight: (id, height) => set((state) => ({
    windows: {
      ...state.windows,
      [id]: { ...state.windows[id], height }
    }
  })),

  // Prop Actions
  updateBtnProps: (updates, saveHistory = true) => set((state) => {
    const newProps = { ...state.btnProps, ...updates };
    if (saveHistory) {
      return {
        btnProps: newProps,
        history: [...state.history, state.btnProps],
        future: []
      };
    }
    return { btnProps: newProps };
  }),

  undo: () => set((state) => {
    if (state.history.length === 0) return state;
    const previous = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);
    return {
      btnProps: previous,
      history: newHistory,
      future: [state.btnProps, ...state.future]
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return state;
    const next = state.future[0];
    const newFuture = state.future.slice(1);
    return {
      btnProps: next,
      history: [...state.history, state.btnProps],
      future: newFuture
    };
  }),

  // UI Actions
  setUiMode: (mode) => set({ uiMode: mode }),
  toggleMeasurements: () => set((state) => ({ showMeasurements: !state.showMeasurements })),
  toggleTokens: () => set((state) => ({ showTokens: !state.showTokens })),
  toggleThemeToggle: () => set((state) => ({ showThemeToggle: !state.showThemeToggle })),
  toggleView3D: () => set((state) => ({ view3D: !state.view3D })),
  triggerConfetti: () => set((state) => ({ confettiTrigger: state.confettiTrigger + 1 })),

  // Session Actions
  setGeminiKey: (key) => {
    localStorage.setItem('GEMINI_API_KEY', key);
    set({ geminiKey: key });
  },

  setAiThinking: (isThinking) => set({ isAiThinking: isThinking }),

  logEvent: (msg) => set((state) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toLocaleTimeString(),
      message: msg,
    };
    return { logs: [...state.logs, entry].slice(-100) };
  }),
}));
