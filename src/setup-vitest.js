import '@testing-library/jest-dom';

const nativeGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (element) => nativeGetComputedStyle(element);

window.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener: () => {},
  removeEventListener: () => {},
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.IntersectionObserver = IntersectionObserverMock;
