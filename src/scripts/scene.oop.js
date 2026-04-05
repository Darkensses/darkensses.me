import * as THREE from 'three';
import Lenis from 'lenis';

import imgLogo from '../assets/images/text.png';
import modelPsx from '../assets/models/we2002model_centered.glb';
import { EffectComposer, FXAAShader, GLTFLoader, OutputPass, RenderPass, RGBShiftShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { CGAShader } from './fx/FxCGA';
import { BadTVShader } from './shaders/BadTVShader';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

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
    this.scrollSeparatorDom = document.querySelector('#model-box');
    //this.headerStickyDom = document.getElementById('header-sticky-wrapper');
    this.planeLogo = null;
    this.logoTexture = null;

    this.psxModel = null;
    this.glbSize = null;

    // GSAP code
    //gsap.ticker.add((time) => this.lenis.raf(time * 1000));
    //gsap.ticker.lagSmoothing(0);
    this.setupPsxAnimation();

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

  setupPsxAnimation() {
    const box = document.getElementById('model-box');
    const target = document.getElementById('model-target');

    const boxRect = box.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const boxCX = boxRect.left + boxRect.width / 2;
    const boxCY = boxRect.top + boxRect.height / 2;
    const targetCX = targetRect.left + targetRect.width / 2;
    const targetCY = targetRect.top + targetRect.height / 2;

    const dx = targetCX - boxCX;
    const dy = targetCY - boxCY;
    const scale = targetRect.height / boxRect.height;

    gsap.to(box, {
      x: dx, y: dy, scale,
      ease: 'none',
      scrollTrigger: {
        trigger: '#scroll-separator',
        start: 'center center',
        end: 'bottom top+=10%',
        //pin: true,
        scrub: 1,
        //markers: true,
        onUpdate: (self) => {
          this.cgaPass2.uniforms.scale.value = gsap.utils.interpolate(9, 2, self.progress)
        }
      }
    })
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
      ScrollTrigger.update(); 
      this.syncLogoToDOM();
      this.syncPsxModelToDOM();      
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
      this.syncPsxModelToDOM();
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
    //this.gridHelper = new THREE.GridHelper(1000,16, 0x0000FF, 0x0000FF);
    const geometry = new THREE.TorusGeometry(300, 200, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 'blue', wireframe: true });
    this.torus = new THREE.Mesh(geometry, material);
    this.torus.rotation.x = 90*Math.PI/180;
    this.torus.position.x = -500;
    //this.scene.add(this.torus);
    
  }

  onScrollGrid(value) {
    //const bounds = this.logoDom.getBoundingClientRect();

    // Because the FOV trick, world units at z=0 map 1:1 to CSS pixels.
    //this.planeLogo.scale.set(bounds.width, bounds.height, 1);

    // this.planeLogo.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    // this.planeLogo.position.y = -bounds.top + this.sizes.height / 2 - bounds.height / 2;

    //this.gridHelper.rotation.x = (10 * Math.PI / 180) + ((value*0.1) * Math.PI / 180);
    //this.gridHelper.position.z = -value*0.5;
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

    //this.gridHelper.position.y = this.planeLogo.position.y*0.85;

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

  syncPsxModelToDOM() {
    if (!this.scrollSeparatorDom || !this.psxModel) return;

    const bounds = this.scrollSeparatorDom.getBoundingClientRect();

    // const center = new THREE.Vector3();
    // box.getCenter(center);
    // this.psxModel.scene.position.sub(center);

    const scale = bounds.height * 0.8 / this.glbSize.y;
    this.psxModel.scene.scale.set(scale,scale,scale);
    this.psxModel.scene.position.y = -scale;

    this.psxModel.scene.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    this.psxModel.scene.position.y = (-bounds.top + this.sizes.height / 2 - bounds.height / 2);

  }

  initPsxModel() {
    const loader = new GLTFLoader();
    loader.load(
      modelPsx,
      (glb) => {
        console.log(glb)
        this.psxModel = glb;

        // calculate here, otherwise you will get jittering!
        const box = new THREE.Box3().setFromObject(glb.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        this.glbSize = size;

        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0xffffff, // White color for the wireframe
          wireframe: true
        });
        this.psxModel.scene.traverse(function (child) {
          if (child.isMesh) {
            // Check if the material exists and set the wireframe property to true
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                material = wireframeMaterial
              });
            } else if (child.material) {
              child.material = wireframeMaterial;
            }
            child.layers.set(2)
          }
        })
        this.scene.add(this.psxModel.scene);
        this.syncPsxModelToDOM();
      },
      function(xhr) { // TODO: Change to THREE.LoadingManager
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
    this.badTVPass.uniforms.rollSpeed.value = 0; // 0.99 and remove -time2 in the shader

    const cgaPass = new ShaderPass(CGAShader);
    cgaPass.uniforms.resolution.value.set(this.sizes.width, this.sizes.height)
    cgaPass.uniforms.colDark.value = new THREE.Color('#0000ff');
    cgaPass.uniforms.colLight.value = new THREE.Color('#00a1ff');
    cgaPass.uniforms.amount.value   = 1.2; // have fun here :))
    cgaPass.uniforms.scale.value    = 3; // 1.5 for mobile

    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms.amount.value = 0.0035;
    rgbShiftPass.renderToScreen = true;
    rgbShiftPass.enabled = true;

    const bloom = new UnrealBloomPass(new THREE.Vector2(this.sizes.width, this.sizes.height), 0.2, 0.0, 0.0 );

    this.composer.addPass(renderPass);
    this.composer.addPass(fxaaPass);
    this.composer.addPass(this.badTVPass);
    this.composer.addPass(cgaPass);
    this.composer.addPass(rgbShiftPass);
    this.composer.addPass(bloom);

    const _mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          fxTexture: { value: null },
          fxTexture2: { value: null }
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
          uniform sampler2D fxTexture2;

          void main() {
            gl_FragColor = texture2D(baseTexture, vUv) + texture2D(fxTexture, vUv) + texture2D(fxTexture2, vUv);
          }
        `
      })
    );
    this.mixPass = _mixPass;
    this.mixPass.needsSwap = true;

    this.baseRenderTarget2 = new THREE.WebGLRenderTarget( this.sizes.width, this.sizes.height, { type: THREE.HalfFloatType } )
    this.composer2 = new EffectComposer(this.renderer);
    this.composer2.renderToScreen = false;
    const fxaaPass2 = new ShaderPass(FXAAShader);
    fxaaPass2.uniforms.resolution.value.set( 1 / (this.sizes.width * window.devicePixelRatio), 1 /( this.sizes.height * window.devicePixelRatio ));
    fxaaPass2.renderToScreen = true;
    fxaaPass2.material.transparent = true;
    //fxaaPass2.enabled = false
    this.cgaPass2 = new ShaderPass(CGAShader);
    this.cgaPass2.uniforms.resolution.value.set(this.sizes.width, this.sizes.height)
    this.cgaPass2.uniforms.colDark.value = new THREE.Color('#0000ff');
    this.cgaPass2.uniforms.colLight.value = new THREE.Color('#00a1ff');
    this.cgaPass2.uniforms.amount.value   = 1; // have fun here :))
    this.cgaPass2.uniforms.scale.value    = 9; // 1.5 for mobile
    this.badTVPass2 = new ShaderPass(BadTVShader);
    this.badTVPass2.uniforms.distortion.value = 0.1;
    this.badTVPass2.uniforms.distortion2.value = 0.02;
    this.badTVPass2.uniforms.rollSpeed.value = 0;
    const bloom2 = new UnrealBloomPass(new THREE.Vector2(this.sizes.width, this.sizes.height), 0.2, 0.5, 0.0 );
    this.composer2.addPass(renderPass);
    //this.composer2.addPass(fxaaPass2);
    this.composer2.addPass(this.badTVPass2);
    this.composer2.addPass(this.cgaPass2);
    this.composer2.addPass(bloom2)


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
    this.badTVPass2.uniforms.time.value = this.clock.getElapsedTime() * 0.05;

    this.camera.layers.set(0);
    this.renderer.setRenderTarget(this.baseRenderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);

    this.camera.layers.set(1);
    this.composer.render();

    this.camera.layers.set(2);
    this.composer2.render();

    this.mixPass.uniforms.baseTexture.value = this.baseRenderTarget.texture;
    this.mixPass.uniforms.fxTexture.value = this.composer.readBuffer.texture; // result of FX chain
    this.mixPass.uniforms.fxTexture2.value = this.composer2.readBuffer.texture;

    this.finalComposer.render();

    // this.mixPass2.uniforms.baseTexture.value = this.mixPass.uniforms.baseTexture.value;
    // this.mixPass2.uniforms.fxTexture.value = this.composer2.readBuffer.texture; // result of FX chain


    //this.renderer.clear();
    //this.composer.render();
  }
}

new MainScreen({ dom: document.getElementById('webgl') });