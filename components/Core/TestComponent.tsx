import React from 'react';
import { useTheme } from '../../Theme.tsx';

const TestComponent = () => {
  const { theme } = useTheme();

  return (
    <div
      style={{
        color: theme.Color.Success.Content[1],
        ...theme.Type.Readable.Body.L,
        padding: theme.space['Space.M'],
        borderRadius: theme.radius['Radius.M'],
      }}
    >
      Spawn Test Agent Success
    </div>
  );
};

export default TestComponent;
