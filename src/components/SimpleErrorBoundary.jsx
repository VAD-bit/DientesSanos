import React from 'react';
import pandaLogo from '../assets/panda_logo_nobg.png';

export class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'var(--bg-secondary)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center'
          }}>
            {/* Logo */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 28px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(17, 17, 17, 0.15), rgba(17, 17, 17, 0.05))',
              border: '1px solid rgba(17, 17, 17, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(17, 17, 17, 0.1)'
            }}>
              <img
                src={pandaLogo}
                alt="Dientes Sanos"
                style={{ width: '48px', height: '48px', objectFit: 'contain', filter: 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(17, 17, 17, 0.3))' }}
              />
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: '22px',
              fontWeight: '800',
              margin: '0 0 10px',
              color: 'white',
              letterSpacing: '-0.3px'
            }}>
              Algo salió mal
            </h2>

            {/* Description */}
            <p style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.45)',
              margin: '0 0 28px',
              lineHeight: '1.6',
              maxWidth: '320px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}>
              La aplicación encontró un error inesperado. No te preocupes, puedes recargar para continuar.
            </p>

            {/* Reload Button */}
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '13px 32px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #111111, #111111, #111111)',
                color: '#0a0a0c',
                fontWeight: '800',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(17, 17, 17, 0.25)',
                transition: 'all 0.2s ease',
                letterSpacing: '0.2px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(17, 17, 17, 0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(17, 17, 17, 0.25)';
              }}
            >
              Recargar página
            </button>

            {/* Error Details */}
            <details style={{ marginTop: '32px', textAlign: 'left' }}>
              <summary style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
                cursor: 'pointer',
                fontWeight: '600',
                letterSpacing: '0.3px',
                outline: 'none',
                userSelect: 'none'
              }}>
                Detalles del error
              </summary>
              <pre style={{
                marginTop: '10px',
                padding: '14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.4)',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: '180px',
                lineHeight: '1.5',
                fontFamily: "'SF Mono', 'Fira Code', monospace"
              }}>
                {this.state.error && this.state.error.toString()}
                {'\n\n'}
                {this.state.info && this.state.info.componentStack}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
