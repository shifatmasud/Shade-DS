/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface SegmentedTabProps {
  tabs: { id: string; title: string; icon?: React.ReactNode }[];
  activeTab: string;
  onTabClick: (id: string) => void;
}

const SegmentedTab: React.FC<SegmentedTabProps> = ({ tabs, activeTab, onTabClick }) => {
  const { theme } = useTheme();

  return (
    <div style={{
      display: 'flex',
      padding: theme.space['Space.2XS'],
      backgroundColor: theme.Color.Base.Surface[2],
      borderRadius: theme.radius['Radius.M'],
      border: `1px solid ${theme.Color.Base.Surface[3]}`,
      position: 'relative',
      gap: theme.space['Space.2XS'],
    }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.space['Space.S'],
              padding: `${theme.space['Space.XS']} ${theme.space['Space.M']}`,
              backgroundColor: 'transparent',
              border: 'none',
              color: isActive ? theme.Color.Base.Content[1] : theme.Color.Base.Content[3],
              cursor: 'pointer',
              position: 'relative',
              zIndex: 1,
              ...theme.Type.Readable.Label.S,
              transition: `color ${theme.time['Time.2x']} ease`,
              outline: 'none',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-tab-active"
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: theme.Color.Base.Surface[1],
                  borderRadius: `calc(${theme.radius['Radius.M']} - ${theme.space['Space.2XS']})`,
                  boxShadow: theme.effects['Effect.Shadow.Drop.1'],
                  border: `1px solid ${theme.Color.Base.Surface[3]}`,
                  zIndex: -1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30
                }}
              />
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: theme.space['Space.S'], opacity: isActive ? 1 : 0.7 }}>
              {tab.icon}
              {tab.title}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedTab;
