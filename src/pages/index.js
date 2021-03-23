import React from "react"
import About from "../components/About"

import Layout from "../components/layout"
import MainHeader from "../components/MainHeader"
import SEO from "../components/seo"

const IndexPage = () => (
  <Layout>
    <SEO title="Darkensses" />
    <MainHeader/>
    <About />
  </Layout>
)

export default IndexPage
