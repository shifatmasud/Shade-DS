import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'phosphor-react';
import { useTheme } from '../../Theme.tsx';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isHovered, setIsHovered] = useState(false);

  const containerStyle: React.CSSProperties = {
    marginBottom: theme.space['Space.S'],
    borderRadius: theme.radius['Radius.M'],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.space['Space.M']} ${theme.space['Space.L']}`,
    cursor: 'pointer',
    userSelect: 'none',
    backgroundColor: 'transparent',
    transition: `all ${theme.time['Time.2x']} ease`,
    borderRadius: theme.radius['Radius.M'],
  };

  const titleStyle: React.CSSProperties = {
    ...theme.Type.Readable.Label.S,
    color: isHovered || isOpen ? theme.Color.Base.Content[1] : theme.Color.Base.Content[2],
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 600,
    transition: `color ${theme.time['Time.2x']} ease`,
  };

  const contentWrapperStyle: React.CSSProperties = {
    padding: theme.space['Space.M'],
    margin: `0 ${theme.space['Space.L']} ${theme.space['Space.S']} ${theme.space['Space.L']}`,
  };

  return (
    <div style={containerStyle}>
      <div 
        style={headerStyle} 
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span style={titleStyle}>{title}</span>
        <motion.div
          initial={false}
          animate={{ 
            rotate: isOpen ? 45 : 0,
            scale: isHovered ? 1.1 : 1,
            color: isOpen ? theme.Color.Base.Content[1] : theme.Color.Base.Content[3]
          }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        >
          <Plus size={parseInt(theme.space['Space.L'])} weight="bold" />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0, y: -4 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -4 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div style={contentWrapperStyle}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accordion;
