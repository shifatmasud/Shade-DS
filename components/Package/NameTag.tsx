import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';
import { addPropertyControls, ControlType } from '../framer-shims.ts';

interface NameTagProps {
  title?: string;
  subtitle?: string;
  badgeStyle?: {
    headerColor?: string;
    level?: string;
  };
}

const NameTag: React.FC<NameTagProps> = ({ 
  title = "DESIGN AGENT", 
  subtitle = "Senior Design Engineer & AI Collaborator", 
  badgeStyle 
}) => {
  const { theme } = useTheme();
  
  // Dynamic header background and level label resolving
  const headerFill = badgeStyle?.headerColor || theme.Color.Error.Content[1];
  const levelText = badgeStyle?.level || "LVL 99";

  const tagStyles: { [key: string]: React.CSSProperties } = {
    container: {
      width: theme.space['Space.Panel.Width'],
      height: '420px',
      backgroundColor: theme.Color.Base.Surface[1],
      borderRadius: theme.radius['Radius.L'],
      boxShadow: `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: 'none',
      position: 'relative',
    },
    header: {
      height: '100px',
      backgroundColor: headerFill,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      transition: `background-color ${theme.time['Time.2x']} ease`,
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.space['Space.XL'],
      textAlign: 'center',
    }
  };

  return (
    <motion.div 
      style={tagStyles.container}
      whileHover={{ y: -10, rotate: 1 }}
      whileTap={{ scale: 0.98 }}
    >
      <div style={tagStyles.punchHole} />
      
      <div style={tagStyles.header}>
        <span style={{ ...theme.Type.Expressive.Display.S, lineHeight: 1, margin: 0, letterSpacing: '0.05em' }}>HELLO</span>
        <span style={{ ...theme.Type.Readable.Label.S, textTransform: 'uppercase', opacity: 0.8 }}>my name is</span>
      </div>

      <div style={tagStyles.content}>
        <motion.h1 
          style={{ 
            ...theme.Type.Expressive.Display.M, 
            color: theme.Color.Base.Content[1],
            margin: 0,
            borderBottom: `2px dashed ${theme.Color.Base.Surface[3]}`,
            width: '100%',
            paddingBottom: '12px',
            marginBottom: '12px'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {title}
        </motion.h1>
         
        <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2], maxWidth: '240px' }}>
          {subtitle}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          <div style={{ ...theme.Type.Expressive.Data, backgroundColor: theme.Color.Base.Surface[2], color: theme.Color.Base.Content[1], padding: '4px 8px', borderRadius: '4px' }}>
            {levelText}
          </div>
          <div style={{ ...theme.Type.Expressive.Data, backgroundColor: theme.Color.Active.Surface[1], color: theme.Color.Active.Content[1], padding: '4px 8px', borderRadius: '4px' }}>
             PROTOTYPER
          </div>
        </div>
      </div>

      <div style={{ 
        height: '12px', 
        background: `linear-gradient(90deg, ${theme.Color.Focus.Content[1]}, ${theme.Color.Active.Content[1]}, ${theme.Color.Success.Content[1]})` 
      }} />
    </motion.div>
  );
};

// Register Framer properties dynamically
addPropertyControls(NameTag, {
  title: {
    type: ControlType.String,
    title: "Title",
    defaultValue: "DESIGN AGENT",
  },
  subtitle: {
    type: ControlType.String,
    title: "Subtitle",
    defaultValue: "Senior Design Engineer & AI Collaborator",
  },
  badgeStyle: {
    type: ControlType.Object,
    title: "Badge Style",
    controls: {
      headerColor: {
        type: ControlType.Color,
        title: "Header Color",
        defaultValue: "#FF3366",
      },
      level: {
        type: ControlType.String,
        title: "LVL Label",
        defaultValue: "LVL 99",
      }
    }
  }
});

export default NameTag;
