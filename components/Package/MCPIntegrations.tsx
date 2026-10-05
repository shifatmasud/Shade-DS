import React, { useState, useEffect } from 'react';
import { useTheme } from '../../Theme.tsx';
import Button from '../Core/Button.tsx';
import Input from '../Core/Input.tsx';
import { Power, Check, Warning, Globe, Lock } from 'phosphor-react';

interface MCPServer {
  name: string;
  url: string;
  connected: boolean;
  needsAuth: boolean;
  clientId?: string;
  clientSecret?: string;
}

const MCPIntegrations = () => {
  const { theme } = useTheme();
  const [servers, setServers] = useState<Record<string, any>>({});
  const [credentials, setCredentials] = useState({
    raylightClientId: '',
    raylightClientSecret: '',
    upsyClientId: '',
    upsyClientSecret: ''
  });
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
    fetchCliConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/mcp/config');
      const data = await res.json();
      setServers(data.servers || {});
    } catch (err) {
      console.error('Failed to fetch MCP config:', err);
    }
  };

  const fetchCliConfig = async () => {
    try {
      const res = await fetch('/api/cli/config');
      const data = await res.json();
      // We don't get secrets back, just masked values if set
    } catch (err) {}
  };

  const handleSaveCredentials = async () => {
    setLoading('saving');
    try {
      await fetch('/api/cli/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      alert('Credentials saved. You can now connect.');
    } catch (err) {
      alert('Failed to save credentials');
    } finally {
      setLoading(null);
    }
  };

  const handleConnect = async (provider: string) => {
    setLoading(provider);
    try {
      const res = await fetch(`/api/auth/${provider}`);
      const data = await res.json();
      if (data.url) {
        const authWindow = window.open(data.url, 'mcp_auth', 'width=600,height=700');
        
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === provider) {
            fetchConfig();
            window.removeEventListener('message', handleMessage);
          }
        };
        window.addEventListener('message', handleMessage);
      } else {
        alert(data.error || 'Failed to initiate auth');
      }
    } catch (err) {
      alert('Failed to initiate auth');
    } finally {
      setLoading(null);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.XL'],
    padding: theme.space['Space.XL'],
  };

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.M'],
  };

  const cardStyle: React.CSSProperties = {
    padding: theme.space['Space.L'],
    backgroundColor: theme.Color.Base.Surface[2],
    ...theme.border.getBorder1px(theme.Color.Base.Surface[3]),
    borderRadius: theme.Radius.M,
    display: 'flex',
    flexDirection: 'column',
    gap: theme.space['Space.M'],
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const statusBadge = (connected: boolean) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: theme.space['Space.S'],
      padding: `${theme.space['Space.XS']} ${theme.space['Space.S']}`,
      borderRadius: theme.Radius.Full,
      backgroundColor: connected ? theme.Color.Status.Success.Surface : theme.Color.Base.Surface[3],
      color: connected ? theme.Color.Status.Success.Content : theme.Color.Base.Content[2],
      fontSize: theme.Type.Caption[2].fontSize,
    }}>
      {connected ? <Check size={12} weight="bold" /> : <Power size={12} />}
      {connected ? 'CONNECTED' : 'DISCONNECTED'}
    </div>
  );

  return (
    <div style={containerStyle}>
      <div style={sectionStyle}>
        <div style={{ ...theme.Type.Heading[3], color: theme.Color.Base.Content[1] }}>MCP Integrations</div>
        <div style={{ ...theme.Type.Body[2], color: theme.Color.Base.Content[2] }}>
          Connect to external Model Context Protocol servers via OAuth.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ ...theme.Type.Heading[4], color: theme.Color.Base.Content[1] }}>1. Configure Developer Credentials</div>
        <div style={cardStyle}>
          <div style={sectionStyle}>
            <div style={theme.Type.Caption[1]}>Raylight Developer Portal</div>
            <Input 
              placeholder="Raylight Client ID" 
              value={credentials.raylightClientId} 
              onChange={(e) => setCredentials({...credentials, raylightClientId: e.target.value})} 
            />
            <Input 
              placeholder="Raylight Client Secret" 
              type="password"
              value={credentials.raylightClientSecret} 
              onChange={(e) => setCredentials({...credentials, raylightClientSecret: e.target.value})} 
            />
          </div>
          <div style={{ height: 1, backgroundColor: theme.Color.Base.Surface[3] }} />
          <div style={sectionStyle}>
            <div style={theme.Type.Caption[1]}>Upsy Developer Portal</div>
            <Input 
              placeholder="Upsy Client ID" 
              value={credentials.upsyClientId} 
              onChange={(e) => setCredentials({...credentials, upsyClientId: e.target.value})} 
            />
            <Input 
              placeholder="Upsy Client Secret" 
              type="password"
              value={credentials.upsyClientSecret} 
              onChange={(e) => setCredentials({...credentials, upsyClientSecret: e.target.value})} 
            />
          </div>
          <Button 
            label={loading === 'saving' ? "Saving..." : "Save Credentials"} 
            variant="primary" 
            onClick={handleSaveCredentials} 
            disabled={!!loading}
          />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ ...theme.Type.Heading[4], color: theme.Color.Base.Content[1] }}>2. Connect Services</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.space['Space.M'] }}>
          {['raylight', 'upsy'].map(id => (
            <div key={id} style={cardStyle}>
              <div style={headerStyle}>
                <div style={{ ...theme.Type.Body[1], textTransform: 'capitalize' }}>{id}</div>
                {statusBadge(!!servers[id]?.headers?.Authorization)}
              </div>
              <div style={{ ...theme.Type.Caption[2], color: theme.Color.Base.Content[3] }}>
                {id === 'raylight' ? 'Motion design editor' : 'AI Assistant connector'}
              </div>
              <Button 
                label={loading === id ? "Connecting..." : (servers[id]?.headers?.Authorization ? "Reconnect" : "Connect")} 
                variant={servers[id]?.headers?.Authorization ? "secondary" : "primary"}
                onClick={() => handleConnect(id)}
                disabled={!!loading}
              />
            </div>
          ))}
        </div>
      </div>
      
      <div style={sectionStyle}>
         <div style={{ ...theme.Type.Caption[2], color: theme.Color.Base.Content[3], display: 'flex', gap: theme.space['Space.S'], alignItems: 'center' }}>
            <Globe size={14} />
            Callback URIs:
         </div>
         <div style={{ 
            padding: theme.space['Space.M'], 
            backgroundColor: theme.Color.Base.Surface[1], 
            borderRadius: theme.Radius.S,
            fontSize: 10,
            fontFamily: 'monospace',
            color: theme.Color.Base.Content[2],
            wordBreak: 'break-all'
         }}>
            Raylight: {window.location.origin}/api/auth/callback/raylight<br/>
            Upsy: {window.location.origin}/api/auth/callback/upsy
         </div>
      </div>
    </div>
  );
};

export default MCPIntegrations;
