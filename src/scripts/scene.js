import * as THREE from 'three';

import imgUsername from '../assets/images/text.png'
import coolvertex from '../scripts/glsl/coolvertex.vert'
import simplecolorFrag from '../scripts/glsl/simplecolor.frag'

const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();
const sizes = { width: canvas.offsetWidth, height: canvas.offsetHeight};

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
//renderer.autoClear = false;

/**
 * Camera
 */
const perspective = 600;
const fov = 2*Math.atan((sizes.height/2)/perspective) * (180/Math.PI);
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 1, 1000);
camera.position.z = perspective;
//scene.add(camera);

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
scene.add(coolMesh);

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
  //const geometry = new THREE.PlaneGeometry(10,10/(w/h));
  const geometry = new THREE.PlaneGeometry(texture.image.height*aspect,texture.image.height,1);  

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: true,
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.position.x = bounds.left - sizes.width/2 + bounds.width/2;
  plane.position.y = -bounds.top + sizes.height/2 - bounds.height/2;  
  //plane.position.set(0, 0, 0);
  //plane.layers.set(1)
  scene.add(plane);
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
  renderer.render(scene, camera);
};

animate();