import React, { useEffect } from 'react';
import { motion, useMotionValue, type MotionValue } from 'framer-motion';
import { useTheme } from '../../Theme.tsx';

interface NameTagProps {
  customRadius?: string | MotionValue<string>;
  customFill?: string | MotionValue<string>;
  customColor?: string | MotionValue<string>;
  tagHeaderText?: string;
  tagSubHeaderText?: string;
  tagName?: string;
  tagRole?: string;
  tagLevel?: string;
  tagBadgeText?: string;
  tagHeaderColor?: string;
  tagPunchHole?: boolean;
}

const NameTag: React.FC<NameTagProps> = ({
  customRadius,
  customFill,
  customColor,
  tagHeaderText = 'HELLO',
  tagSubHeaderText = 'my name is',
  tagName = 'DESIGN AGENT',
  tagRole = 'Senior Design Engineer & AI Collaborator',
  tagLevel = 'LVL 99',
  tagBadgeText = 'PROTOTYPER',
  tagHeaderColor,
  tagPunchHole = true,
}) => {
  const { theme } = useTheme();

  // Helper hook to resolve props that could be static values or MotionValues
  const useResolvedMotionValue = (prop: any, fallback: string): any => {
    const isMV = prop && typeof prop === 'object' && 'get' in prop && 'on' in prop;
    const resolvedMV = useMotionValue(isMV ? (prop.get() || fallback) : (prop || fallback));
    
    useEffect(() => {
      const updateValue = () => {
        const currentVal = isMV ? prop.get() : prop;
        resolvedMV.set(currentVal || fallback);
      };
      
      updateValue();
      
      if (isMV) {
        const unsubscribe = prop.on("change", (v: any) => {
          resolvedMV.set(v || fallback);
        });
        return unsubscribe;
      }
    }, [prop, isMV, fallback]);

    return resolvedMV;
  };

  const resolvedRadius = useResolvedMotionValue(customRadius, theme.radius['Radius.L']);
  const resolvedFill = useResolvedMotionValue(customFill, theme.Color.Base.Surface[1]);
  const resolvedColor = useResolvedMotionValue(customColor, theme.Color.Base.Content[1]);
  
  const tagStyles: { [key: string]: React.CSSProperties } = {
    container: {
      width: theme.space['Space.Panel.Width'],
      height: '420px',
      backgroundColor: resolvedFill,
      borderRadius: resolvedRadius,
      boxShadow: `0 0 1px 0px ${theme.Color.Base.Surface[3]}, inset 0 0 1px 0px ${theme.Color.Base.Surface[3]}, ${theme.effects['Effect.Shadow.Drop.3']}`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      border: 'none',
      position: 'relative',
    },
    punchHole: {
      position: 'absolute' as const,
      top: '12px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '44px',
      height: '10px',
      borderRadius: '5px',
      backgroundColor: theme.Color.Base.Surface[3],
      boxShadow: `inset 0 1px 2px rgba(0,0,0,0.15)`,
      zIndex: 10,
    },
    header: {
      height: '110px',
      backgroundColor: tagHeaderColor || theme.Color.Error.Content[1],
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#FFFFFF',
      paddingTop: tagPunchHole ? '16px' : '0px',
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
      {tagPunchHole !== false && <div style={tagStyles.punchHole} />}
      
      <div style={tagStyles.header}>
        <span style={{ ...theme.Type.Expressive.Display.S, lineHeight: 1, margin: 0, letterSpacing: '0.05em' }}>{tagHeaderText}</span>
        <span style={{ ...theme.Type.Readable.Label.S, textTransform: 'uppercase', opacity: 0.8 }}>{tagSubHeaderText}</span>
      </div>

      <div style={tagStyles.content}>
        <motion.h1 
          style={{ 
            ...theme.Type.Expressive.Display.M, 
            color: resolvedColor,
            margin: 0,
            borderBottom: `2px dashed ${theme.Color.Base.Surface[3]}`,
            width: '100%',
            paddingBottom: '12px',
            marginBottom: '12px'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {tagName}
        </motion.h1>
        
        <p style={{ ...theme.Type.Readable.Body.M, color: theme.Color.Base.Content[2], maxWidth: '240px' }}>
          {tagRole}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
          {tagLevel && (
            <div style={{ ...theme.Type.Expressive.Data, backgroundColor: theme.Color.Base.Surface[2], color: theme.Color.Base.Content[1], padding: '4px 8px', borderRadius: '4px' }}>
              {tagLevel}
            </div>
          )}
          {tagBadgeText && (
            <div style={{ ...theme.Type.Expressive.Data, backgroundColor: theme.Color.Active.Surface[1], color: theme.Color.Active.Content[1], padding: '4px 8px', borderRadius: '4px' }}>
              {tagBadgeText}
            </div>
          )}
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
