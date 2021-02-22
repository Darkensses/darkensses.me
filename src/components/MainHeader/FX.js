import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from "three";
import { extend, useFrame, useThree } from 'react-three-fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass"
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass'
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass"

extend({EffectComposer, RenderPass, FilmPass, UnrealBloomPass})


function Effects() {
    const composer = useRef();
    const {gl, size, scene, camera} = useThree();
    const aspect = useMemo(() => new THREE.Vector2(size.width, size.height), [
      size,
    ])
    useEffect(() => void composer.current.setSize(size.width, size.height), [size])
    useFrame(() => composer.current.render(), 1)
  //strength, radius, threshold
    return(
      <effectComposer ref={composer} args={[gl]}>
        <renderPass attachArray="passes" scene={scene} camera={camera} />
        
        <unrealBloomPass attachArray="passes" args={[aspect, 2, 0, 0.25]} />
      </effectComposer>
    )
}

export default Effects;