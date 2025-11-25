import * as THREE from 'three';

import imgUsername from '../assets/images/text.png'

const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = { width: window.innerWidth, height: window.innerHeight };
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

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
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 1000);
camera.position.set(0, 0, 5);
scene.add(camera);

/**
 * Scene 😎
 */


const texture = new THREE.TextureLoader().load(imgUsername.src, () => {
  console.log('textureee');
  //texture.minFilter = THREE.NearestFilter;
  //texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const w = texture.image.width;
  const h = texture.image.height;

  console.log(w,h)
  const geometry = new THREE.PlaneGeometry(10,10/(w/h));  

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: true
  });

  const plane = new THREE.Mesh(geometry, material);
  plane.position.set(0, 0, 0);
  //plane.layers.set(1)
  scene.add(plane);
});

/**
 * Lights 💡
 */
const light = new THREE.AmbientLight(0xffffff, 20); // soft white light
scene.add(light);


const clock = new THREE.Clock();
const animate = () => {
  window.requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

animate();