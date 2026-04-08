export function LightingRig() {
  return (
    <>
      <hemisphereLight args={[0xffffff, 0x444444, 1.0]} />
      <ambientLight intensity={0.2} />
      <directionalLight position={[0, 50, 0]} intensity={1.5} />
    </>
  );
}
