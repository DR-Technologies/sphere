export function isSphereQaStaticRender() {
  if (typeof window === 'undefined') return false;
  return Boolean((window as Window & { __SPHERE_QA_STATIC__?: boolean }).__SPHERE_QA_STATIC__);
}
