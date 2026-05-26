/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import ThemeToggleButton from '../Core/ThemeToggleButton.tsx';
import FloatingWindow from '../Package/FloatingWindow.tsx';
import Dock from '../Section/Dock.tsx';
import Stage from '../Section/Stage.tsx';
import ControlPanel from '../Package/ControlPanel.tsx';
import CodePanel from '../Package/CodePanel.tsx';
import ConsolePanel from '../Package/ConsolePanel.tsx';
import StyleGuidePanel from '../Package/StyleGuidePanel.tsx';
import TabbedPanel from '../Package/TabbedPanel.tsx';
import SystemSpec from '../Package/SystemSpec.tsx';
import AIPanel from '../Package/AIPanel.tsx';
import UndoRedo from '../Package/UndoRedo.tsx';
import Confetti from '../Core/Confetti.tsx';
import { Sliders, Code, Terminal } from 'phosphor-react';
import { WindowId, WindowState, LogEntry, MetaButtonProps } from '../../types/index.tsx';

/**
 * 🏎️ Main Page
 * Acts as the main state orchestrator for the application.
 */
const Home = () => {
  const { theme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [uiMode, setUiMode] = useState<'default' | 'lean'>('lean');
  const [showThemeToggle, setShowThemeToggle] = useState(false);
  
  // -- App State --
  const [btnProps, setBtnProps] = useState<MetaButtonProps>({
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
  });
  
  // -- View / Inspection State --
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [showTokens, setShowTokens] = useState(false);
  const [isAIControlEnabled, setIsAIControlEnabled] = useState(false);
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
      setGeminiApiKey(savedKey);
    }
  }, []);
  
  // 3D Layer View State
  const [view3D, setView3D] = useState(false);
  const layerSpacing = useMotionValue(0);
  const viewRotateX = useMotionValue(55);
  const viewRotateZ = useMotionValue(45);

  // -- Confetti State --
  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // -- Real-time MotionValue for live UI updates --
  const radiusMotionValue = useMotionValue(parseInt(btnProps.customRadius) || 0);
  const radiusStringMotionValue = useTransform(radiusMotionValue, (v) => `${Math.round(v)}px`);

  // Sync MotionValue when state is changed by other means (e.g., undo/redo)
  useEffect(() => {
    radiusMotionValue.set(parseInt(btnProps.customRadius) || 0);
  }, [btnProps.customRadius, radiusMotionValue]);
  
  // Auto-expand layers when entering 3D mode
  useEffect(() => {
    if (view3D) {
      layerSpacing.set(40);
    } else {
      layerSpacing.set(0);
    }
  }, [view3D, layerSpacing]);


  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // -- History State --
  const [history, setHistory] = useState<MetaButtonProps[]>([]);
  const [future, setFuture] = useState<MetaButtonProps[]>([]);

  // --- Window Management ---
  const WINDOW_WIDTH = parseInt(theme.space['Space.Panel.Width']) || 400;
  const CONTROL_PANEL_HEIGHT = parseInt(theme.space['Space.Panel.Height']) || 640;
  const CODE_PANEL_HEIGHT = parseInt(theme.space['Space.14XL']) || 408;
  const CONSOLE_PANEL_HEIGHT = parseInt(theme.space['Space.12XL']) || 200;

  const handleResize = (id: WindowId, newHeight: number) => {
    setWindows(prev => ({
      ...prev,
      [id]: { ...prev[id], height: newHeight },
    }));
  };

  const [windows, setWindows] = useState<Record<WindowId, WindowState>>({
    control: { id: 'control', title: 'Control', isOpen: false, zIndex: 1, x: 0, y: 0, height: CONTROL_PANEL_HEIGHT },
    code: { id: 'code', title: 'Code I/O', isOpen: false, zIndex: 2, x: 0, y: 0, height: CODE_PANEL_HEIGHT },
    console: { id: 'console', title: 'Console', isOpen: false, zIndex: 3, x: 0, y: 0, height: CONSOLE_PANEL_HEIGHT },
    styles: { id: 'styles', title: 'Style Guide', isOpen: false, zIndex: 4, x: 0, y: 0, height: CONTROL_PANEL_HEIGHT },
    systemSpec: { id: 'systemSpec', title: 'System Spec', isOpen: false, zIndex: 5, x: 0, y: 0, height: CONTROL_PANEL_HEIGHT },
    ai: { id: 'ai', title: 'AI Agent', isOpen: false, zIndex: 6, x: 0, y: 0, height: 480 },
    settings: { id: 'settings', title: 'Settings', isOpen: false, zIndex: 7, x: 0, y: 0, height: CONTROL_PANEL_HEIGHT },
  });

  // --- Router Synchronization ---

  // Initial Sync from URL
  useEffect(() => {
    const segments = location.pathname.substring(1).split('/').filter(Boolean);
    if (segments.length === 0) return;

    segments.forEach(path => {
        if (path === 'tokens') {
            setShowTokens(true);
        } else if (path === 'measurements') {
            setShowMeasurements(true);
        } else if (path === '3d') {
            setView3D(true);
        } else if (path === 'lean') {
            setUiMode('lean');
        } else if (path === 'default') {
            setUiMode('default');
        } else if (windows[path as WindowId]) {
            setWindowState(path as WindowId, true);
            if (path === 'ai') setIsAIControlEnabled(true);
        }
    });
    logEvent(`URL Initialized with segments: ${segments.join(', ')}`);
  }, []);

  // Update URL on state change
  const syncUrlToState = (activeStates: string[]) => {
      // Sort segments for deterministic URLs (e.g. /3d/tokens is always the same path)
      const path = [...activeStates].sort().join('/');
      const currentPath = location.pathname.substring(1);
      
      // Avoid navigating if the current set of sorted segments matches the URL
      if (path === currentPath) return;
      navigate(`/${path}`, { replace: true });
  };

  useEffect(() => {
      const activeStates: string[] = [];
      Object.entries(windows).forEach(([id, state]) => {
          if (state.isOpen) activeStates.push(id);
      });
      if (showTokens) activeStates.push('tokens');
      if (showMeasurements) activeStates.push('measurements');
      if (view3D) activeStates.push('3d');
      if (uiMode !== 'lean') activeStates.push(uiMode); // only push 'default' if it's not the lean mode (since lean is default in state)
      
      syncUrlToState(activeStates);
  }, [windows, showTokens, showMeasurements, view3D, uiMode]);

  // -- Code Editor State --
  const [codeText, setCodeText] = useState('');
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  
  useEffect(() => {
    if (!isCodeFocused) {
      setCodeText(JSON.stringify(btnProps, null, 2));
    }
  }, [btnProps, isCodeFocused]);

  // -- Actions --

  const logEvent = (msg: string) => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message: msg,
    };
    setLogs(prev => [...prev, entry].slice(-50));
  };
  
  // Initial Log
  useEffect(() => {
      logEvent('System Ready. Home initialized.');
  }, []);

  const updateBtnProps = (newProps: MetaButtonProps, saveHistory: boolean = true) => {
    if (saveHistory) {
      setHistory(prev => [...prev, btnProps]);
      setFuture([]);
    }
    setBtnProps(newProps);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setFuture(prev => [btnProps, ...prev]);
    setBtnProps(previous);
    setHistory(newHistory);
    logEvent('Undo performed');
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setHistory(prev => [...prev, btnProps]);
    setBtnProps(next);
    setFuture(newFuture);
    logEvent('Redo performed');
  };

  const bringToFront = (id: WindowId) => {
    setWindows(prev => {
      const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
      if (prev[id].zIndex === maxZ) return prev;
      return { ...prev, [id]: { ...prev[id], zIndex: maxZ + 1 } };
    });
  };

  const setWindowState = (id: WindowId, open: boolean) => {
    setWindows(prev => {
      if (prev[id].isOpen === open) return prev;
      const next = { ...prev, [id]: { ...prev[id], isOpen: open } };
      if (open) {
        const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
        next[id].zIndex = maxZ + 1;
      }
      return next;
    });
  };

  const toggleWindow = (id: WindowId) => {
    setWindowState(id, !windows[id].isOpen);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(JSON.stringify(btnProps, null, 2));
    logEvent('JSON copied to clipboard');
  };
  
  const handlePropChange = (keyOrObj: string | Partial<MetaButtonProps>, value?: any) => {
    if (typeof keyOrObj === 'string') {
        updateBtnProps({ ...btnProps, [keyOrObj]: value });
        logEvent(`Prop updated: ${keyOrObj} = ${value}`);
    } else {
        updateBtnProps({ ...btnProps, ...keyOrObj });
        logEvent(`State updated: ${Object.keys(keyOrObj).join(', ')}`);
    }
  };

  const handleRadiusCommit = (value: number) => {
    handlePropChange('customRadius', `${value}px`);
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setCodeText(newVal);
    try {
      const parsed = JSON.parse(newVal);
      updateBtnProps(parsed, true);
    } catch (err) {
      // Invalid JSON, just update text
    }
  };

  const handleToggleMeasurements = () => {
    setShowMeasurements(prev => !prev);
    logEvent(`Measurements toggled: ${!showMeasurements ? 'On' : 'Off'}`);
  };

  const handleToggleTokens = () => {
    setShowTokens(prev => !prev);
    logEvent(`Tokens toggled: ${!showTokens ? 'On' : 'Off'}`);
  };

  const handleToggleAIControl = () => {
    const newState = !isAIControlEnabled;
    setIsAIControlEnabled(newState);
    setWindows(prev => {
      const maxZ = Math.max(...Object.values(prev).map((w: WindowState) => w.zIndex));
      return {
        ...prev,
        ai: { ...prev.ai, isOpen: newState, zIndex: newState ? maxZ + 1 : prev.ai.zIndex }
      };
    });
    logEvent(`AI Agent toggled: ${newState ? 'On' : 'Off'}`);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('geminiApiKey', key);
    logEvent('Gemini API Key saved.');
  };
  
  const handleStageButtonClick = () => {
    logEvent('Component Interacted! (Triggered Action)');
    setConfettiTrigger(prev => prev + 1);
  };

  const undoRedoComponent = (
    <UndoRedo
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={history.length > 0}
      canRedo={future.length > 0}
    />
  );

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: theme.Color.Base.Surface[1],
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
            <div style={{ position: 'fixed', top: theme.space['Space.XL'], right: theme.space['Space.XL'], zIndex: 1001, display: 'flex', gap: theme.space['Space.M'] }}>
                {showThemeToggle && <ThemeToggleButton />}
      </div>
      <Confetti trigger={confettiTrigger} />

      <Stage
        btnProps={{...btnProps, customRadius: radiusStringMotionValue}}
        onButtonClick={handleStageButtonClick}
        showMeasurements={showMeasurements}
        showTokens={showTokens}
        view3D={view3D}
        viewRotateX={viewRotateX}
        viewRotateZ={viewRotateZ}
        layerSpacing={layerSpacing}
      />

      {/* --- WINDOWS --- */}
      <AnimatePresence>
        {uiMode === 'default' && windows.control.isOpen && (
          <FloatingWindow
            key="control"
            {...windows.control}
            onClose={() => toggleWindow('control')}
            onResize={(newHeight) => handleResize('control', newHeight)}
            onFocus={() => bringToFront('control')}
            footer={undoRedoComponent}
          >
            <ControlPanel
                btnProps={btnProps}
                onPropChange={handlePropChange}
                radiusMotionValue={radiusMotionValue}
                onRadiusCommit={handleRadiusCommit}
                showMeasurements={showMeasurements}
                onToggleMeasurements={handleToggleMeasurements}
                showTokens={showTokens}
                onToggleTokens={handleToggleTokens}
                showStyles={windows.styles.isOpen}
                onToggleStyles={() => toggleWindow('styles')}
                showSystemSpec={windows.systemSpec.isOpen}
                onToggleSystemSpec={() => toggleWindow('systemSpec')}
                // 3D Props
                view3D={view3D}
                onToggleView3D={() => setView3D(!view3D)}
                layerSpacing={layerSpacing}
                viewRotateX={viewRotateX}
                viewRotateZ={viewRotateZ}
                uiMode={uiMode}
                onToggleUIMode={() => setUiMode(uiMode === 'default' ? 'lean' : 'default')}
                showThemeToggle={showThemeToggle}
                onToggleThemeButton={() => setShowThemeToggle(!showThemeToggle)}
                isAIControlEnabled={isAIControlEnabled}
                onToggleAIControl={handleToggleAIControl}
                geminiApiKey={geminiApiKey}
                onGeminiApiKeyChange={handleGeminiApiKeyChange}
            />
          </FloatingWindow>
        )}

        {uiMode === 'default' && windows.code.isOpen && (
          <FloatingWindow
            key="code"
            {...windows.code}
            onClose={() => toggleWindow('code')}
            onResize={(newHeight) => handleResize('code', newHeight)}
            onFocus={() => bringToFront('code')}
            footer={undoRedoComponent}
          >
            <CodePanel
              codeText={codeText}
              onCodeChange={handleCodeChange}
              onCopyCode={handleCopyCode}
              onFocus={() => setIsCodeFocused(true)}
              onBlur={() => setIsCodeFocused(false)}
              btnProps={btnProps}
            />
          </FloatingWindow>
        )}

        {uiMode === 'default' && windows.console.isOpen && (
          <FloatingWindow
            key="console"
            {...windows.console}
            onClose={() => toggleWindow('console')}
            onResize={(newHeight) => handleResize('console', newHeight)}
            onFocus={() => bringToFront('console')}
            footer={undoRedoComponent}
          >
            <ConsolePanel logs={logs} />
          </FloatingWindow>
        )}

        {windows.styles.isOpen && (
          <FloatingWindow
            key="styles"
            {...windows.styles}
            onClose={() => toggleWindow('styles')}
            onResize={(newHeight) => handleResize('styles', newHeight)}
            onFocus={() => bringToFront('styles')}
          >
            <StyleGuidePanel />
          </FloatingWindow>
        )}

        {windows.systemSpec.isOpen && (
          <FloatingWindow
            key="systemSpec"
            {...windows.systemSpec}
            onClose={() => toggleWindow('systemSpec')}
            onResize={(newHeight) => handleResize('systemSpec', newHeight)}
            onFocus={() => bringToFront('systemSpec')}
          >
            <SystemSpec />
          </FloatingWindow>
        )}

        {windows.ai.isOpen && (
          <FloatingWindow
            key="ai"
            {...windows.ai}
            onClose={() => {
              toggleWindow('ai');
              setIsAIControlEnabled(false);
            }}
            onResize={(newHeight) => handleResize('ai', newHeight)}
            onFocus={() => bringToFront('ai')}
          >
            <AIPanel 
              appState={btnProps} 
              onUpdateState={(updates) => handlePropChange({ ...updates, componentType: 'custom' })}
              apiKey={geminiApiKey}
            />
          </FloatingWindow>
        )}

        {/* --- LEAN MODE WINDOW --- */}
        {/* Moved inside AnimatePresence for exit transitions */}
        {uiMode === 'lean' && windows.control.isOpen && (
          <FloatingWindow
            key="lean-window"
            {...windows.control}
            onClose={() => toggleWindow('control')}
            onFocus={() => bringToFront('control')}
            onResize={(newHeight) => handleResize('control', newHeight)}
            footer={undoRedoComponent}
          >
            <TabbedPanel 
              panels={[
                { id: 'control', title: 'Control', icon: <Sliders size={16} />, content: <ControlPanel btnProps={btnProps} onPropChange={handlePropChange} radiusMotionValue={radiusMotionValue} onRadiusCommit={handleRadiusCommit} showMeasurements={showMeasurements} onToggleMeasurements={handleToggleMeasurements} showTokens={showTokens} onToggleTokens={handleToggleTokens} 
                  showStyles={windows.styles.isOpen}
                  onToggleStyles={() => toggleWindow('styles')}
                  showSystemSpec={windows.systemSpec.isOpen}
                  onToggleSystemSpec={() => toggleWindow('systemSpec')}
                  view3D={view3D} onToggleView3D={() => setView3D(!view3D)} layerSpacing={layerSpacing} viewRotateX={viewRotateX} viewRotateZ={viewRotateZ} uiMode={uiMode} onToggleUIMode={() => setUiMode(prev => prev === 'default' ? 'lean' : 'default')}
                  showThemeToggle={showThemeToggle}
                  onToggleThemeButton={() => setShowThemeToggle(!showThemeToggle)}
                  isAIControlEnabled={isAIControlEnabled}
                  onToggleAIControl={handleToggleAIControl}
                  geminiApiKey={geminiApiKey}
                  onGeminiApiKeyChange={handleGeminiApiKeyChange} /> },
                { id: 'code', title: 'Code I/O', icon: <Code size={16} />, content: <CodePanel codeText={codeText} onCodeChange={handleCodeChange} onCopyCode={handleCopyCode} onFocus={() => setIsCodeFocused(true)} onBlur={() => setIsCodeFocused(false)} btnProps={btnProps} /> },
                { id: 'console', title: 'Console', icon: <Terminal size={16} />, content: <ConsolePanel logs={logs} /> },
              ]}
            />
          </FloatingWindow>
        )}
      </AnimatePresence>

      {uiMode === 'default' ? (
        <Dock windows={windows} toggleWindow={toggleWindow} uiMode={uiMode} />
      ) : (
        <Dock windows={{ settings: { id: 'settings', title: 'Settings', isOpen: windows.control.isOpen, zIndex: 1, x: 0, y: 0, height: 600 } }} toggleWindow={() => toggleWindow('control')} uiMode={uiMode} />
      )}
    </div>
  );
};

export default Home;
