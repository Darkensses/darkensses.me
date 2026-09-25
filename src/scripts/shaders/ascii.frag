uniform sampler2D u_texture;
uniform vec4 u_resolution;
uniform float u_cells;
varying vec2 vUv;

void main() {
  vec2 cells = vec2(u_cells, u_cells * u_resolution.y / u_resolution.x);
  vec2 pixUV = (floor(vUv * cells) + .5) / cells;
  
  vec4 tex = texture2D(u_texture, pixUV);
  
  gl_FragColor = vec4(tex.rgb, 1.);
}