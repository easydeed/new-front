import Head from 'next/head'
import Hero from '../components/Hero'
import WhyTiles from '../components/WhyTiles'
import WorkflowStrip from '../components/WorkflowStrip'
import IntegrationsSection from '../components/IntegrationsSection'
import DevelopersSection from '../components/DevelopersSection'
import StickyActionBar from '../components/StickyActionBar'

export default function Home() {
  return (
    <>
      <Head>
        <title>DeedPro — Escrow Skin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main>
        <Hero />
        <WhyTiles />
        <WorkflowStrip />
        <IntegrationsSection />
        <DevelopersSection />
      </main>

      <StickyActionBar />
    </>
  )
}
