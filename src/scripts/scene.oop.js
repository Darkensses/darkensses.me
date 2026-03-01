import * as THREE from 'three';
import Lenis from 'lenis';

import imgLogo from '../assets/images/text.png';
import modelPsx from '../assets/models/we2002model.glb';
import { EffectComposer, FXAAShader, GLTFLoader, OutputPass, RenderPass, RGBShiftShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { CGAShader } from './fx/FxCGA';
import { BadTVShader } from './shaders/BadTVShader';

export default class MainScreen {
  constructor(options) {
    this.container = options.dom;
    this.sizes = { width: window.innerWidth, height: window.innerHeight };
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.lenis = new Lenis({ autoRaf: true });

    this.perspective = 600;

    this.mesh = null;

    this.logoDom = document.querySelector('#logotext h2');
    this.planeLogo = null;
    this.logoTexture = null;

    this.initCamera();
    this.initRenderer();
    //this.initMesh();
    this.initGrid();
    this.addLogo();
    this.initPsxModel();
    this.initFX();
    this.addEventListeners();
    this.animate();
  }

  initCamera() {
    // Create with any initial values; we'll set the real ones in updateCamera()
    this.camera = new THREE.PerspectiveCamera(50, 1, 1, 1000);
    this.camera.position.z = this.perspective;
    this.updateCamera();
  }

  updateCamera() {
    const fov = 2 * Math.atan((this.sizes.height / 2) / this.perspective) * (180 / Math.PI);

    this.camera.fov = fov;
    this.camera.aspect = this.sizes.width / this.sizes.height;
    this.camera.position.z = this.perspective;
    this.camera.updateProjectionMatrix();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.container, alpha: true });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
  }

  addEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));

    this.lenis.on('scroll', () => {
      //this.mesh.position.y = this.lenis.actualScroll * 2;

      // If the DOM element moves with scroll, keep the plane glued to it
      this.syncLogoToDOM();
      this.onScrollGrid(this.lenis.actualScroll)
    });
  }

  onResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.updateCamera();

    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ensure layout has settled before reading bounds
    window.requestAnimationFrame(() => {
      this.syncLogoToDOM();
    });
  }

  initMesh() {
    const geometry = new THREE.BoxGeometry(200, 200, 200);
    const material = new THREE.MeshBasicMaterial({ color: "#7444ff" });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.layers.set(0);
    this.scene.add(this.mesh);
  }

  initGrid() {
    this.gridHelper = new THREE.GridHelper(1000,16, 0x0000FF, 0x0000FF);
    this.gridHelper.position.z = -50;
    this.gridHelper.rotation.x = 10 * Math.PI / 180;
    this.scene.add(this.gridHelper);
  }

  onScrollGrid(value) {
    //const bounds = this.logoDom.getBoundingClientRect();

    // Because the FOV trick, world units at z=0 map 1:1 to CSS pixels.
    //this.planeLogo.scale.set(bounds.width, bounds.height, 1);

    // this.planeLogo.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    // this.planeLogo.position.y = -bounds.top + this.sizes.height / 2 - bounds.height / 2;
    
    //this.gridHelper.rotation.x = (10 * Math.PI / 180) + ((value*0.1) * Math.PI / 180);
    this.gridHelper.position.z = -value*0.5;
  }

  applyCoverUV(texture, planeW, planeH) {
    const imageAspect = texture.image.width / texture.image.height;
    const planeAspect = planeW / planeH;

    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);

    if (planeAspect > imageAspect) {
      // Crop top/bottom
      const ratio = imageAspect / planeAspect; // < 1
      texture.repeat.set(1, ratio);
      texture.offset.set(0, (1 - ratio) / 2);
    } else {
      // Crop left/right
      const ratio = planeAspect / imageAspect; // < 1
      texture.repeat.set(ratio, 1);
      texture.offset.set((1 - ratio) / 2, 0);
    }

    texture.needsUpdate = true;
  }

  syncLogoToDOM() {
    if (!this.planeLogo || !this.logoDom || !this.logoTexture) return;

    const bounds = this.logoDom.getBoundingClientRect();

    // Because the FOV trick, world units at z=0 map 1:1 to CSS pixels.
    this.planeLogo.scale.set(bounds.width, bounds.height, 1);

    this.planeLogo.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    this.planeLogo.position.y = -bounds.top + this.sizes.height / 2 - bounds.height / 2;

    this.gridHelper.position.y = this.planeLogo.position.y*0.85;

    this.applyCoverUV(this.logoTexture, bounds.width, bounds.height);
  }

  addLogo() {
    if (!this.logoDom) return;

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(imgLogo.src, (texture) => {
      texture.minFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = false;

      this.logoTexture = texture;

      const geometry = new THREE.PlaneGeometry(1, 1);
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
      });

      this.planeLogo = new THREE.Mesh(geometry, material);
      this.planeLogo.position.z = 0; // Important for the 1:1 mapping assumption

      this.planeLogo.layers.set(1);

      this.scene.add(this.planeLogo);

      this.syncLogoToDOM();
    });
  }

  initPsxModel() {
    const loader = new GLTFLoader();
    loader.load(
      modelPsx,
      (glb) => {
        console.log(glb)
        glb.scene.position.z = 500;
        glb.scene.scale.setScalar(20);

        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0x0000ff, // White color for the wireframe
          wireframe: true
        });
        glb.scene.traverse(function (child) {
        if (child.isMesh) {
          // Check if the material exists and set the wireframe property to true
          if (Array.isArray(child.material)) {
            child.material.forEach(material => {
              material = wireframeMaterial
            });
          } else if (child.material) {
            child.material = wireframeMaterial;
          }
        }
      })
        this.scene.add(glb.scene);
      },
      function(xhr) {
        console.log((xhr.loaded/xhr.total) * 100 + '% loaded');
      },
      function(error) {
        console.log(error)
      }
    );
  }

  initFX() {
    this.baseRenderTarget = new THREE.WebGLRenderTarget( this.sizes.width, this.sizes.height, { type: THREE.HalfFloatType } )
    this.composer = new EffectComposer(this.renderer);
    this.composer.renderToScreen = false;
    const renderPass = new RenderPass(this.scene, this.camera);

    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.uniforms.resolution.value.set( 1 / this.sizes.width, 1 / this.sizes.height );
    fxaaPass.renderToScreen = true;
    fxaaPass.material.transparent = true;         

    // Let's use it outside >:D
    this.badTVPass = new ShaderPass(BadTVShader);
    this.badTVPass.uniforms.distortion.value = 0.1;
    this.badTVPass.uniforms.distortion2.value = 0.2; // 0.2 ok
    this.badTVPass.uniforms.rollSpeed.value = 0.99; // 0.99 and remove -time2 in the shader

    const cgaPass = new ShaderPass(CGAShader);
    cgaPass.uniforms.resolution.value.set(this.sizes.width, this.sizes.height)
    cgaPass.uniforms.colDark.value = new THREE.Color('#0000ff');
    cgaPass.uniforms.colLight.value = new THREE.Color('#00a1ff');
    cgaPass.uniforms.amount.value   = 1;
    cgaPass.uniforms.scale.value    = 3;
    
    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms.amount.value = 0.0015;
    rgbShiftPass.renderToScreen = true;
    rgbShiftPass.enabled = true;
    
    const bloom = new UnrealBloomPass(new THREE.Vector2(this.sizes.width, this.sizes.height), 0.2, 0.0, 0.0 );

    this.composer.addPass(renderPass);
    this.composer.addPass(fxaaPass);
    this.composer.addPass(this.badTVPass);
    this.composer.addPass(cgaPass);
    this.composer.addPass(rgbShiftPass);
    this.composer.addPass(bloom);

    this.mixPass = new ShaderPass(
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
    this.mixPass.needsSwap = true;

    const outputPass = new OutputPass();
    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(renderPass);
    this.finalComposer.addPass(this.mixPass);
    this.finalComposer.addPass(outputPass);
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());
    //this.renderer.render(this.scene, this.camera);
    this.badTVPass.uniforms.time.value = this.clock.getElapsedTime() * 0.05;

    this.camera.layers.set(0);
    this.renderer.setRenderTarget(this.baseRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.camera.layers.set(1);
    this.composer.render();

    this.mixPass.uniforms.baseTexture.value = this.baseRenderTarget.texture;
    this.mixPass.uniforms.fxTexture.value = this.composer.readBuffer.texture; // result of FX chain

    this.finalComposer.render();

    //this.renderer.clear();
    //this.composer.render();
  }
}

new MainScreen({ dom: document.getElementById('webgl') });