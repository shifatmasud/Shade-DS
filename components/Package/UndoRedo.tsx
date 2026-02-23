/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUUpLeft, ArrowUUpRight } from 'phosphor-react';
import { useTheme } from '../../Theme.tsx';

interface UndoRedoProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const UndoRedo: React.FC<UndoRedoProps> = ({ onUndo, onRedo, canUndo, canRedo }) => {
  const { theme } = useTheme();

  const buttonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    border: 'none',
    borderRadius: theme.radius['Radius.M'],
    backgroundColor: 'transparent',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: theme.spacing['Space.XS'],
      }}
    >
      <motion.button
        style={buttonStyle}
        disabled={!canUndo}
        onClick={onUndo}
        whileHover={{ backgroundColor: theme.Color.Base.Surface[2] }}
        whileTap={{ scale: 0.9, backgroundColor: theme.Color.Base.Surface[3] }}
        animate={{ opacity: canUndo ? 1 : 0.5, color: canUndo ? theme.Color.Base.Content[1] : theme.Color.Base.Content[3] }}
        transition={{ duration: 0.1 }}
      >
        <ArrowUUpLeft size={16} />
      </motion.button>
      <motion.button
        style={buttonStyle}
        disabled={!canRedo}
        onClick={onRedo}
        whileHover={{ backgroundColor: theme.Color.Base.Surface[2] }}
        whileTap={{ scale: 0.9, backgroundColor: theme.Color.Base.Surface[3] }}
        animate={{ opacity: canRedo ? 1 : 0.5, color: canRedo ? theme.Color.Base.Content[1] : theme.Color.Base.Content[3] }}
        transition={{ duration: 0.1 }}
      >
        <ArrowUUpRight size={16} />
      </motion.button>
    </div>
  );
};

export default UndoRedo;