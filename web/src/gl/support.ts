// Kept apart from the scenes, so checking for WebGL doesn't load three.js.

/** True when the browser can draw the 3D views; otherwise the planner falls back to 2D. */
export function webglAvailable(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}
