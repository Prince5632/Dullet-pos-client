import { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import SignaturePadLib from 'signature_pad';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface SignaturePadProps {
  width?: number;
  height?: number;
  backgroundColor?: string;
  penColor?: string;
  penWidth?: number;
  onChange?: (signature: string) => void;
  className?: string;
  disabled?: boolean;
}

export interface SignaturePadRef {
  clear: () => void;
  getSignature: () => string;
  isEmpty: () => boolean;
  fromDataURL: (dataURL: string) => void;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  width = 400,
  height = 200,
  backgroundColor = '#ffffff',
  penColor = '#000000',
  penWidth = 2,
  onChange,
  className = '',
  disabled = false
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePadLib | null>(null);
  const [isPadEmpty, setIsPadEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
        setIsPadEmpty(true);
        onChange?.('');
      }
    },
    getSignature: () => {
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        return signaturePadRef.current.toDataURL('image/png');
      }
      return '';
    },
    isEmpty: () => {
      return signaturePadRef.current ? signaturePadRef.current.isEmpty() : true;
    },
    fromDataURL: (dataURL: string) => {
      if (signaturePadRef.current) {
        signaturePadRef.current.fromDataURL(dataURL);
        setIsPadEmpty(false);
        onChange?.(dataURL);
      }
    }
  }));

  useEffect(() => {
    if (canvasRef.current && !signaturePadRef.current) {
      // Initialize signature pad
      signaturePadRef.current = new SignaturePadLib(canvasRef.current, {
        backgroundColor,
        penColor,
        minWidth: penWidth * 0.5,
        maxWidth: penWidth * 2,
        throttle: 16,
        minDistance: 5,
      });

      // Set up event handlers
      const emitChange = () => {
        if (!signaturePadRef.current) return;
        const empty = signaturePadRef.current.isEmpty();
        setIsPadEmpty(empty);
        onChange?.(empty ? '' : signaturePadRef.current.toDataURL('image/png'));
      };

      // signature_pad exposes onBegin/onEnd callbacks, not DOM events
      const sigInstanceAny = signaturePadRef.current as unknown as any;
      // Prefer v5 event API if available
      if (typeof sigInstanceAny.addEventListener === 'function') {
        sigInstanceAny.addEventListener('beginStroke', emitChange);
        sigInstanceAny.addEventListener('endStroke', emitChange);
      } else {
        // Fallback to legacy callbacks if using older signature_pad typings
        (signaturePadRef.current as unknown as { onEnd?: () => void; onBegin?: () => void }).onEnd = emitChange;
        (signaturePadRef.current as unknown as { onEnd?: () => void; onBegin?: () => void }).onBegin = emitChange;
      }

      // Fallback: listen to pointerup/mouseup to ensure change fires
      const canvasEl = canvasRef.current;
      const fallback = () => emitChange();
      const fallbackMove = () => emitChange();
      canvasEl.addEventListener('pointerup', fallback);
      canvasEl.addEventListener('mouseup', fallback);
      canvasEl.addEventListener('touchend', fallback);
      canvasEl.addEventListener('pointerdown', fallbackMove);
      canvasEl.addEventListener('mousemove', fallbackMove);

      // Set canvas background
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      return () => {
        if (signaturePadRef.current) {
          if (typeof sigInstanceAny.removeEventListener === 'function') {
            sigInstanceAny.removeEventListener('beginStroke', emitChange);
            sigInstanceAny.removeEventListener('endStroke', emitChange);
          } else {
            (signaturePadRef.current as unknown as { onEnd?: () => void; onBegin?: () => void }).onEnd = undefined;
            (signaturePadRef.current as unknown as { onEnd?: () => void; onBegin?: () => void }).onBegin = undefined;
          }
          signaturePadRef.current.off();
        }
        canvasEl.removeEventListener('pointerup', fallback);
        canvasEl.removeEventListener('mouseup', fallback);
        canvasEl.removeEventListener('touchend', fallback);
        canvasEl.removeEventListener('pointerdown', fallbackMove);
        canvasEl.removeEventListener('mousemove', fallbackMove);
      };
    }
  }, [backgroundColor, penColor, penWidth, onChange]);

  // Update signature pad options when props change
  useEffect(() => {
    if (signaturePadRef.current) {
      signaturePadRef.current.penColor = penColor;
      signaturePadRef.current.minWidth = penWidth * 0.5;
      signaturePadRef.current.maxWidth = penWidth * 2;
    }
  }, [penColor, penWidth]);

  // Handle disabled state
  useEffect(() => {
    if (signaturePadRef.current) {
      if (disabled) {
        signaturePadRef.current.off();
      } else {
        signaturePadRef.current.on();
      }
    }
  }, [disabled]);

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setIsPadEmpty(true);
      onChange?.('');
    }
  };

  const isEmpty = isPadEmpty;

  return (
    <div className={`relative inline-block ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`border border-gray-300 rounded-md ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair'
        }`}
        style={{ touchAction: 'none' }}
      />
      
      {!disabled && (
        <div className="absolute top-2 right-2 flex space-x-1">
          <button
            type="button"
            onClick={clearSignature}
            className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors shadow-sm"
            title="Clear signature"
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      )}
      
      {isEmpty && !disabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center text-gray-400 text-sm">
            <PencilIcon className="h-4 w-4 mr-2" />
            <span>Sign here</span>
          </div>
        </div>
      )}
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
