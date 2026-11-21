// The orb rising out of dark fog. Ported from the Averlo questionnaire's
// startup loader (averlo-questionnaire-template src/startup-volume.ts), which
// uses Motion Studio's depth treatment: integrate a squared half-space density
// along each camera ray, then Beer–Lambert transmission. Changes for the
// deck: the medium is the dark canvas instead of white, the texture is the
// mark's image, the quad fills the canvas, and the orb's radial mask fades
// its square frame into the page.
export const fogTravelMs = 2_200;
export const fogFlatHoldMs = 1_200;
/** The settled quad's share of the canvas width (the live orb matches it). */
export const fogOrbScale = 0.9;

const vertex = `
attribute vec2 corner;
uniform float depthTravel;
uniform float tilt;
varying vec2 uv;
varying vec3 world;
void main() {
  uv = (corner + 1.0) * 0.5;
  vec3 p = vec3(corner * vec2(0.18, 0.18), 0.0);
  float pitch = 0.12 * tilt, yaw = -0.075 * tilt;
  p = vec3(p.x, cos(pitch) * p.y, sin(pitch) * p.y);
  p = vec3(cos(yaw) * p.x + sin(yaw) * p.z, p.y,
           -sin(yaw) * p.x + cos(yaw) * p.z);
  // The pivot stays centred: the orb only travels along the camera axis.
  world = p + vec3(0.0, 0.0, -0.72 * depthTravel);
  float depth = 5.0 - world.z;
  // 5 / 0.18 * ${fogOrbScale}: the settled quad spans that share of the canvas.
  gl_Position = vec4(${((5 / 0.18) * fogOrbScale).toFixed(5)} * world.xy, 0.0, depth);
}
`;

const fragment = `
precision mediump float;
uniform sampler2D orb;
uniform vec3 fog;
varying vec2 uv;
varying vec3 world;
float densityIntegral(float from, float to) {
  float difference = to - from;
  vec2 positive = max(vec2(from, to), 0.0);
  if (abs(difference) < 0.0001) return positive.x * positive.x;
  vec2 cubic = positive * positive * positive;
  return (cubic.y - cubic.x) / (3.0 * difference);
}
float signedDepth(vec3 point) {
  // Angle the field against the tile so its edges clear at different depths.
  return -0.10 - dot(vec3(0.22, 0.18, 0.9587), point);
}
// The orb's radial mask: #000 50%, .75 65%, .35 82%, transparent 100%.
float orbMask(vec2 at) {
  float d = length(at - 0.5) * 2.0;
  if (d < 0.5) return 1.0;
  if (d < 0.65) return mix(1.0, 0.75, (d - 0.5) / 0.15);
  if (d < 0.82) return mix(0.75, 0.35, (d - 0.65) / 0.17);
  return mix(0.35, 0.0, clamp((d - 0.82) / 0.18, 0.0, 1.0));
}
void main() {
  vec3 camera = vec3(0.0, 0.0, 5.0);
  float opticalDepth = densityIntegral(signedDepth(camera), signedDepth(world)) * distance(camera, world);
  float transmission = exp(-13500.0 * opticalDepth);
  // Below the visible floor the medium is exactly the canvas: the orb is
  // uncovered through depth, not an alpha fade.
  transmission = clamp((transmission - 0.004) / 0.996, 0.0, 1.0);
  vec3 ink = texture2D(orb, vec2(uv.x, 1.0 - uv.y)).rgb;
  // Premultiplied: the square's transparent corners carry no colour, so no
  // compositor can show the quad's frame (iOS Safari drew it).
  float alpha = orbMask(uv);
  gl_FragColor = vec4(mix(fog, ink, transmission) * alpha, alpha);
}
`;

/** The page canvas colour around the orb, as linear 0–1 RGB. */
const fogColor = [2 / 255, 6 / 255, 20 / 255] as const;

export function prepareFogVolume(canvas: HTMLCanvasElement, posterSrc: string) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    gl.deleteShader(shader);
    return null;
  };

  const program = gl.createProgram();
  const vert = compile(gl.VERTEX_SHADER, vertex);
  const frag = compile(gl.FRAGMENT_SHADER, fragment);
  const corners = gl.createBuffer();
  const texture = gl.createTexture();
  let disposed = false;
  const dispose = () => {
    disposed = true;
    gl.deleteProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    gl.deleteBuffer(corners);
    gl.deleteTexture(texture);
  };
  if (!program || !vert || !frag || !corners || !texture) {
    dispose();
    return null;
  }
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose();
    return null;
  }

  // The layout size, before the gate's CSS scale (0.72) shrinks the box.
  const cssSize = canvas.offsetWidth || 96;
  canvas.width = canvas.height = Math.round(
    cssSize * Math.min(3, window.devicePixelRatio || 1),
  );
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const corner = gl.getAttribLocation(program, "corner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  const depthTravel = gl.getUniformLocation(program, "depthTravel");
  const tilt = gl.getUniformLocation(program, "tilt");
  gl.uniform3f(gl.getUniformLocation(program, "fog"), ...fogColor);

  const image = new Image();
  image.src = posterSrc;
  const ready = image.decode().then(() => {
    if (disposed) return;
    if (gl.isContextLost()) throw new Error("Loader graphics context lost");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  });
  const draw = (elapsed: number) => {
    const t = Math.min(1, elapsed / fogTravelMs);
    const eased = t * t * (3 - 2 * t);
    // The hinge finishes on its own, so the orb keeps settling after its
    // surface clears the field.
    const tiltTime = Math.max(0, (t - 0.25) / 0.75);
    const angle = 1 - tiltTime * tiltTime * (3 - 2 * tiltTime);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(depthTravel, (1 - eased) ** 1.8);
    gl.uniform1f(tilt, angle);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return { ready, draw, dispose };
}
