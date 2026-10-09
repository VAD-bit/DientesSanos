import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, User, Scissors, Sparkles, PartyPopper, Circle } from 'lucide-react';

/**
 * StepGuide — Friendly guided walkthrough for multi-step modals.
 * Shows a message bar talking to the user + dot indicators.
 *
 * Usage:
 *   <StepGuide
 *     steps={[
 *       { id: 'client', label: 'Cliente', required: true, message: 'Primero, busca el cliente por cédula o nombre', icon: '👤' },
 *       { id: 'service', label: 'Servicio', required: true, message: '¡Genial! Ahora elige el servicio', icon: '✂️' },
 *       { id: 'barber', label: 'Barbero', required: true, message: 'Perfecto. Ahora selecciona el barbero', icon: '💈' },
 *       { id: 'extras', label: 'Extras', required: false, message: 'Casi listo. Puedes agregar extras si quieres', icon: '✨' },
 *     ]}
 *     currentStep={0}
 *     completedSteps={new Set()}
 *   />
 */
const StepGuide = ({ steps, currentStep = 0, completedSteps = new Set(), compact = false, showBanner = true }) => {
  const [animDir, setAnimDir] = useState('in');
  const [displayStep, setDisplayStep] = useState(currentStep);
  const prevStep = React.useRef(currentStep);

  useEffect(() => {
    if (currentStep !== prevStep.current) {
      setAnimDir(currentStep > prevStep.current ? 'in' : 'back');
      prevStep.current = currentStep;
      // Brief delay then show new step
      const t = setTimeout(() => setDisplayStep(currentStep), 50);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  const step = steps[displayStep];
  const allDone = completedSteps.size === steps.filter(s => s.required).length;
  const totalRequired = steps.filter(s => s.required).length;
  const doneRequired = steps.filter((s, i) => s.required && completedSteps.has(i)).length;

  return (
    <div className="step-guide-container" style={{ marginBottom: compact ? '8px' : '12px' }}>
      {/* Message Banner */}
      {!compact && showBanner && (
        <div className="step-message-bar" style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '12px',
          background: allDone
            ? 'linear-gradient(135deg, rgba(50,215,75,0.08), rgba(50,215,75,0.03))'
            : 'linear-gradient(135deg, rgba(17, 17, 17, 0.08), rgba(17, 17, 17, 0.03))',
          border: allDone
            ? '1px solid rgba(50,215,75,0.15)'
            : '1px solid rgba(17, 17, 17, 0.12)',
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          marginBottom: '10px',
        }}>
          {/* Icon */}
          <div style={{
            width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
            background: allDone ? 'rgba(50,215,75,0.12)' : 'rgba(17, 17, 17, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px',
          }}>
            {allDone ? <PartyPopper size={16} color="#32d74b" /> : (step?.icon ? <step.icon size={16} color="var(--champagne)" /> : <Circle size={16} color="rgba(255,255,255,0.3)" />)}
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '11px', fontWeight: '800', color: allDone ? '#32d74b' : 'var(--champagne)',
              letterSpacing: '0.3px',
            }}>
              {allDone
                ? '¡Todo listo!'
                : `Paso ${currentStep + 1} de ${steps.length}`
              }
            </div>
            <div style={{
              fontSize: '12px', color: 'rgba(255,255,255,0.65)', fontWeight: '500', lineHeight: '1.3', marginTop: '1px',
            }}>
              {allDone
                ? 'Todos los campos requeridos están completos.'
                : (step?.message || 'Completa este paso para continuar')
              }
            </div>
          </div>

          {/* Progress counter */}
          <div style={{
            fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: '700',
            flexShrink: 0, textAlign: 'right',
          }}>
            {doneRequired}/{totalRequired}
          </div>
        </div>
      )}

      {/* Dots */}
      <div className="step-guide" style={{ padding: compact ? '0' : '0 4px' }}>
        {steps.map((s, i) => {
          const isCompleted = completedSteps.has(i);
          const isActive = i === currentStep && !isCompleted;

          return (
            <React.Fragment key={s.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <div className={`step-dot ${isCompleted ? 'step-dot--completed' : isActive ? 'step-dot--active' : 'step-dot--pending'}`}
                  style={{ width: compact ? 24 : 28, height: compact ? 24 : 28 }}>
                  {isCompleted ? (
                    <Check size={compact ? 10 : 12} strokeWidth={3} color="black"
                      style={{ animation: 'popoverPop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                  ) : (
                    <span style={{ fontSize: compact ? 9 : 10, fontWeight: '800',
                      color: isActive ? 'var(--champagne)' : 'rgba(255,255,255,0.2)' }}>
                      {i + 1}
                    </span>
                  )}
                </div>
                {!compact && (
                  <span className={`step-label ${isCompleted ? 'step-label--completed' : isActive ? 'step-label--active' : ''}`}
                    style={{ fontSize: '10px' }}>
                    {s.label}
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center',
                  paddingTop: compact ? 0 : 6, minHeight: compact ? 24 : 28 }}>
                  <div className={`step-line ${isCompleted ? 'step-line--completed' : ''}`}
                    style={{ width: '100%', height: '2px', borderRadius: '1px' }} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/**
 * StepHighlight — Wraps a form field to add a glowing border when it's the active step.
 *
 * Usage:
 *   <StepHighlight active={currentStep === 0} label="Paso 1">
 *     <FieldLabel required>Cliente</FieldLabel>
 *     <input ... />
 *   </StepHighlight>
 */
export const StepHighlight = ({ active, label, children, style = {} }) => {
  return (
    <div className={`step-highlight ${active ? 'step-highlight--active' : ''}`} style={{
      padding: active ? '12px' : '0',
      borderRadius: '16px',
      border: active ? '2px solid rgba(17, 17, 17, 0.3)' : '2px solid transparent',
      background: active ? 'rgba(17, 17, 17, 0.03)' : 'transparent',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      position: 'relative',
      ...style,
    }}>
      {active && label && (
        <div style={{
          position: 'absolute', top: '-10px', left: '16px',
          background: 'linear-gradient(135deg, var(--champagne-dark), var(--champagne-light))',
          color: 'black', fontSize: '9px', fontWeight: '800', padding: '2px 8px',
          borderRadius: '6px', letterSpacing: '0.5px', textTransform: 'uppercase',
          zIndex: 2,
        }}>
          {label}
        </div>
      )}
      {children}
    </div>
  );
};

export default StepGuide;
