import React from 'react';
import { useTheme } from '../../Theme.tsx';

interface GlobalErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const GlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  const { theme } = useTheme();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.Color.Base.Surface[1],
      color: theme.Color.Base.Content[1],
      padding: theme.space['Space.XL'],
      textAlign: 'center',
      fontFamily: theme.Type.Readable.Body.M.fontFamily
    }}>
      <h1 style={{ ...theme.Type.Expressive.Headline.L, color: theme.Color.Error.Content[1], marginBottom: theme.space['Space.M'] }}>
        Something went wrong
      </h1>
      <pre style={{
        ...theme.Type.Expressive.Data,
        backgroundColor: theme.Color.Base.Surface[2],
        padding: theme.space['Space.M'],
        borderRadius: theme.radius['Radius.M'],
        marginBottom: theme.space['Space.L'],
        maxWidth: '80%',
        overflowX: 'auto',
        color: theme.Color.Error.Content[1]
      }}>
        {error.message}
      </pre>
      <button
        onClick={resetErrorBoundary}
        style={{
          padding: `${theme.space['Space.S']} ${theme.space['Space.XL']}`,
          backgroundColor: theme.Color.Accent.Surface[1],
          color: theme.Color.Accent.Content[1],
          borderRadius: theme.radius['Radius.Full'],
          border: 'none',
          cursor: 'pointer',
          ...theme.Type.Readable.Label.L
        }}
      >
        Retry Application
      </button>
    </div>
  );
};

export default GlobalErrorFallback;
