import * as THREE from "three"
import React, { useEffect, useRef, useState } from "react"
import { MeshDistortMaterial } from "@react-three/drei"
import { Canvas, useFrame, useThree } from "react-three-fiber"
import Rattlesnake from "../Rattlesnake"
import "./styles.css"
import Emoji from "../Emoji"
import Effects from "./FX"

// CONTACT
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faGithub,
  faFacebook,
  faTwitter,
  faLinkedin,
} from "@fortawesome/free-brands-svg-icons"
import { faEnvelope } from "@fortawesome/free-solid-svg-icons"



function Rig() {  
  const { camera } = useThree()

  const [scrollPos, setScrollPos] = useState(window.pageYOffset);

  // On Scroll
  const onScroll = () => {
    setScrollPos(window.pageYOffset);
    camera.position.y = 5 - window.pageYOffset/45
    //console.log(camera.position.y)
  };

  // Add and remove the window listener
  useEffect(() => {
    window.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  });  

  return useFrame(state => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, 0 + state.mouse.x * 2, 0.075)
    //camera.position.y = THREE.MathUtils.lerp(camera.position.y, 5 + state.mouse.y / 2, 0.075)
    state.camera.lookAt(0, 0, 0);
  })
}

function MainHeader() {
  return (
    <>
      <div className="mainHeader">
        <div className="mainHeader__canvas">
          <Canvas
            resize={{ scroll: false }}
            camera={{
              position: [0, 5, 8],
              fov: 85,
              rotation: [0, (180 * Math.PI) / 180, 0],
            }}
          >
            <color attach="background" args={['#080808']} />
            <fog color="#F06292" attach="fog" near={7} far={12} />
            <Rattlesnake />
            <pointLight position={[5, 3, 20]} intensity={0.7} color="#F06292" distance={800}/>
            <ambientLight color="#ffffff" intensity={0.6} />
            <mesh position={[-6, 4, 0]}>
              <sphereGeometry args={[0.8, 32, 32]} />
              <MeshDistortMaterial
                attach="material"
                distort={0.4}
                speed={3}
                wireframe={false}
                color={"#6a83f7"}
              />
            </mesh>
            <Rig />
            <Effects />
          </Canvas>
        </div>
        <div className="mainHeader__info">
          <span>
            Hola <Emoji symbol="👋" /> soy
          </span>
          <h1>Jasiel Guillen</h1>
          <span>Dev / QA</span>
          <div className="mainHeader__contact">
            <a href={`mailto:darkensses@gmail.com`}>
              <FontAwesomeIcon icon={faEnvelope} size="lg" color="#FFF" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://github.com/Darkensses"}>
              <FontAwesomeIcon icon={faGithub} size="lg" color="#FFF" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://facebook.com/Darkensses"}>
              <FontAwesomeIcon icon={faFacebook} size="lg" color="#FFF" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://twitter.com/Darkensses"}>
              <FontAwesomeIcon icon={faTwitter} size="lg" color="#FFF" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href={"https://www.linkedin.com/in/jasielguillen/"}>
              <FontAwesomeIcon icon={faLinkedin} size="lg" color="#FFF" />
            </a>
          </div>
        </div>
      </div>
    </>
  )
}

export default MainHeader
