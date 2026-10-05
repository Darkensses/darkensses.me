uniform sampler2D u_texture;
uniform vec4 u_resolution;
uniform float u_time;
uniform float u_cells;
varying vec2 vUv;

float sdCross(vec2 p, vec2 b, float r) {
  p = abs(p); p = (p.y>p.x) ? p.yx : p.xy;
  vec2  q = p - b;
  float k = max(q.y,q.x);
  vec2  w = (k>0.0) ? q : vec2(b.y-p.x,-k);
  return sign(k)*length(max(w,0.0)) + r;
}

float sdPentagram(vec2 p, float r) {
  const float k1x = 0.809016994; // cos(π/ 5) = ¼(√5+1)
  const float k2x = 0.309016994; // sin(π/10) = ¼(√5-1)
  const float k1y = 0.587785252; // sin(π/ 5) = ¼√(10-2√5)
  const float k2y = 0.951056516; // cos(π/10) = ¼√(10+2√5)
  const float k1z = 0.726542528; // tan(π/ 5) = √(5-2√5)
  const vec2  v1  = vec2( k1x,-k1y);
  const vec2  v2  = vec2(-k1x,-k1y);
  const vec2  v3  = vec2( k2x,-k2y);
  
  p.x = abs(p.x);
  p -= 2.0*max(dot(v1,p),0.0)*v1;
  p -= 2.0*max(dot(v2,p),0.0)*v2;
  p.x = abs(p.x);
  p.y -= r;
  return length(p-v3*clamp(dot(p,v3),0.0,k1z*r))
          * sign(p.y*v3.x-p.x*v3.y);
}

float rand(vec2 co){
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 cells = vec2(u_cells, u_cells * u_resolution.y / u_resolution.x);
  vec2 pixUV = (floor(vUv * cells) + .5) / cells;

  vec2 localUV = fract(vUv * cells) - .5;
  
  vec4 tex = texture2D(u_texture, pixUV);
  float luma = dot(tex.rgb, vec3(0.2126, 0.7152, 0.0722));

  float d;
  if(luma < .25) {
      d = 1.;    
  } else if(luma < .5) {
      d = sdCross(localUV, vec2(.4,.1), .1);
  } else if(luma < .75) {
      d = sdPentagram(localUV, 0.5);
      d = abs(d);
  } else {    
      d = rand(pixUV + floor(mod(u_time*24.,24.))) * .1;
  }
  d = smoothstep(.1,.0,d);  
  
  vec3 color = vec3(d) * 5.;
  
  gl_FragColor = vec4(color, 1.);
}