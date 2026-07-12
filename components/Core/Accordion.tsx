import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'phosphor-react';
import { useTheme } from '../../Theme.tsx';
import { playSound } from '../../services/soundService';

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
    width: '100%',
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
        onClick={() => {
          playSound('tick');
          setIsOpen(!isOpen);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'touch') {
            playSound('whisper', 0.4);
          }
          setIsHovered(true);
        }}
        onPointerLeave={() => setIsHovered(false)}
      >
        <span style={titleStyle}>{title}</span>
        <motion.div
          layout="position"
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
          /* Masked slide: outer container handles height clip, inner handles vertical motion */
          <motion.div
            key="content"
            layout="position"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              height: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
              opacity: { duration: 0.3, delay: 0.1 }
            }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              layout="position"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={contentWrapperStyle}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accordion;
