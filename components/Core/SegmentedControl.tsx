import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme';

interface SegmentedControlItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface SegmentedControlProps {
  items: SegmentedControlItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({ items, activeId, onSelect }) => {
  const { theme } = useTheme();

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing['Space.XS'],
    backgroundColor: theme.Color.Base.Surface[2],
    borderRadius: theme.radius['Radius.Full'],
    boxShadow: theme.effects['Effect.Shadow.Inset.1'],
  };

  const itemStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${theme.spacing['Space.S']} ${theme.spacing['Space.M']}`,
    cursor: 'pointer',
    userSelect: 'none',
    zIndex: 2,
    transition: `color ${theme.time['Time.2x']} ease`,
  };

  const activeIndicatorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.Color.Base.Surface[1],
    borderRadius: theme.radius['Radius.Full'],
    boxShadow: theme.effects['Effect.Shadow.Drop.1'],
    zIndex: 1,
  };

  return (
    <div style={containerStyle}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <motion.div
            key={item.id}
            style={itemStyle}
            onClick={() => onSelect(item.id)}
            animate={{ color: isActive ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2] }}
          >
            <div style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
              {item.icon}
            </div>
            <motion.div
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
              initial={{ width: 0, marginLeft: 0 }}
              animate={{
                width: isActive ? 'auto' : 0,
                marginLeft: isActive ? theme.spacing['Space.S'] : 0,
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
            >
              <span style={{ fontSize: theme.Type.Readable.Label.M.fontSize }}>{item.label}</span>
            </motion.div>
            
            {isActive && (
              <motion.div
                style={activeIndicatorStyle}
                layoutId="activeSegment"
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
