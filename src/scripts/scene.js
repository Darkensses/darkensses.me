import * as THREE from 'three';
import adreamShader from '../assets/glsl/adream.glsl'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import handGLB from '../assets/models/hand.glb';

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

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 1000);
camera.position.set(0, 0, 5);
scene.add(camera);

/**
 * Scene 😎
 */
const geometry = new THREE.PlaneGeometry(5, 5)
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 1.0 },
  },
  vertexShader: `
  varying vec2 vUv;
  void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  fragmentShader: adreamShader,
  transparent: true
})
const mesh = new THREE.Mesh(geometry, shaderMaterial);
scene.add(mesh);

/**
 * Lights 💡
 */
const light = new THREE.AmbientLight(0xffffff, 20); // soft white light
scene.add(light);

/**
 * Model
 */
let mixer;
const loader = new GLTFLoader();

loader.load(handGLB, (glb) => {
	const model = glb.scene;
	model.position.set(3,-2,0)
  model.scale.setX(-1);
	scene.add(model);

  model.traverse((child) => {
    if(child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({
        color: 0x0000ff,
        wireframe: true
      });
    }
  })

	mixer = new THREE.AnimationMixer(model);

	const action = mixer.clipAction(glb.animations[0]);
	//action.play();

},
undefined,
(error) => {
	console.error(error);
})

const clock = new THREE.Clock();
const animate = () => {
  window.requestAnimationFrame(animate);
  const delta = clock.getDelta();

  shaderMaterial.uniforms.u_time.value = clock.getElapsedTime();

  if(mixer) {
  	mixer.update(delta)
  }

  renderer.render(scene, camera);
};

animate();