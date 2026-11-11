import init, { vectorize_rgba } from './vtracer_wasm.js';

let ready;
async function ensureReady() {
  if (!ready) ready = init();
  await ready;
}

self.onmessage = async function (event) {
  try {
    const p = event.data;
    await ensureReady();
    const pixels = new Uint8Array(p.pixels);
    const options = {
      clustering: 'color-cluster',
      hierarchical: 'stacked',
      mode: 'spline',
      filterSpeckle: 4,
      colorPrecision: 6,
      layerDifference: 16,
      cornerThreshold: 60,
      lengthThreshold: 4,
      spliceThreshold: 45,
      pathPrecision: 2
    };
    const svg = vectorize_rgba(pixels, p.width, p.height, options);
    if (!svg || svg.length < 100) throw new Error('VTracer returned an empty SVG');
    self.postMessage({ ok: true, svg });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error && error.message || error) });
  }
};
