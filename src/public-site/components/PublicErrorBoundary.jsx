import React from 'react';

// Evita que un error de render (p. ej. en el flujo de reservas) deje la página en
// negro: muestra un fallback con opción de recargar. También registra el
// componentStack para diagnóstico, y lo deja visible/copiable en pantalla — antes
// solo iba a la consola del navegador, así que reportar un bug significaba abrir
// devtools; ahora "Ver detalles técnicos" + "Copiar error" alcanza.
export default class PublicErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, componentStack: '', showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[PublicErrorBoundary]', error?.message, '\ncomponentStack:', info?.componentStack);
    this.setState({ componentStack: info?.componentStack || '' });
  }

  handleCopy = async () => {
    const { error, componentStack } = this.state;
    const text = `${error?.message || 'Error desconocido'}\n\n${error?.stack || ''}\n\nComponent stack:${componentStack}`;
    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      // Clipboard API can be blocked (permissions, non-HTTPS context); the text is
      // still selectable/copyable manually from the <pre> below either way.
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, componentStack, showDetails, copied } = this.state;
      const errorText = `${error?.message || 'Error desconocido'}\n\n${error?.stack || ''}\n\nComponent stack:${componentStack}`;
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f4f5f3', color: '#111111', textAlign: 'center', padding: 24 }}>
          <h2 style={{ fontWeight: 900, fontSize: 22, margin: 0 }}>Algo salió mal</h2>
          <p style={{ color: '#64748b', fontSize: 14, maxWidth: 420, margin: 0 }}>
            Ocurrió un error al cargar esta página. Recárgala para intentar de nuevo.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#111111', color: '#ffffff', fontWeight: 800, padding: '12px 24px', borderRadius: 999, border: 'none', cursor: 'pointer' }}
            >
              Recargar
            </button>
            <button
              onClick={() => this.setState({ showDetails: !showDetails })}
              style={{ background: 'transparent', color: '#111111', fontWeight: 600, fontSize: 13, padding: '12px 18px', borderRadius: 999, border: '1px solid rgba(217, 192, 143, 0.3)', cursor: 'pointer' }}
            >
              {showDetails ? 'Ocultar detalles técnicos' : 'Ver detalles técnicos'}
            </button>
          </div>

          {showDetails && (
            <div style={{ width: '100%', maxWidth: 640, marginTop: 8, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                <button
                  onClick={this.handleCopy}
                  style={{ background: 'rgba(17, 17, 17, 0.1)', color: '#111111', fontWeight: 700, fontSize: 12, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(17, 17, 17, 0.3)', cursor: 'pointer' }}
                >
                  {copied ? 'Copiado ✓' : 'Copiar error'}
                </button>
              </div>
              <pre
                style={{
                  background: '#ffffff', border: '1px solid rgba(217, 192, 143, 0.2)', borderRadius: 12,
                  padding: 14, fontSize: 11.5, lineHeight: 1.5, color: '#334155',
                  maxHeight: '40vh', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  userSelect: 'text', fontFamily: 'ui-monospace, monospace', textAlign: 'left', margin: 0,
                }}
              >
                {errorText}
              </pre>
            </div>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
