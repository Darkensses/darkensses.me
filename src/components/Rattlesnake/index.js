import React, { useRef, useEffect, useState } from "react"
import { useFrame } from "react-three-fiber"
import { map, noise } from "./PerlinNoise"

function Rattlesnake(props) {
  let ref = useRef()
  let refPlaneGeo = useRef()
  let [arrayMountains, setArrayMountains] = useState([]);

  useEffect(() => {generateTerrain()},[])

  const generateTerrain = () => {    
    console.log(refPlaneGeo.current)
    let {position} = refPlaneGeo.current.attributes;    
    let smooth = 5;
    //let noiseValue = 0;
    for (let i = 0; i < position.count; i++) {
        let { x, y, z } = {x: position.array[i*3], y: position.array[i*3+1], z: position.array[i*3+2]};        
        let noiseValue = map(noise(x / smooth, (z + y) / smooth), 0, 0.8, -1.5, 3) * -1.05;
        setArrayMountains(oldValue => [...oldValue, { index: i, noiseValue: noiseValue }])
        refPlaneGeo.current.attributes.position.array[i*3+2] = noiseValue;
    }
    position.needsUpdate = true;
    refPlaneGeo.current.computeVertexNormals();
  }

  let delta = 0;
  useFrame(() => {
    arrayMountains.forEach((mountain, idx) => {
       let planeIndex = Math.floor((idx + delta) % arrayMountains.length);
       refPlaneGeo.current.attributes.position.array[arrayMountains[planeIndex].index * 3 + 2] = mountain.noiseValue;
    })
    refPlaneGeo.current.attributes.position.needsUpdate = true;
    refPlaneGeo.current.computeVertexNormals();
    delta += 0.6;
  });
//7,2.5,3
  return (
    <mesh ref={ref} position={props.position} rotation={[(70 * Math.PI) / 180, (25 * Math.PI) / 180, (90 * Math.PI) / 180]}>
      <planeGeometry ref={refPlaneGeo} args={[15, 30, 90, 90]} />
      <meshBasicMaterial wireframe={true} color="#6a83f7" />
    </mesh>
  );
}

export default Rattlesnake;