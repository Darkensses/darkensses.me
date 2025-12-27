import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RGBShiftShader } from 'three/examples/jsm/shaders/RGBShiftShader.js'
import { CGAShader } from '../scripts/fx/FxCGA';
import { BadTVShader } from './shaders/BadTVShader';

import imgUsername from '../assets/images/text.png'
import coolvertex from '../scripts/shaders/coolvertex.vert'
import simplecolorFrag from '../scripts/shaders/simplecolor.frag'

const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
const sizes = { width: canvas.offsetWidth, height: canvas.offsetHeight};

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.autoClear = false; // set to false if you want to use layers ;)

/**
 * Camera
 */
const perspective = 600;
const fov = 2*Math.atan((sizes.height/2)/perspective) * (180/Math.PI);
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 1, 1000);
camera.position.z = perspective;
//scene.add(camera);

/**
 * Post processing
 */

// Effect composer
const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Render pass
const renderPass = new RenderPass(scene, camera)
effectComposer.addPass(renderPass)

const badTVPass = new ShaderPass(BadTVShader);
badTVPass.uniforms.distortion.value = 0.1;
badTVPass.uniforms.distortion2.value = 0.2;
badTVPass.uniforms.rollSpeed.value = 0;
effectComposer.addPass(badTVPass);

const cgaPass = new ShaderPass(CGAShader);
cgaPass.uniforms.resolution.value.set(sizes.width,sizes.height)
cgaPass.uniforms.colDark.value = new THREE.Color('#0000ff');
cgaPass.uniforms.colLight.value = new THREE.Color('#00a1ff');
cgaPass.uniforms.amount.value   = 1;
cgaPass.uniforms.scale.value    = 3;
effectComposer.addPass(cgaPass);

// rgb shift pass
const rgbShiftPass = new ShaderPass(RGBShiftShader)
rgbShiftPass.uniforms['amount'].value = 0.002
rgbShiftPass.renderToScreen = true
rgbShiftPass.enabled = true
effectComposer.addPass(rgbShiftPass)

const bloomPass = new UnrealBloomPass( 
  new THREE.Vector2(sizes.width, sizes.height), 
0.6, 0.1, 0.6 
);
effectComposer.addPass( bloomPass );

/**
 * Scene 😎
 */

const logotext = document.getElementById('logotext');
const bounds = logotext.getBoundingClientRect();
console.log(bounds)

const geometry = new THREE.PlaneGeometry(bounds.width,bounds.height,1);
const material = new THREE.MeshBasicMaterial({color: 'red', wireframe: true});
const mesh = new THREE.Mesh(geometry, material);
mesh.position.x = bounds.left - sizes.width/2 + bounds.width/2;
mesh.position.y = -bounds.top + sizes.height/2 - bounds.height/2;
//scene.add(mesh)

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
coolMesh.layers.set(1);
scene.add(coolMesh);

let textureReady = false;
const texture = new THREE.TextureLoader().load(imgUsername.src, () => {
  console.log('textureee');
  //texture.minFilter = THREE.NearestFilter;
  //texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const w = texture.image.width;
  const h = texture.image.height;

  const aspect = w/h;

  console.log(w,h)  
  const geometry = new THREE.PlaneGeometry(texture.image.height*aspect,texture.image.height,1);  

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: true,
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.position.x = bounds.left - sizes.width/2 + bounds.width/2;
  plane.position.y = -bounds.top + sizes.height/2 - bounds.height/2;  
  plane.layers.set(1)
  scene.add(plane);
  textureReady = true;
});

/**
 * Sizes
 */
// const sizes = { width: window.innerWidth, height: window.innerHeight };
window.addEventListener('resize', () => {
  sizes.width = canvas.offsetWidth;
  sizes.height = canvas.offsetHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Lights 💡
 */
const light = new THREE.AmbientLight(0xffffff, 20); // soft white light
scene.add(light);


const clock = new THREE.Clock();
const animate = () => {
  coolMaterial.uniforms.uTime.value += 0.05;

  window.requestAnimationFrame(animate);

  if(!textureReady) return;

  //renderer.render(scene, camera);

  // https://discourse.threejs.org/t/solved-effectcomposer-layers/3158/4
  renderer.clear();
  
  badTVPass.uniforms.time.value = clock.getElapsedTime() * 0.02;
  camera.layers.set(1);
  effectComposer.render();
  
  renderer.clearDepth();
  camera.layers.set(0);
  renderer.render(scene, camera)
};

animate();