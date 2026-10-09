// Bloque de skeleton para el sitio publico (perfil de cliente, servicios, etc).
// Distinto del Skeleton.jsx de admin (src/components/Skeleton.jsx): ese usa la clase
// .panda-skeleton definida en index.css, que el bundle publico no carga (main-public.jsx
// solo importa public.css). Este usa .public-skeleton, definida en public.css, y admite
// className para poder dimensionarse con utilidades Tailwind igual que el resto del sitio.
export default function Skeleton({ className = '', style }) {
  return <div className={`public-skeleton ${className}`} style={style} />;
}
