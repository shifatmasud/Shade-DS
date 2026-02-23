import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: theme.spacing['Space.M'] }}>
        <SegmentedTab 
          tabs={panels}
          activeTab={activeTab}
          onTabClick={setActiveTab}
        />
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {panels.find(p => p.id === activeTab)?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TabbedPanel;
