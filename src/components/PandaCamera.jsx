import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, RefreshCw, Upload, Image as ImageIcon, ChevronLeft, ZoomIn, ZoomOut, SwitchCamera } from 'lucide-react';
import logo from '../assets/logo.png';

/**
 * PandaCamera - Un componente premium para capturar o subir fotos.
 * Diseñado para permitir ambas opciones desde el primer momento, con reencuadre interactivo (drag-to-crop).
 *
 * `initialAction` ('camera' | 'gallery'): si el llamador ya preguntó de dónde quiere la foto
 * (ej. un menú pequeño junto al avatar), salta directo a esa acción y omite la pantalla de elección.
 */
const PandaCamera = ({ onCapture, onClose, overlayClass, cardClass, initialAction, aspectRatio }) => {
  const cleanCardClass = cardClass ? cardClass.replace('global-modal-card', '') : '';
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const streamRef = useRef(null);
  const galleryTriggeredRef = useRef(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  // 'choice' = pantalla inicial (elegir cámara o galería), 'camera' = visor en vivo,
  // 'pending' = ya disparamos el selector de archivos nativo y no hay nada que mostrar todavía
  const [mode, setMode] = useState(
    initialAction === 'camera' ? 'camera' : initialAction === 'gallery' ? 'pending' : 'choice'
  );

  // Crop / Drag / Zoom States
  const [imgDetails, setImgDetails] = useState({
    naturalWidth: 0,
    naturalHeight: 0,
    baseScale: 1,
    scaledWidth: 0,
    scaledHeight: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    viewportWidth: 0,
    viewportHeight: 0
  });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 3;

  // Zoom digital de la vista en vivo (antes de disparar)
  const [liveZoom, setLiveZoom] = useState(1);
  // 'environment' = cámara trasera, 'user' = cámara frontal (selfie)
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const positionStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async (facing = facingMode) => {
    try {
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        streamRef.current = mediaStream;
        setError(null);
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }

      // Detectar si el dispositivo tiene más de una cámara (ej. frontal + trasera en celulares)
      // para solo mostrar el botón de cambio cuando realmente tenga sentido (no en laptops de 1 cámara).
      // enumerateDevices() no siempre es confiable en móvil, así que lo combinamos con una
      // detección de pantalla táctil: casi todo celular/tablet con cámara trae frontal Y trasera,
      // mientras que una laptop/computadora normalmente no es táctil y trae solo una cámara.
      const isTouchDevice = (typeof window !== 'undefined') &&
        (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(cams.length > 1 || isTouchDevice);
      } catch (enumErr) {
        // Si el navegador no permite enumerar, nos apoyamos solo en la detección táctil
        setHasMultipleCameras(isTouchDevice);
      }
    } catch (err) {
      setError("Cámara no disponible, pero puedes subir fotos.");
      console.warn("Camera access failed:", err);
    }
  };

  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    setLiveZoom(1);
    startCamera(next);
  };

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      // Recorta el frame según el zoom digital en vivo, para que la foto capturada
      // coincida exactamente con lo que se veía acercado en el visor
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cropW = vw / liveZoom;
      const cropH = vh / liveZoom;
      const sx = (vw - cropW) / 2;
      const sy = (vh - cropH) / 2;

      canvas.width = cropW;
      canvas.height = cropH;
      const context = canvas.getContext('2d');
      context.drawImage(video, sx, sy, cropW, cropH, 0, 0, cropW, cropH);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
      setLiveZoom(1);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadstart = () => setError("Leyendo archivo...");
      reader.onloadend = () => {
        setCapturedImage(reader.result);
        setError(null);
        stopCamera();
        e.target.value = ''; // Clear for same-file re-uploads
      };
      reader.onerror = () => {
        setError("Error al leer el archivo. Intenta con otra imagen.");
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  // Si nos abrieron directo a "galería" y el usuario cierra el selector nativo sin elegir nada,
  // no queda nada que mostrar: cerramos el modal completo en vez de dejarlo flotando vacío.
  const handleFilePickerCancel = () => {
    if (initialAction === 'gallery' && !capturedImage) {
      onClose();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setImgDetails({
      naturalWidth: 0,
      naturalHeight: 0,
      baseScale: 1,
      scaledWidth: 0,
      scaledHeight: 0,
      minX: 0,
      maxX: 0,
      minY: 0,
      maxY: 0,
      viewportWidth: 0,
      viewportHeight: 0
    });
    setPosition({ x: 0, y: 0 });
    setZoom(1);
    setMode('choice');
  };

  const goToChoice = () => {
    stopCamera();
    setLiveZoom(1);
    setMode('choice');
  };

  const startCameraMode = () => {
    setMode('camera');
    startCamera();
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    const container = img.parentElement;
    const vW = container.clientWidth || 300;
    const vH = container.clientHeight || 400;

    const iW = img.naturalWidth || 300;
    const iH = img.naturalHeight || 400;

    const baseScale = Math.max(vW / iW, vH / iH);
    const sW = iW * baseScale;
    const sH = iH * baseScale;

    const minX = vW - sW;
    const minY = vH - sH;

    setZoom(1);
    setImgDetails({
      naturalWidth: iW,
      naturalHeight: iH,
      baseScale,
      scaledWidth: sW,
      scaledHeight: sH,
      minX,
      maxX: 0,
      minY,
      maxY: 0,
      viewportWidth: vW,
      viewportHeight: vH
    });

    // Center the image initially
    setPosition({
      x: (vW - sW) / 2,
      y: (vH - sH) / 2
    });
  };

  // Acerca/aleja la imagen manteniendo fijo el punto que está en el centro del recuadro
  const handleZoomChange = (newZoomRaw) => {
    const { naturalWidth: iW, naturalHeight: iH, baseScale, viewportWidth: vW, viewportHeight: vH } = imgDetails;
    if (!iW || !iH) return;

    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoomRaw));
    const oldSW = iW * baseScale * zoom;
    const oldSH = iH * baseScale * zoom;
    const newSW = iW * baseScale * newZoom;
    const newSH = iH * baseScale * newZoom;

    const centerXRatio = (vW / 2 - position.x) / oldSW;
    const centerYRatio = (vH / 2 - position.y) / oldSH;

    const minX = Math.min(0, vW - newSW);
    const minY = Math.min(0, vH - newSH);

    const newX = Math.max(minX, Math.min(0, vW / 2 - centerXRatio * newSW));
    const newY = Math.max(minY, Math.min(0, vH / 2 - centerYRatio * newSH));

    setImgDetails(prev => ({ ...prev, scaledWidth: newSW, scaledHeight: newSH, minX, maxX: 0, minY, maxY: 0 }));
    setPosition({ x: newX, y: newY });
    setZoom(newZoom);
  };

  const handleWheelZoom = (e) => {
    if (imgDetails.naturalWidth === 0) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    handleZoomChange(zoom + delta);
  };

  // Mouse Drag Events
  const handleDragStart = (e) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    positionStart.current = { ...position };
  };

  const handleDragMove = (e) => {
    if (!isDragging.current || imgDetails.naturalWidth === 0) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;

    let newX = positionStart.current.x + dx;
    let newY = positionStart.current.y + dy;

    newX = Math.max(imgDetails.minX, Math.min(imgDetails.maxX, newX));
    newY = Math.max(imgDetails.minY, Math.min(imgDetails.maxY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    isDragging.current = false;
  };

  // Touch Events
  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    positionStart.current = { ...position };
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || e.touches.length !== 1 || imgDetails.naturalWidth === 0) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;

    let newX = positionStart.current.x + dx;
    let newY = positionStart.current.y + dy;

    newX = Math.max(imgDetails.minX, Math.min(imgDetails.maxX, newX));
    newY = Math.max(imgDetails.minY, Math.min(imgDetails.maxY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
  };

  const confirm = () => {
    if (imgDetails.naturalWidth > 0 && imgDetails.naturalHeight > 0) {
      const cropCanvas = document.createElement('canvas');
      const scale = imgDetails.scaledWidth / imgDetails.naturalWidth;
      
      const wCrop = imgDetails.viewportWidth / scale;
      const hCrop = imgDetails.viewportHeight / scale;

      const sX = -position.x / scale;
      const sY = -position.y / scale;

      // High-res output dynamic aspect ratio to match the crop viewport and prevent scaling distortions
      const ratio = imgDetails.viewportWidth / imgDetails.viewportHeight;
      const targetW = 900;
      const targetH = Math.round(900 / ratio);

      cropCanvas.width = targetW;
      cropCanvas.height = targetH;

      const ctx = cropCanvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const tempImg = new Image();
      tempImg.onload = () => {
        ctx.drawImage(
          tempImg,
          sX, sY, wCrop, hCrop,
          0, 0, targetW, targetH
        );
        const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.85);
        onCapture(croppedDataUrl);
        stopCamera();
        onClose();
      };
      tempImg.src = capturedImage;
    } else {
      onCapture(capturedImage);
      stopCamera();
      onClose();
    }
  };

  useEffect(() => {
    // Si ya nos dijeron qué acción tomar (desde un menú externo), la ejecutamos de una vez
    // y nos saltamos la pantalla de elección de pantalla completa.
    // Nota: en desarrollo, React.StrictMode ejecuta este efecto dos veces para detectar
    // bugs; sin el "guard" de galleryTriggeredRef, el selector de archivos nativo se
    // abría dos veces seguidas. El guard evita eso sin afectar la limpieza de la cámara.
    if (initialAction === 'camera') {
      startCamera();
    } else if (initialAction === 'gallery' && !galleryTriggeredRef.current) {
      galleryTriggeredRef.current = true;
      fileInputRef.current?.click();
    }
    return stopCamera;
  }, []);

  // Mientras esperamos a que el usuario elija un archivo en el selector nativo, no mostramos
  // nada nuestro encima: evita el "doble modal" (nuestra pantalla + el selector del sistema).
  if (mode === 'pending' && !capturedImage) {
    return (
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        onCancel={handleFilePickerCancel}
        accept="image/*"
        style={{ display: 'none' }}
      />
    );
  }

  return (
    <div className={`${overlayClass || 'animate-fade-in'} modal-centered-overlay`} style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(circle at 50% 0%, rgba(17, 17, 17, 0.08) 0%, rgba(0,0,0,0) 45%), linear-gradient(180deg, var(--bg-secondary) 0%, #f4f5f3 100%)',
      backdropFilter: 'blur(15px)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden'
    }}>
      {/* Ambient gold glow, misma firma visual que el login */}
      <div className="panda-cam-glow-orb" />

      {/* Header with Close */}
      <div style={{ position: 'absolute', top: 'max(24px, env(safe-area-inset-top, 24px))', left: 0, right: 0, padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 12 }}>
        {mode === 'camera' && !capturedImage ? (
          <button onClick={goToChoice} className="panda-cam-back-btn">
            <ChevronLeft size={16} /> Atrás
          </button>
        ) : (
          <div style={{ width: '40px' }} />
        )}
        <button
          onClick={onClose}
          className="panda-cam-icon-btn"
          title="Cancelar y cerrar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Viewport. Más alto mientras se elige/encuadra en vivo (mejor visibilidad),
          y cuadrado 1:1 solo en la etapa final de recorte (así coincide con los avatares del CRM). */}
      <div className={cleanCardClass || 'animate-scale-in'} style={{
        position: 'relative',
        width: '100%',
        maxWidth: capturedImage ? '440px' : '340px',
        maxHeight: 'calc(100vh - 260px)',
        aspectRatio: capturedImage ? (aspectRatio || '1/1') : '3/5',
        backgroundColor: 'var(--bg-secondary)',
        overflow: 'hidden',
        borderRadius: '40px',
        border: '1.5px solid transparent',
        backgroundImage: 'linear-gradient(#050505, #050505), var(--gold-gradient)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(17, 17, 17, 0.12)',
        margin: 'auto',
        transition: 'aspect-ratio 0.3s ease'
      }}>
        {!capturedImage && mode === 'choice' ? (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            padding: '32px'
          }}>
            <button
              onClick={startCameraMode}
              className="panda-cam-choice-btn"
            >
              <div className="panda-cam-choice-icon">
                <Camera size={20} color="var(--gold-primary)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>Tomar foto</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Usar la cámara ahora</div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current.click()}
              className="panda-cam-choice-btn"
            >
              <div className="panda-cam-choice-icon">
                <Upload size={20} color="var(--gold-primary)" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>Subir de galería</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Elegir una foto existente</div>
              </div>
            </button>
          </div>
        ) : !capturedImage ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: error ? 0.3 : 1,
                transform: `scale(${liveZoom})${facingMode === 'user' ? ' scaleX(-1)' : ''}`,
                transformOrigin: 'center center',
                transition: 'transform 0.1s ease-out'
              }}
            />

            {/* Visual Guides */}
            {!error && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: '1px solid rgba(255, 255, 255,0.2)', width: '80%', height: '80%', borderRadius: '20px', pointerEvents: 'none' }} />
            )}

            {error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
                <ImageIcon size={48} color="rgba(255, 255, 255,0.3)" style={{ marginBottom: '20px' }} />
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: '500', lineHeight: 1.5 }}>{error}</p>
              </div>
            )}

            {/* Camera switch (solo si el dispositivo tiene más de una cámara) */}
            {hasMultipleCameras && !error && (
              <button
                onClick={switchCamera}
                className="panda-cam-icon-btn"
                style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 5 }}
              >
                <SwitchCamera size={18} />
              </button>
            )}

            {/* Action Bar: solo el disparador, para no tapar la cara con controles */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: 0,
              right: 0,
              padding: '20px 32px 28px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <button
                onClick={takePhoto}
                disabled={!!error}
                className="panda-cam-shutter"
                style={{
                  opacity: error ? 0.3 : 1,
                  cursor: error ? 'not-allowed' : 'pointer'
                }}
              >
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'var(--gold-gradient)',
                  animation: !error ? 'shutterPulse 2s infinite' : 'none'
                }} />
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              borderRadius: 'inherit',
              cursor: 'grab',
              animation: 'slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheelZoom}
          >
            <img 
              src={capturedImage} 
              alt="Preview" 
              onLoad={handleImageLoad}
              style={{ 
                position: 'absolute',
                width: imgDetails.scaledWidth ? `${imgDetails.scaledWidth}px` : '100%', 
                height: imgDetails.scaledHeight ? `${imgDetails.scaledHeight}px` : '100%', 
                left: `${position.x}px`,
                top: `${position.y}px`,
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: 'none',
                maxHeight: 'none'
              }} 
            />

            {/* Grid overlay for cropping guides */}
            <div style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              border: '2px solid var(--gold-primary)',
              pointerEvents: 'none',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%', borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%', borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', height: '33.33%' }}>
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%', borderRight: '1px dashed rgba(255,255,255,0.15)' }} />
                <div style={{ width: '33.33%' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom en vivo: fuera del recuadro, debajo, para no tapar la cara/foto mientras encuadras */}
      {mode === 'camera' && !capturedImage && !error && (
        <div style={{
          width: '100%',
          maxWidth: '260px',
          marginTop: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px',
          borderRadius: '30px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(17, 17, 17, 0.2)',
          position: 'relative',
          zIndex: 12
        }}>
          <ZoomOut size={14} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={liveZoom}
            onChange={(e) => setLiveZoom(parseFloat(e.target.value))}
            className="panda-cam-zoom-slider"
            style={{ flex: 1 }}
          />
          <ZoomIn size={14} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
        </div>
      )}

      {/* Controles del recorte: todos fuera de la foto, nada tapa la imagen */}
      {capturedImage && (
        <div style={{
          width: '100%',
          maxWidth: '300px',
          marginTop: '18px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '14px',
          position: 'relative',
          zIndex: 12
        }}>
          <p style={{
            fontSize: '11.5px',
            color: 'rgba(255,255,255,0.55)',
            fontWeight: '600',
            letterSpacing: '0.3px',
            textAlign: 'center',
            margin: 0
          }}>
            Arrastra la foto y usa el zoom para reencuadrar
          </p>

          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 16px',
            borderRadius: '30px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(17, 17, 17, 0.2)'
          }}>
            <ZoomOut size={14} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="panda-cam-zoom-slider"
              style={{ flex: 1 }}
            />
            <ZoomIn size={14} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
            <button
              onClick={retake}
              style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <RefreshCw size={20} />
            </button>
            <button
              onClick={confirm}
              className="panda-cam-confirm-btn"
            >
              <Check size={28} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        onCancel={handleFilePickerCancel}
        accept="image/*"
        style={{ display: 'none' }}
      />

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes shutterPulse { 0% { transform: scale(1); } 50% { transform: scale(0.95); } 100% { transform: scale(1); } }
        @keyframes pandaCamGlowPulse {
          0% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.9); }
          100% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.1); }
        }
        @keyframes pandaCamShine {
          0% { left: -60%; }
          30% { left: 160%; }
          100% { left: 160%; }
        }
        .hover-scale:hover { transform: scale(1.02); background-color: rgba(255,255,255,0.09) !important; }

        .panda-cam-glow-orb {
          position: absolute;
          top: 0;
          left: 50%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(17, 17, 17, 0.14) 0%, rgba(17, 17, 17, 0) 70%);
          pointer-events: none;
          z-index: 1;
          animation: pandaCamGlowPulse 6s ease-in-out infinite alternate;
        }

        .panda-cam-logo {
          height: 48px;
        }
        @media (max-width: 480px) {
          .panda-cam-logo {
            height: 68px;
          }
        }

        .panda-cam-icon-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(17, 17, 17, 0.2);
          color: white;
          padding: 10px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .panda-cam-icon-btn:hover {
          background: rgba(17, 17, 17, 0.15);
          border-color: var(--gold-primary);
        }

        .panda-cam-back-btn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.8);
          padding: 8px 14px 8px 10px;
          border-radius: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .panda-cam-back-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .panda-cam-choice-btn {
          width: 100%;
          max-width: 260px;
          padding: 16px 18px;
          border-radius: 18px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(17, 17, 17, 0.25);
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .panda-cam-choice-btn:hover {
          background: rgba(17, 17, 17, 0.08);
          border-color: var(--gold-primary);
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.4);
        }
        .panda-cam-choice-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(17, 17, 17, 0.1);
          border: 1px solid rgba(17, 17, 17, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .panda-cam-shutter {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          border: 3px solid var(--gold-primary);
          background: rgba(17, 17, 17, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(17, 17, 17, 0.3);
        }

        .panda-cam-confirm-btn {
          position: relative;
          overflow: hidden;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--gold-gradient);
          border: none;
          color: #0c0c0d;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(17, 17, 17, 0.4);
          transition: transform 0.2s ease;
        }
        .panda-cam-confirm-btn:hover { transform: scale(1.05); }
        .panda-cam-confirm-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 30%;
          height: 200%;
          background: rgba(255,255,255,0.4);
          transform: rotate(30deg);
          animation: pandaCamShine 4.5s ease-in-out infinite;
        }

        .panda-cam-zoom-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.2);
          outline: none;
          cursor: pointer;
        }
        .panda-cam-zoom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--gold-primary);
          border: 2px solid #0c0c0d;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
        }
        .panda-cam-zoom-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--gold-primary);
          border: 2px solid #0c0c0d;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default PandaCamera;
