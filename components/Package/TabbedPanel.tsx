import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import SegmentedTab from '../Core/SegmentedTab.tsx';

interface TabbedPanelProps {
  panels: {
    id: string;
    title: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
  }[];
}

const TabbedPanel: React.FC<TabbedPanelProps> = ({ panels }) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState(panels[0].id);
  const [direction, setDirection] = useState(0);

  const handleTabClick = (id: string) => {
    const currentIndex = panels.findIndex(p => p.id === activeTab);
    const nextIndex = panels.findIndex(p => p.id === id);
    setDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveTab(id);
  };

  const variants: Variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 40 : -40,
      opacity: 0,
      filter: 'blur(4px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        x: { type: 'spring', damping: 25, stiffness: 200 } as any,
        opacity: { duration: 0.2 },
        filter: { duration: 0.2 }
      }
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -40 : 40,
      opacity: 0,
      filter: 'blur(4px)',
      position: 'absolute',
      width: '100%',
      transition: {
        x: { type: 'spring', damping: 25, stiffness: 200 } as any,
        opacity: { duration: 0.2 },
        filter: { duration: 0.2 }
      }
    }),
  };

  return (
    <motion.div layout="position" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div style={{ padding: theme.space['Space.M'], flexShrink: 0 }}>
        <SegmentedTab 
          tabs={panels}
          activeTab={activeTab}
          onTabClick={handleTabClick}
        />
      </div>
      <motion.div layout="position" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <AnimatePresence mode="sync" custom={direction} initial={false}>
          <motion.div
            key={activeTab}
            layout="position"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ 
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              flex: 1
            }}
          >
            {panels.find(p => p.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default TabbedPanel;
