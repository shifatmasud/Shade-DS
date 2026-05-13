import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

const NameTag: React.FC = () => {
  const { theme } = useTheme();
  
  const tagStyles: { [key: string]: React.CSSProperties } = {
    container: {
      width: '320px',
      height: '420px',
      backgroundColor: theme.Color.Base.Surface[1],
      borderRadius: '24px',
      boxShadow: theme.effects['Effect.Shadow.Drop.3'],
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: `1px solid ${theme.Color.Base.Surface[3]}`,
      position: 'relative',
    },
    header: {
      height: '100px',
      backgroundColor: theme.Color.Error.Content[1],
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
    },
    punchHole: {
      width: '40px',
      height: '12px',
      backgroundColor: theme.Color.Base.Surface[1],
      borderRadius: '6px',
      position: 'absolute',
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
    },
    content: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing['Space.XL'],
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
          DESIGN AGENT
        </motion.h1>
        
        <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2], maxWidth: '200px' }}>
          Senior Design Engineer & AI Collaborator
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          <div style={{ ...theme.Type.Expressive.Data, backgroundColor: theme.Color.Base.Surface[2], color: theme.Color.Base.Content[1], padding: '4px 8px', borderRadius: '4px' }}>
            LVL 99
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

export default NameTag;
