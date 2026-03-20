import { Html } from '@react-three/drei';

export function LoaderOverlay() {
  return (
    <Html center>
      <div
        style={{
          color: 'white',
          fontSize: '20px',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '20px 40px',
          borderRadius: '8px',
        }}
      >
        Loading NTPU Scene...
      </div>
    </Html>
  );
}
