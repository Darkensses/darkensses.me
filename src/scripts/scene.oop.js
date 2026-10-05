import * as THREE from 'three';
import { lenis } from './lenis';
import imgLogo from '../assets/images/text.png';
import modelPsx from '../assets/models/we2002model_centered.glb';
import modelSeraph from '../assets/models/angel_marble_optimized_centered.glb';
import { DRACOLoader, EffectComposer, FXAAShader, GLTFLoader, OutputPass, RenderPass, RGBShiftShader, ShaderPass, UnrealBloomPass } from 'three/examples/jsm/Addons.js';
import { CGAShader } from './fx/FxCGA';
import { BadTVShader } from './shaders/BadTVShader';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

import asciiShader from '../scripts/shaders/ascii.frag'

const artImages = import.meta.glob('../assets/images/art/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default'
});
const artUrls = Object.values(artImages);

gsap.registerPlugin(ScrollTrigger, SplitText);

export default class MainScreen {
  constructor(options) {
    this.container = options.dom;
    this.sizes = { width: window.innerWidth, height: window.innerHeight };
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.lenis = lenis

    this.perspective = 600;

    this.logoDom = document.querySelector('#logotext h2');
    this.scrollSeparatorDom = document.querySelector('#model-target');
    this.modelSeraphDOM = document.querySelector('#model-divine');
    //this.headerStickyDom = document.getElementById('header-sticky-wrapper');
    this.planeLogo = null;
    this.logoTexture = null;

    this.psxModel = null;
    this.mixerPsxModel = null;
    this.glbSize = null;

    this.modelSeraph = null;
    this.seraphSize = null;

    // GSAP code
    //gsap.ticker.add((time) => this.lenis.raf(time * 1000));
    //gsap.ticker.lagSmoothing(0);

    //this.setupTextAnimation();

    this.initCamera();
    this.initRenderer();
    this.addLogo();
    this.initPsxModel();
    this.initModelSeraph();
    this.initGallery();
    this.initFX();
    this.addEventListeners();
    this.animate();
  }

  // TODO: Check in case you want to use a similar effect,
  // otherwise delete it!
  setupTextAnimation() {
    let split = new SplitText('.lyrics--large', { type: 'chars, lines, words' });

    gsap.from(split.chars, {
      yPercent: 50,
      opacity: 0,
      stagger: 0.1,
      ease: "expo.out",
      scrollTrigger: {
        trigger: '.lyrics--large',
        start: 'top 70%',
        markers: false,
        toggleActions: "play none none reverse"
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
      this.syncModelSeraphToDOM();
    });
  }

  onResize() {
    this.sizes.width = window.innerWidth;
    this.sizes.height = window.innerHeight;

    this.updateCamera();

    this.renderer.setSize(this.sizes.width, this.sizes.height);

    // Real resize
    const { width: w, height: h} = this.sizes;
    const pr = this.renderer.getPixelRatio();

    [
      this.composer, this.composer2,
      this.asciiFxComposer, this.galleryComposer,
      this.finalComposer
    ].forEach(c => c.setSize(w, h));

    [this.asciiDepthRT, this.galleryDepthRT].forEach(rt => {
      rt.setSize(w * pr, h * pr);
      rt.depthTexture.image.width = w * pr;
      rt.depthTexture.image.height = h * pr;
    });

    this.fxaaPass.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    this.asciiFxMaterial.uniforms.u_resolution.value.set(w, h, 1, 1);
    this.cgaPass.uniforms.resolution.value.set(w, h);
    this.cgaPass2.uniforms.resolution.value.set(w, h);

    // Ensure layout has settled before reading bounds
    window.requestAnimationFrame(() => {
      if (this.lenis) this.lenis.resize();
      ScrollTrigger.refresh();
      this.syncLogoToDOM();
      this.syncPsxModelToDOM();
      this.syncModelSeraphToDOM();
    });
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
    //this.psxModel.scene.position.y = -scale;

    this.psxModel.scene.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    this.psxModel.scene.position.y = (-bounds.top + this.sizes.height / 2 - bounds.height / 2);

  }

  syncModelSeraphToDOM() {
    if (!this.modelSeraphDOM || !this.modelSeraph) return;

    const bounds = this.modelSeraphDOM.getBoundingClientRect();

    const scale = bounds.height / this.seraphSize.y;
    this.modelSeraph.scene.scale.set(scale,scale,scale);

    this.modelSeraph.scene.position.x = bounds.left - this.sizes.width / 2 + bounds.width / 2;
    this.modelSeraph.scene.position.y = (-bounds.top + this.sizes.height / 2 - bounds.height / 2);

    if(this.light2) this.light2.target.position.copy(this.modelSeraph.scene.position);
    if(this.gallery) {
      this.gallery.position.copy(this.modelSeraph.scene.position);
      this.gallery.position.z = 100;
    }

  }

  initModelSeraph() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/jsm/');
    dracoLoader.setDecoderConfig({type: 'js'})
    loader.setDRACOLoader( dracoLoader );
    loader.load(modelSeraph, (glb) => {
      this.modelSeraph = glb;

      const box = new THREE.Box3().setFromObject(this.modelSeraph.scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      this.seraphSize = size;

      this.modelSeraph.scene.traverse((child) => {
        if(child.isMesh) {
          child.material = new THREE.MeshStandardMaterial();
          child.layers.set(3);
        }
      });
      this.scene.add(this.modelSeraph.scene);
      this.syncModelSeraphToDOM();
      const light1 = new THREE.AmbientLight(0xffffff, 0.77);
      light1.layers.set(3);
      this.scene.add(light1);

      this.light2 = new THREE.DirectionalLight(0xffffff, 3.5);
      this.light2.position.set(0.5,0,0.866);
      this.light2.layers.set(3);
      this.scene.add(this.light2);
      this.scene.add(this.light2.target);
      this.light2.target.position.copy(this.modelSeraph.scene.position);

    }, (xhr) => console.log(xhr.loaded/xhr.total  * 100 + '% loaded [seraph]'))
  }

  initGallery() {
    const itemSize = 100;
    const numItems = artUrls.length;
    const radius = 300;

    const geometry = new THREE.PlaneGeometry(itemSize, itemSize);
    this.gallery = new THREE.Group();
    const loader = new THREE.TextureLoader();

    artUrls.forEach((url, i) => {
      loader.load(url.src, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const theta = (i/numItems) * Math.PI * 2;
        const plane = new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({map: texture})
        );
        plane.position.set(radius * Math.cos(theta), 0, radius * Math.sin(theta));
        plane.layers.set(4);
        this.gallery.add(plane);
      });
    });
    this.scene.add(this.gallery);
  }

  initPsxModel() {
    const loader = new GLTFLoader();
    loader.load(
      modelPsx,
      (glb) => {
        this.psxModel = glb;

        // calculate here, otherwise you will get jittering!
        const box = new THREE.Box3().setFromObject(glb.scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        this.glbSize = size;

        const wireframeMaterial = new THREE.MeshBasicMaterial({
          color: 0x0000ff, // White color for the wireframe
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

        this.mixerPsxModel = new THREE.AnimationMixer(this.psxModel.scene);
        this.mixerPsxModel.clipAction(this.psxModel.animations[0]).play();
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
    // Device pixel ratio (already capped in initRenderer). EffectComposer sizes its own
    // buffers at CSS size * pr, so anything we create by hand (depth RTs) or any shader
    // that needs the size of one real texel (FXAA) must use `size * pr` to match.
    // CGA and ASCII resolution uniforms stay in CSS px on purpose: they only use ratios,
    // and their look is tied to CSS width.
    const pr = this.renderer.getPixelRatio();
    this.composer = new EffectComposer(this.renderer);
    this.composer.renderToScreen = false;
    const renderPass = new RenderPass(this.scene, this.camera);

    this.asciiFxMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0 },
        u_texture: { value: null },
        u_resolution: { value: new THREE.Vector4(this.sizes.width, this.sizes.height,1,1) },
        u_cells: { value: 300 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vUv = uv;
        }
      `,
      fragmentShader: asciiShader
    });
    this.asciiFxPass = new ShaderPass(this.asciiFxMaterial, 'u_texture');

    this.asciiFxComposer = new EffectComposer(this.renderer);
    this.asciiFxComposer.renderToScreen = false;
    this.asciiFxComposer.addPass(renderPass);
    this.asciiFxComposer.addPass(this.asciiFxPass);

    this.galleryComposer = new EffectComposer(this.renderer);
    this.galleryComposer.renderToScreen = false;
    this.galleryComposer.addPass(new RenderPass(this.scene, this.camera));

    this.asciiDepthRT = new THREE.WebGLRenderTarget(this.sizes.width * pr, this.sizes.height * pr, {
      depthTexture: new THREE.DepthTexture(this.sizes.width * pr, this.sizes.height * pr)
    });
    this.galleryDepthRT = new THREE.WebGLRenderTarget(this.sizes.width * pr, this.sizes.height * pr, {
      depthTexture: new THREE.DepthTexture(this.sizes.width * pr, this.sizes.height * pr)
    });

    this.fxaaPass = new ShaderPass(FXAAShader);
    this.fxaaPass.uniforms.resolution.value.set( 1 / (this.sizes.width * pr), 1 / (this.sizes.height * pr) );
    this.fxaaPass.material.transparent = true;

    // Let's use it outside >:D
    this.badTVPass = new ShaderPass(BadTVShader);
    this.badTVPass.uniforms.distortion.value = 0.1;
    this.badTVPass.uniforms.distortion2.value = 0.2; // 0.2 ok
    this.badTVPass.uniforms.rollSpeed.value = 0; // 0.99 and remove -time2 in the shader

    this.cgaPass = new ShaderPass(CGAShader);
    this.cgaPass.uniforms.resolution.value.set(this.sizes.width, this.sizes.height)
    this.cgaPass.uniforms.colDark.value = new THREE.Color('#0000ff');
    this.cgaPass.uniforms.colLight.value = new THREE.Color('#00a1ff');
    this.cgaPass.uniforms.amount.value   = 1.2; // have fun here :))
    this.cgaPass.uniforms.scale.value    = 3; // 1.5 for mobile

    const rgbShiftPass = new ShaderPass(RGBShiftShader);
    rgbShiftPass.uniforms.amount.value = 0.0035;
    rgbShiftPass.enabled = true;

    const bloom = new UnrealBloomPass(new THREE.Vector2(this.sizes.width, this.sizes.height), 0.2, 0.0, 0.0 );

    this.composer.addPass(renderPass);
    this.composer.addPass(this.fxaaPass);
    this.composer.addPass(this.badTVPass);
    this.composer.addPass(this.cgaPass);
    this.composer.addPass(rgbShiftPass);
    this.composer.addPass(bloom);

    this.mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          fxTexture: { value: null },
          fxTexture2: { value: null },
          asciiFxColor: { value: null },
          asciiFxDepth: { value: null },
          galleryColor: { value: null },
          galleryDepth: { value: null }
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

          uniform sampler2D fxTexture;
          uniform sampler2D fxTexture2;
          uniform sampler2D asciiFxColor;
          uniform sampler2D asciiFxDepth;
          uniform sampler2D galleryColor;
          uniform sampler2D galleryDepth;

          void main() {
            float dASCII = texture2D(asciiFxDepth, vUv).r;
            float dGallery = texture2D(galleryDepth, vUv).r;
            vec4 winner = dGallery < dASCII ? texture2D(galleryColor, vUv) : texture2D(asciiFxColor, vUv);
            gl_FragColor = texture2D(fxTexture, vUv) + texture2D(fxTexture2, vUv) + winner;
          }
        `
      })
    );

    this.composer2 = new EffectComposer(this.renderer);
    this.composer2.renderToScreen = false;

    this.cgaPass2 = new ShaderPass(CGAShader);
    this.cgaPass2.uniforms.resolution.value.set(this.sizes.width, this.sizes.height)
    this.cgaPass2.uniforms.colDark.value = new THREE.Color('#0000ff');
    this.cgaPass2.uniforms.colLight.value = new THREE.Color('#ffffff');
    this.cgaPass2.uniforms.colWhite.value = new THREE.Color('#0000ff');
    this.cgaPass2.uniforms.amount.value   = 0.05; // have fun here :))
    this.cgaPass2.uniforms.scale.value    = 2; // 1.5 for mobile
    this.badTVPass2 = new ShaderPass(BadTVShader);
    this.badTVPass2.uniforms.distortion.value = 0.1;
    this.badTVPass2.uniforms.distortion2.value = 0.02;
    this.badTVPass2.uniforms.rollSpeed.value = 0;
    const bloom2 = new UnrealBloomPass(new THREE.Vector2(this.sizes.width, this.sizes.height), 0.32, 0.15, 0.0 );
    this.composer2.addPass(renderPass);

    // Note: If you add a FXAA pass, you can get a ghosty-glitched FX
    this.composer2.addPass(this.badTVPass2);
    this.composer2.addPass(this.cgaPass2);
    this.composer2.addPass(bloom2)


    const outputPass = new OutputPass();
    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(this.mixPass);
    this.finalComposer.addPass(outputPass);
  }

  animate() {
    window.requestAnimationFrame(() => this.animate());

    if(this.mixerPsxModel) this.mixerPsxModel.update(this.clock.getDelta()*0.9)

    this.badTVPass.uniforms.time.value = this.clock.getElapsedTime() * 0.05;
    this.badTVPass2.uniforms.time.value = this.clock.getElapsedTime() * 0.05;
    this.asciiFxMaterial.uniforms.u_time.value = this.clock.getElapsedTime();

    this.camera.layers.set(1);
    this.composer.render();

    this.camera.layers.set(2);
    this.composer2.render();

    this.camera.layers.set(3);
    this.asciiFxComposer.render();

    this.camera.layers.set(4);
    this.galleryComposer.render();

    this.camera.layers.set(3);
    this.renderer.setRenderTarget(this.asciiDepthRT);
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera);

    this.camera.layers.set(4);
    this.renderer.setRenderTarget(this.galleryDepthRT);
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera);

    this.mixPass.uniforms.fxTexture.value = this.composer.readBuffer.texture; // result of FX chain
    this.mixPass.uniforms.fxTexture2.value = this.composer2.readBuffer.texture;
    this.mixPass.uniforms.asciiFxColor.value = this.asciiFxComposer.readBuffer.texture;
    this.mixPass.uniforms.asciiFxDepth.value = this.asciiDepthRT.depthTexture;
    this.mixPass.uniforms.galleryColor.value = this.galleryComposer.readBuffer.texture;
    this.mixPass.uniforms.galleryDepth.value = this.galleryDepthRT.depthTexture;

    this.finalComposer.render();
  }
}

new MainScreen({ dom: document.getElementById('webgl') });