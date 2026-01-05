import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer, FXAAShader, OutputPass, RenderPass, RGBShiftShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { CGAShader } from './fx/FxCGA';
import { BadTVShader } from './shaders/BadTVShader';

import GUI from 'lil-gui';

import imgUsername from '../assets/images/text.png'
import coolvertex from '../scripts/shaders/coolvertex.vert'
import simplecolorFrag from '../scripts/shaders/simplecolor.frag'

const canvas = document.getElementById('webgl');
const sizes = { width: window.innerWidth, height: window.innerHeight };

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false;

/**
 * Sizes
 */
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();  
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  composer.setSize(sizes.width, sizes.height);
  finalComposer.setSize(sizes.width, sizes.height);
});

/**
 * Camera
 */
const perspective = 600;
const fov = 2*Math.atan((sizes.height/2)/perspective) * (180/Math.PI);
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 1, 1000);
camera.position.z = perspective;

/**
 * HTML Elements
 */
const logotext = document.getElementById('logotext');
const bounds = logotext.getBoundingClientRect();

const scene = new THREE.Scene();

const texture = new THREE.TextureLoader().load(imgUsername.src, () => {
  texture.minFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;

  const w = texture.image.width;
  const h = texture.image.height;
  const aspect = w/h;

  const geometry = new THREE.PlaneGeometry(texture.image.height*aspect,texture.image.height,1);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.position.x = bounds.left - sizes.width/2 + bounds.width/2;
  plane.position.y = -bounds.top + sizes.height/2 - bounds.height/2;
  plane.layers.set(1);
  scene.add(plane);
});


const coolGeometry = new THREE.SphereGeometry(280,40,40)
const coolMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: {value: 0}
  },
  vertexShader: coolvertex,
  fragmentShader: simplecolorFrag,
  side: THREE.DoubleSide,
  wireframe: true
});
const coolMesh = new THREE.Mesh(coolGeometry, coolMaterial);
coolMesh.position.z = -300;
coolMesh.layers.set(0);
scene.add(coolMesh);

/**
 * Post FX
 */
const renderPass = new RenderPass(scene, camera);

const cgaPass = new ShaderPass(CGAShader);
cgaPass.uniforms.resolution.value.set(sizes.width, sizes.height)
cgaPass.uniforms.colDark.value = new THREE.Color('#0000ff');
cgaPass.uniforms.colLight.value = new THREE.Color('#00a1ff');
cgaPass.uniforms.amount.value   = 1;
cgaPass.uniforms.scale.value    = 3;

const badTVPass = new ShaderPass(BadTVShader);
badTVPass.uniforms.distortion.value = 0.1;
badTVPass.uniforms.distortion2.value = 0.2;
badTVPass.uniforms.rollSpeed.value = 0;

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms.amount.value = 0.0015;
rgbShiftPass.renderToScreen = true;
rgbShiftPass.enabled = true;

const bloom = new UnrealBloomPass(new THREE.Vector2(sizes.width, sizes.height), 0.2, 0.0, 0.0 );

const fxaaPass = new ShaderPass( FXAAShader );
fxaaPass.uniforms.resolution.value.set( 1 / sizes.width, 1 / sizes.height );
fxaaPass.renderToScreen = true;
fxaaPass.material.transparent = true; 

const baseRenderTarget = new THREE.WebGLRenderTarget( sizes.width, sizes.height, { type: THREE.HalfFloatType } )
const composer = new EffectComposer(renderer);
composer.renderToScreen = false;
composer.addPass(renderPass);
composer.addPass(fxaaPass);
composer.addPass(badTVPass);
composer.addPass(cgaPass);
composer.addPass(rgbShiftPass);
composer.addPass(bloom);

const mixPass = new ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      fxTexture: { value: null }
    },
    vertexShader: `
      varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}
    `,
    fragmentShader: `
      varying vec2 vUv;

      uniform sampler2D baseTexture;
      uniform sampler2D fxTexture;

      void main() {
        gl_FragColor = texture2D(baseTexture, vUv) + texture2D(fxTexture, vUv);
      }
    `
  })
);
mixPass.needsSwap = true;

const outputPass = new OutputPass();

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderPass);
finalComposer.addPass(mixPass);
finalComposer.addPass(outputPass);

const controls = new OrbitControls(camera, renderer.domElement);
const stats = new Stats();
document.body.appendChild(stats.dom);

const gui = new GUI();
const fxGUI = { 
  rollSpeed: 1
}
gui.add(fxGUI, 'rollSpeed', -3,3,0.1).onChange(function (value) {
  console.log(value);
  badTVPass.uniforms.rollSpeed.value = value;
});

const clock = new THREE.Clock();
const animate = () => {  
  window.requestAnimationFrame(animate);
  //let delta = clock.getDelta();
  //const delta = performance.now() * 0.001 + 6000;

  coolMaterial.uniforms.uTime.value += 0.05;
  badTVPass.uniforms.time.value = clock.getElapsedTime() * 0.05;
  controls.update();

  camera.layers.set(0);
  renderer.setRenderTarget(baseRenderTarget);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
  
  camera.layers.set(1);
  composer.render();

  mixPass.uniforms.baseTexture.value = baseRenderTarget.texture;
  mixPass.uniforms.fxTexture.value = composer.readBuffer.texture; // result of FX chain
  renderer.setRenderTarget(null);

  finalComposer.render();
  stats.update();
  //renderer.render(scene, camera);
}
animate();