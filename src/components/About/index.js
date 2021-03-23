import React from "react"
import Img from "gatsby-image"
import { graphql, useStaticQuery } from "gatsby"
import "./styles.css"

function About() {
  const data = useStaticQuery(graphql`
    query {
      fileName: file(relativePath: { eq: "me.jpg" }) {
        childImageSharp {
          fluid(maxWidth: 600, maxHeight: 600) {
            ...GatsbyImageSharpFluid
          }
        }
      }
    }
  `)
  return (
    <section id="about" className="about__section">        
      <div className="about__wrapper">
      <h2 style={{width: '100%', position: 'relative'}}>Sobre Mí</h2>
        <div
          style={{
            position: "relative",
            width: '100%',
            maxWidth: "300px",
            maxHeight: "300px",
          }}
        >
          <Img
            className="about__img"
            fluid={data.fileName.childImageSharp.fluid}
            alt="Avatar"
          />
        </div>
        <div style={{marginLeft: 30, marginRight: 30}}>
          <p style={{marginBottom: 15}}>
            ¡Hey! me llamo Jasiel, me gusta escuchar a los King Gizzard {"&"}{" "}
            the Lizard Wizard y desarrollar cosas para automatizar pruebas y
            procesos, tambíen por diversión y para hacer un poco de ROM Hacking
            para PSX :)
          </p>
          <p>
            Actualmente trabajo como SDET en el area de QA @ Softtek. Tambien
            soy mentor porque me gusta difundir y compartir con todo el mundo lo
            que he aprendido. Creo fielmente en el Open Source y soy un
            entusiasta de los Hackathons, tanto que he partcipado como Juez en
            el HackMTY, el hackathon más grande de latinoamérica.
          </p>
        </div>
      </div>
    </section>
  )
}
export default About
