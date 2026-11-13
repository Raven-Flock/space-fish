// Installs method bags from the feature modules onto a class prototype.
// Methods are non-enumerable, like methods written inside a class body,
// so the Game instance looks the same as the original single class.
export function installMethods(
  target: {
    prototype: object;
  },
  ...bags: object[]
): void {
  for (const bag of bags) {
    for (const key of Object.keys(bag)) {
      if (Object.prototype.hasOwnProperty.call(target.prototype, key)) {
        throw new Error(`installMethods: duplicate method "${key}"`);
      }
      Object.defineProperty(target.prototype, key, {
        value: (bag as Record<string, unknown>)[key],
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
}
