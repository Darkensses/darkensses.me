/**
 * @author felixturner / http://airtight.cc/
 *
 * Bad TV Shader
 * Simulates a bad TV via horizontal distortion and vertical roll
 * Uses Ashima WebGl Noise: https://github.com/ashima/webgl-noise
 *
 * time: steadily increasing float passed in
 * distortion: amount of thick distortion
 * distortion2: amount of fine grain distortion
 * speed: distortion vertical travel speed
 * rollSpeed: vertical roll speed
 *
 * v0.2
 * Fixed black bars on mobile
 */

import noise2d from './lib/noise2d.js';

export const BadTVShader = {
  name: 'Bad TV',
  uniforms: {
    tDiffuse: { type: 't', value: null },
    time: { type: 'f', value: 0.0 },
    distortion: {
      type: 'f',
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      gui: true,
      name: 'Thick Distort',
      randRange: 'low'
    },
    distortion2: {
      type: 'f',
      value: 0.2,
      min: 0,
      max: 1,
      step: 0.01,
      gui: true,
      name: 'Fine Distort',
      randRange: 'low'
    },
    rollSpeed: {
      type: 'f',
      value: 1.0,
      min: 0.0,
      max: 3.0,
      step: 1.0,
      gui: true,
      name: 'Roll Speed',
      randRange: 'low'
    }
  },

  vertexShader: `
  varying vec2 vUv;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
  }
  `,

  fragmentShader: /* glsl */ `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float distortion;
  uniform float distortion2;
  uniform float rollSpeed;
  varying vec2 vUv;
  uniform float seed;
  
  ${noise2d}

  void main() {

    vec2 p = vUv;
    float time2 = time + seed;
    float ty = time2 * 2.;
    float yt = p.y + ty;

    //thick distortion
    float offset = noise2d(vec2(yt*3.0,0.0))*0.2;
    offset = offset*distortion * offset*distortion * offset * 36.;
    //fine distortion
    offset += noise2d(vec2(yt*50.0,0.0))*distortion2*0.012;
    
    //combine distortion on X with roll on Y
    gl_FragColor = texture2D(tDiffuse,  vec2(fract(p.x + offset),fract(p.y - time2 * rollSpeed) ));

  }
`
};
