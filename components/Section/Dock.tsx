/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import DockIcon from '../Core/DockIcon.tsx';
import { WindowId, WindowState } from '../../types/index.tsx';

interface DockProps {
    windows: Record<WindowId, WindowState>;
    toggleWindow: (id: WindowId) => void;
}

const ICON_MAP: Record<string, { icon: string; label: string }> = {
  control: { icon: 'ph-sliders', label: 'Control' },
  code: { icon: 'ph-code', label: 'Code' },
  console: { icon: 'ph-terminal-window', label: 'Console' },
  settings: { icon: 'ph-gear', label: 'Settings' },
};

const Dock: React.FC<DockProps> = ({ windows, toggleWindow }) => {
    const { theme } = useTheme();
    const windowItems = (Object.keys(windows) as WindowId[]).filter(id => id !== 'styles' && id !== 'systemSpec' && id !== 'ai');

    return (
      <motion.div
        drag
        dragMomentum={false}
        style={{
          position: 'absolute',
          bottom: theme.spacing['Space.L'],
          left: '50%',
          x: '-50%',
          display: 'flex',
          gap: theme.spacing['Space.S'],
          padding: theme.spacing['Space.S'],
          backgroundColor: `${theme.Color.Base.Surface[1]}aa`,
          backdropFilter: 'blur(16px)',
          borderRadius: '24px', // Peel shape
          boxShadow: theme.effects['Effect.Shadow.Drop.3'],
          border: `1px solid ${theme.Color.Base.Surface[3]}`,
          zIndex: 1000,
        }}
      >
        {windowItems.map((id) => (
          <DockIcon
            key={id}
            icon={ICON_MAP[id]?.icon || 'ph-question'}
            isActive={windows[id].isOpen}
            onClick={() => toggleWindow(id)}
          />
        ))}
      </motion.div>
    );
};

export default Dock;
