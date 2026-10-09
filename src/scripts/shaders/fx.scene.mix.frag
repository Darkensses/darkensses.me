varying vec2 vUv;

uniform sampler2D fxTexture;
uniform sampler2D fxTexture2;
uniform sampler2D asciiFxColor;
uniform sampler2D asciiFxDepth;
uniform sampler2D galleryColor;
uniform sampler2D galleryDepth;

void main() {
  float dASCII = texture2D(asciiFxDepth, vUv).r;
  float dGallery = texture2D(galleryDepth, vUv).r;
  vec4 winner = dGallery < dASCII ? texture2D(galleryColor, vUv) : texture2D(asciiFxColor, vUv);
  gl_FragColor = texture2D(fxTexture, vUv) + texture2D(fxTexture2, vUv) + winner;
}