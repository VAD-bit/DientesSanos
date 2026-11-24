# Backup de Cambios Visuales - Eliminación de Blur y Transparentes

**Fecha:** Tue Nov 24 2026

## Propósito
Eliminar todos los efectos de blur y transparencias del código que dañan la visualidad y hacen que los elementos se vean raros o poco claros en la aplicación Dientes Sanos.

## Cambios Realizados

### 1. src/index.css - Tokens y Variables

**Removed/Changed:**
- `--gold-glow: 0 0 24px rgba(232, 212, 176, 0.35);` → Sombra removida, usar shadow sólido
- `--border-color: rgba(0, 0, 0, 0.08);` → `--border-color: #333333;` (negro opaco)
- `--glass-bg: rgba(182, 181, 181, 0.501);` → `--glass-bg: #ffffff;` (blanco sólido)
- `--glass-border: 1px solid rgba(0, 0, 0, 0.08);` → `--glass-border: 1px solid #333333;` (borde opaco)
- `--shadow-apple: 0 8px 40px 0 rgba(0, 0, 0, 0.10);` → `--shadow-apple: 0 8px 40px 0 #333333;` (sombra opaca)
- `--shadow-glow-gold: 0 0 20px rgba(232, 212, 176, 0.25), 0 4px 20px rgba(217, 192, 143, 0.15);` → `--shadow-glow-gold: 0 0 20px #e8d4b0;` (sombra dorada opaca)

### 2. Fondo Global (index.css lines 139-140)

**Removed radial gradients with rgba:**
- `radial-gradient(ellipse 80% 60% at 10% -10%, rgba(232, 212, 176, 0.04) 0%, transparent 60%),`
- `radial-gradient(ellipse 60% 80% at 90% 110%, rgba(217, 192, 143, 0.04) 0%, transparent 60%),`

**Replaced with:** Fondo blanco sólido `#ffffff` sin gradientes.

### 3. Efectos de Sombra y Glow

**Removed:**
- `filter: brightness(0.4) blur(3px);` → `filter: brightness(0.4);` (blur removido)
- `background: radial-gradient(circle, rgba(192, 159, 112, 0.15) 0%, rgba(150, 110, 180, 0.1) 40%, transparent 70%);` → `background: #f5f5f5;` (fondo sólido)
- `filter: blur(80px);` → Removido completamente
- `box-shadow: 0 12px 30px rgba(0,0,0,0.10), 0 0 20px rgba(232, 212, 176, 0.18);` → `box-shadow: 0 12px 30px #333333, 0 0 20px #e8d4b0;`
- `background: rgba(192, 159, 112, 0.2);` → `background: #d9c08f;` (color acento opaco)
- `box-shadow: 0 8px 20px rgba(192, 159, 112, 0.15);` → `box-shadow: 0 8px 20px #d9c08f;`
- `box-shadow: 0 16px 40px -12px rgba(0,0,0,0.4), 0 0 25px rgba(232, 212, 176, 0.04);` → `box-shadow: 0 16px 40px -12px #333333, 0 0 25px #e8d4b0;`
- `background: rgba(232, 212, 176, 0.12);` → `background: #ffe8d4b0;` (aproximado, color sólido)
- `background: rgba(255, 255, 255, 0.9) !important;` → `background: #ffffff !important;` (blanco puro)
- `background: rgba(255, 255, 255, 0.9) !important;` (segunda ocurrencia) → `background: #ffffff !important;`
- `box-shadow: 0 0 0 4px rgba(192, 159, 112, 0.1), 0 0 20px rgba(192, 159, 112, 0.15) !important;` → `box-shadow: 0 0 0 4px #d9c08f, 0 0 20px #d9c08f !important;`
- `background: transparent !important;` → `background: #ffffff !important;` (o el color de fondo apropiado)
- `-webkit-text-fill-color: transparent;` → `-webkit-text-fill-color: #111111;` (texto negro)
- `background: transparent;` → `background: #ffffff;` (o color de fondo apropiado)
- `border: 1px solid transparent;` → `border: 1px solid #333333;`
- `background: rgba(232, 212, 176, 0.08);` → `background: #d9c08f;` (color acento opaco)
- `opacity: 0.5;` → `opacity: 1;` (o removido si no es necesario)
- `background: rgba(255, 255, 255, 0.9);` → `background: #ffffff;`
- `backdrop-filter: blur(24px);` → Removido completamente
- `-webkit-backdrop-filter: blur(24px);` → Removido completamente
- `box-shadow: 0 24px 50px -10px rgba(0,0,0,0.5), 0 0 30px rgba(232, 212, 176, 0.08);` → `box-shadow: 0 24px 50px -10px #333333, 0 0 30px #e8d4b0;`
- `border-color: rgba(232, 212, 176, 0.35);` → `border-color: #e8d4b0;`
- `box-shadow: 0 4px 15px rgba(232, 212, 176, 0.25);` → `box-shadow: 0 4px 15px #e8d4b0;`
- `box-shadow: 0 8px 25px rgba(232, 212, 176, 0.4);` → `box-shadow: 0 8px 25px #e8d4b0;`
- `transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s ease, opacity 0.15s ease;` → `transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);` (removido filter y opacity transitions)
- `opacity: 0.6;` (múltiples) → `opacity: 1;`
- `will-change: transform, opacity;` → `will-change: transform;` (removido opacity)
- `opacity: 0;` (múltiples) → `opacity: 1;` o removido
- `box-shadow: 0 10px 40px rgba(0,0,0,0.5);` → `box-shadow: 0 10px 40px #333333;`
- `background: linear-gradient(to bottom, var(--gold-primary), transparent);` → `background: linear-gradient(to bottom, #e8d4b0, #ffffff);`

### 4. Backdrop-filter

**Removed everywhere:**
- `backdrop-filter: blur(15px);` (2 ocurrencias)
- `-webkit-backdrop-filter: blur(15px);` (2 ocurrencias)

### 5. Componentes Específicos

**ClinicalHistoryModal.jsx:**
- `rgba(0,0,0,0.45)` overlay → `#333333` (fondo oscuro opaco)
- `rgba(255,255,255,0.9)` card background → `#ffffff`
- `backdrop-filter: blur(8px)` → Removido

**BarberPanel.jsx:**
- Varios `rgba(0,0,0,0.04)`, `rgba(255,255,255,0.04)` → colores sólidos `#333333` y `#ffffff`
- `backdrop-filter` effects removidos

**Odontograma.jsx:**
- `rgba(0,0,0,0.25)` → `#333333`
- `rgba(255,255,255,0.04)` → `#ffffff` o removido
- `rgba(255,255,255,0.18)` → `#333333`
- `rgba(255,255,255,0.45)` → `#666666`
- `rgba(255,255,255,0.55)` → `#888888`
- `rgba(232,212,176,0.06)` → `#333333`
- `rgba(232,212,176,0.18)` → `#333333`
- `rgba(255,255,255,0.8)` → `#e8d4b0` o `#ffffff` según contexto

**FinanceModule.jsx:**
- `rgba(255,255,255,0.75)` → `#ffffff`
- `rgba(0, 0, 0, 0.05)` → `#333333`
- `rgba(255, 255, 255, 0.04)` → `#ffffff`
- `rgba(0, 0, 0, 0.04)` → `#333333`

**CheckoutPOS.jsx:**
- `rgba(255, 255, 255, 0.9)` → `#ffffff`
- `rgba(0, 0, 0, 0.04)` → `#333333`
- `rgba(255, 255, 255, 0.04)` → `#ffffff`

### 6. Patrones de Opacidad Removidos

**Changed all `opacity: 0.x` to `opacity: 1` or removed where appropriate:**
- `opacity: 0.5;` → `opacity: 1;`
- `opacity: 0.6;` → `opacity: 1;`
- Varios `opacity: 0;` → `opacity: 1;` o removidos de animaciones

### 7. Gradientes

**Changed:**
- `linear-gradient(to bottom, var(--gold-primary), transparent);` → `linear-gradient(to bottom, #e8d4b0, #ffffff);`
- `linear-gradient(135deg, rgba(232, 212, 176, 0.06) !important;` → `linear-gradient(135deg, #d9c08f, #ffffff) !important;` (o el color de fondo apropiado)

## Resumen de Sustituciones de Colores

| Antes (Blur/Transparente) | Después (Sólido) |
|--------------------------|------------------|
| `rgba(0, 0, 0, 0.08)` | `#333333` |
| `rgba(0, 0, 0, 0.04)` | `#333333` |
| `rgba(0, 0, 0, 0.10)` | `#333333` |
| `rgba(0, 0, 0, 0.45)` | `#333333` |
| `rgba(255, 255, 255, 0.9)` | `#ffffff` |
| `rgba(255, 255, 255, 0.04)` | `#ffffff` |
| `rgba(255, 255, 255, 0.06)` | `#ffffff` |
| `rgba(255, 255, 255, 0.18)` | `#333333` / `#666666` |
| `rgba(255, 255, 255, 0.45)` | `#666666` |
| `rgba(255, 255, 255, 0.55)` | `#888888` |
| `rgba(232, 212, 176, 0.04)` | `#e8d4b0` / `#d9c08f` |
| `rgba(232, 212, 176, 0.06)` | `#333333` |
| `rgba(232, 212, 176, 0.18)` | `#333333` |
| `rgba(232, 212, 176, 0.35)` | `#e8d4b0` |
| `rgba(192, 159, 112, 0.15)` | `#d9c08f` |
| `rgba(150, 110, 180, 0.1)` | Removido / `#9945a1` (morado oscuro) |
| `rgba(192, 159, 112, 0.2)` | `#d9c08f` |
| `rgba(217, 192, 143, 0.15)` | `#d9c08f` |
| `rgba(48, 209, 88, 0.25)` | `#32d74b` (verde) |
| `rgba(255, 69, 58, 0.04)` | `#ff453a` / `#b22222` (rojo) |
| `opacity: 0.5` | `opacity: 1` |
| `opacity: 0.6` | `opacity: 1` |
| `opacity: 0` | `opacity: 1` o removido |
| `filter: blur(3px)` | Removido |
| `filter: blur(80px)` | Removido |
| `filter: blur(5px)` | Removido |
| `backdrop-filter: blur(24px)` | Removido |
| `backdrop-filter: blur(15px)` | Removido |
| `transparent` | `#ffffff` o `#333333` según contexto |
| `radial-gradient(..., rgba(...), transparent)` | Color sólido apropiado |

## Nota Importante

Este backup fue creado antes de aplicar los cambios para garantizar la integridad de los archivos en caso de que algún cambio rompa la funcionalidad o la apariencia visual. Los cambios han sido aplicados con el objetivo de mejorar la claridad visual eliminando efectos de blur y transparencias que el usuario reporta que "dañan la visual" y hacen que las cosas se vean "rara".

## Rollback Instructions (Si es necesario)

Para revertir estos cambios:

```bash
git reset --hard HEAD~1
```

o para revertir cambios específicos en archivos:

```bash
git checkout -- src/index.css
git checkout -- src/components/BarberPanel.jsx
git checkout -- src/components/ClinicalHistoryModal.jsx
# etc.
```