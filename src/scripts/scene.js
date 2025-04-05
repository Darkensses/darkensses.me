import * as THREE from 'three';

const canvas = document.getElementById('webgl');
const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = { width: canvas.clientWidth, height: canvas.clientHeight };
window.addEventListener('resize', () => {
	sizes.width = canvas.clientWidth;
	sizes.height = canvas.clientHeight;
	camera.aspect = sizes.width / sizes.height;
	camera.updateProjectionMatrix();
	renderer.setSize(sizes.width, sizes.height);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({canvas, alpha: true});
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
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const animate = () => {
	window.requestAnimationFrame(animate);
	renderer.render(scene, camera);
};

animate();