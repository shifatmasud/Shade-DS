import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from 'phosphor-react';
import { useTheme } from '../../Theme.tsx';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const Accordion: React.FC<AccordionProps> = ({ title, children, defaultOpen = false }) => {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.spacing['Space.M']} 0`,
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: `1px solid ${theme.Color.Base.Surface[3]}`,
  };

  const titleStyle: React.CSSProperties = {
    ...theme.Type.Readable.Label.S,
    color: theme.Color.Base.Content[2],
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const contentStyle: React.CSSProperties = {
    padding: `${theme.spacing['Space.L']} 0`,
    overflow: 'hidden',
  };

  return (
    <div>
      <div style={headerStyle} onClick={() => setIsOpen(!isOpen)}>
        <span style={titleStyle}>{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <CaretDown size={16} color={theme.Color.Base.Content[3]} />
        </motion.div>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            style={contentStyle}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accordion;
