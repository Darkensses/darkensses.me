import * as THREE from 'three';

/**
 * En este repo vienen FBOs y mas shaders
 * https://github.com/spite/looper
 */

const defaultVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

const HighlightShader = {
  name: 'Highlight',
  uniforms: {
    tDiffuse: { type: 't' },
    threshold: { type: 'f', value: 0.5 }
  },

  vertexShader: defaultVertexShader,

  fragmentShader: `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform float threshold;

  varying vec2 vUv;

  void main() {
    float threshold2 = mix(.8, .0, threshold);
    vec4 c = texture2D(tDiffuse, vUv);
    c.rgb -= threshold2;
    gl_FragColor = vec4(c);
  }`
};

const BlurShader = {
  name: 'Blur',
  uniforms: {
    source: { type: 't', value: null },
    resolution: { type: 'v2', value: new THREE.Vector2(1, 1) },
    delta: { type: 'v2', value: new THREE.Vector2(0, 1) },
    blurFac: { type: 'f', value: 1 }
  },

  vertexShader: defaultVertexShader,

  fragmentShader: `
  precision highp float;

  uniform vec2 resolution;
  uniform sampler2D source;
  uniform vec2 delta;
  uniform float blurFac;
  
  varying vec2 vUv;
  
  /*
  Original project: Experience-Monks/glsl-fast-gaussian-blur — MIT License
  Source: https://github.com/Experience-Monks/glsl-fast-gaussian-blur/blob/master/5.glsl
  */
  vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3333333333333333) * direction;
    color += texture2D(image, uv) * 0.29411764705882354;
    color += texture2D(image, uv + (off1 / resolution)) * 0.35294117647058826;
    color += texture2D(image, uv - (off1 / resolution)) * 0.35294117647058826;
    return color; 
  }
  
  void main() {
    vec4 b = blur5(source, vUv, resolution, delta * blurFac);
    gl_FragColor = b;
  }`
};

const BloomShader = {
  name: 'Bloom',
  uniforms: {
    base: { type: 't' },
    level0: { type: 't' },
    level1: { type: 't' },
    level2: { type: 't' },
    level3: { type: 't' },
    level4: { type: 't' },
    amount: { type: 'f', value: 0.3 },
    vignette: { type: 'f', value: 0.5 }
  },

  vertexShader: defaultVertexShader,

  fragmentShader: `
  precision highp float;

  uniform sampler2D base;
  uniform sampler2D level0;
  uniform sampler2D level1;
  uniform sampler2D level2;
  uniform sampler2D level3;
  uniform sampler2D level4;

  uniform float amount;
  varying vec2 vUv;

  void main() {
    vec4 origCol = texture2D(base, vUv);
    vec4 bloomCol = texture2D(level0, vUv);
    bloomCol += texture2D(level1, vUv);
    bloomCol += texture2D(level2, vUv);
    bloomCol += texture2D(level3, vUv);

    vec4 color = origCol + bloomCol * amount;
    gl_FragColor = color;
  }
  `
};

export class FxGlow {
  constructor(renderer) {
    this.renderer = renderer;
    this.seed = Math.random();
    this.levels = 4;

    this.fbos = [];
    this.fbos.push(this.createFBO());
    for(let i = 0; i < this.levels; i++) {
      let fbo = this.createFBO();
      this.fbos.push(fbo);
      fbo = this.createFBO();
      this.fbos.push(fbo);
    }
    this.fbos.push(this.createFBO());

    this.highlightShader = new THREE.RawShaderMaterial(HighlightShader);
    this.highlightShader.uniforms = THREE.UniformsUtils.clone(HighlightShader.uniforms);
    this.blurShader = new THREE.RawShaderMaterial(BlurShader);
    this.blurShader.uniforms = THREE.UniformsUtils.clone(BlurShader.uniforms);
    this.bloomShader = new THREE.RawShaderMaterial(BloomShader);
    this.bloomShader.uniforms = THREE.UniformsUtils.clone(BloomShader.uniforms);
    this.bloomShader.uniforms.level0.value = this.fbos[2].texture;
    this.bloomShader.uniforms.level1.value = this.fbos[4].texture;
    this.bloomShader.uniforms.level2.value = this.fbos[6].texture;
    this.bloomShader.uniforms.level3.value = this.fbos[8].texture;
    //this.bloomShader.uniforms.level4.value = this.fbos[10].texture;

    // https://github.com/spite/codevember-2016/blob/94d39f7c6036426053d097dc14f11c80c36ec213/16/index.html#L624
    this.orthoScene = new THREE.Scene();
    this.orthoCamera = new THREE.OrthographicCamera(1/-2, 1/2, 1/2, 1/-2, 0.00001, 1000);
    this.orthoQuad = new THREE.Mesh(new THREE.PlaneGeometry(1,1), this.highlightShader);
    this.orthoScene.add(this.orthoQuad);

    //output
    this.fbo = this.createFBO();
    //input
    this.uniforms = {};
    this.uniforms.amount = this.bloomShader.uniforms.amount;
    this.uniforms.threshold = this.highlightShader.uniforms.threshold;

    this.uniforms.tDiffuse = this.highlightShader.uniforms.tDiffuse;
    this.bloomShader.uniforms.base = this.highlightShader.uniforms.tDiffuse;
  }

  createFBO() {
    let fbo = new THREE.WebGLRenderTarget(1, 1, {
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
      depthBuffer: false
    });
    fbo.texture.generateMipmaps = false;
    return fbo;
  }

  render() {
    //this.highlightShader.uniforms.source.value = this.baseFBO.texture;

    let w = this.fbos[0].width;
    let h = this.fbos[0].height;
    this.orthoQuad.material = this.highlightShader;
    this.setRendererSize(w, h);
    this.renderer.setRenderTarget(this.fbos[0]);
    this.renderer.render(this.orthoScene, this.orthoCamera);

    let v = 1;

    for(let i = 1; i < this.levels * 2; i += 2) {
      this.orthoQuad.material = this.blurShader;
      this.orthoQuad.material.uniforms.delta.value.set(v, 0);
      this.orthoQuad.material.uniforms.source.value = this.fbos[i - 1].texture;
      this.orthoQuad.material.uniforms.resolution.value.set(
        this.fbos[i].width,
        this.fbos[i].height
      );
      this.setRendererSize(this.fbos[i].width, this.fbos[i].height);
      this.renderer.setRenderTarget(this.fbos[i]);
      this.renderer.render(this.orthoScene, this.orthoCamera);

      this.orthoQuad.material = this.blurShader;
      this.orthoQuad.material.uniforms.delta.value.set(0, v);
      this.orthoQuad.material.uniforms.source.value = this.fbos[i].texture;
      this.orthoQuad.material.uniforms.resolution.value.set(
        this.fbos[i+1].width,
        this.fbos[i+1].height
      );
      this.setRendererSize(this.fbos[i+1].width, this.fbos[i+1].height);
      this.renderer.setRenderTarget(this.fbos[i+1]);
      this.renderer.render(this.orthoScene, this.orthoCamera);      
    }

    this.orthoQuad.material = this.bloomShader;
    this.setRendererSize(this.width, this.height);
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.orthoScene, this.orthoCamera);
  }

  setRendererSize(width, height) {
    this.orthoQuad.scale.set(width, height, 1);
    this.orthoCamera.left = -width / 2;
    this.orthoCamera.right = width / 2;
    this.orthoCamera.top = height / 2;
    this.orthoCamera.bottom = -height / 2;
    this.orthoCamera.updateProjectionMatrix();
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;

    //this.baseFBO.setSize(w, h);
    let tw = w;
    let th = h;
    
    this.fbo.setSize(w, h);
    this.fbos[0].setSize(tw, th);
    tw /= 2;
    th /= 2;
    tw = Math.round(tw);
    th = Math.round(th);
    
    for(let i = 1; i < this.levels * 2; i += 2) {
      this.fbos[i].setSize(tw, th);
      this.fbos[i + 1].setSize(tw, th);
      tw /= 2;
      th /= 2;
      tw = Math.round(tw);
      th = Math.round(th);
    }
  }

  dispose() {
    this.fbos.forEach(fbo => {
      fbo.dispose();
    });
    this.fbo.dispose();
    this.highlightShader.dispose();
    this.blurShader.dispose();
    this.bloomShader.dispose();
    this.orthoQuad.geometry.dispose();
    this.uniforms = null;
  }

}