const scriptPromises = new Map<string, Promise<void>>();

export function loadMapScript(id: string, source: string, isReady: () => boolean): Promise<void> {
  if (isReady()) return Promise.resolve();
  const existingPromise = scriptPromises.get(id);
  if (existingPromise) return existingPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(id) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");
    const handleLoad = () => isReady() ? resolve() : reject(new Error("Map SDK loaded without a global API"));
    const handleError = () => reject(new Error("Map SDK failed to load"));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    if (!existingScript) {
      script.id = id;
      script.src = source;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  scriptPromises.set(id, promise);
  return promise;
}
