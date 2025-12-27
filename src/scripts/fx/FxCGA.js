import * as THREE from 'three';
import ortho from './ortho';

export const CGAShader = {
  name: 'CGA',
  uniforms: {
    tDiffuse: { type: 't', value: null },
    resolution: { type: 'v2', value: new THREE.Vector2(1, 1) },
    amount: { type: 'f', value: 1 },
    scale: { type: 'f', value: 2 },
    colLight: { type: 'v3', value: new THREE.Color('#55ffff') },
    colDark: { type: 'v3', value: new THREE.Color('#ff55ff') },
    colWhite: { type: 'v3', value: new THREE.Color('#ffffff') }
  },

  vertexShader: `
  varying vec2 vUv;

        void main()
        {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

            vUv = uv;
        }
  `,

  fragmentShader: `
  precision highp float;
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  varying vec2 vUv;
  uniform vec3 colLight;
  uniform vec3 colDark;
  uniform vec3 colWhite;
  uniform float scale;
  uniform float amount;

  void main() {

    vec4 orig = texture2D(tDiffuse, vUv);

    float size = scale;

    //rudimentary resolution independent
    //size *= (resolution.x * resolution.y) / (1024. * 1024.);

    float dSize = 2. * size;

    float amount2 = resolution.x / size;
    float d = 1.0 / amount2;
    float ar = resolution.x / resolution.y;
    float sx = floor( vUv.x / d ) * d;
    d = ar / amount2;
    float sy = floor( vUv.y / d ) * d;

    vec4 base = texture2D( tDiffuse, vec2( sx, sy ) );

    float lum = .2126 * base.r + .7152 * base.g + .0722 * base.b;
    float o = floor( 6. * lum );

    vec3 c1;
    vec3 c2;
    
    vec3 black = vec3( 0. );

    if( o == 0. ) { c1 = black; c2 = c1; }
    if( o == 1. ) { c1 = black; c2 = colDark; }
    if( o == 2. ) { c1 = colDark;  c2 = c1; }
    if( o == 3. ) { c1 = colDark;  c2 = colLight; }
    if( o == 4. ) { c1 = colLight; c2 = c1; }
    if( o == 5. ) { c1 = colLight; c2 = colWhite; }
    if( o == 6. ) { c1 = colWhite; c2 = c1; }

    if( mod( gl_FragCoord.x, dSize ) > size ) {
        if( mod( gl_FragCoord.y, dSize ) > size ) {
            base.rgb = c1;
        } else {
            base.rgb = c2;	
        }
    } else {
        if( mod( gl_FragCoord.y, dSize ) > size ) {
            base.rgb = c2;
        } else {
            base.rgb = c1;		
        }
    }

    vec4 color = mix(orig, base, amount);
    gl_FragColor = color;
  }
  `
}

export class FxCGA {
  constructor(renderer) {
    this.renderer = renderer;
    this.shader = CGAShader;//shader;
    this.name = CGAShader.name;
    this.seed = Math.random();
    this.uniforms = THREE.UniformsUtils.clone(CGAShader.uniforms);
    
    this.shaderMat = new THREE.RawShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: CGAShader.vertexShader,
      fragmentShader: CGAShader.fragmentShader,
      transparent: true,
      //premultipliedAlpha: true,      
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending
    });
    this.orthoScene = new THREE.Scene();
    let width = 64;
    let height = 64;
    this.fbo = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      stencilBuffer: false,
      depthBuffer: false
    });
    this.orthoCamera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
      0.00001,
      1000
    );
    this.orthoQuad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      this.shaderMat
    );
    this.orthoQuad.scale.set(width, height, 1);
    this.orthoScene.add(this.orthoQuad);
    this.texture = this.fbo.texture;
    this.flipY = false;
  }

  render() {
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.orthoScene, this.orthoCamera);
  }

  renderToScreen() {
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.orthoScene, this.orthoCamera);
  }

  setSize(width, height) {
    this.fbo.setSize(width, height);
    this.orthoQuad.scale.set(width, this.flipY ? -height : height, 1);
    this.orthoCamera.left = -width / 2;
    this.orthoCamera.right = width / 2;
    this.orthoCamera.top = height / 2;
    this.orthoCamera.bottom = -height / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  dispose() {
    //clean up FBOs, canvases etc
    this.shaderMat.dispose();
    this.fbo.dispose();
    this.orthoQuad.geometry.dispose();
    this.uniforms = null;
  }
}