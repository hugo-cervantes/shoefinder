import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Tab title */}
        <title>SoleMate</title>

        {/* Favicon - drop favicon.ico and logo.png into your /public folder */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo.png" />

        {/* Tab / share preview */}
        <meta name="description" content="Find your perfect shoe. Compare brands, find your fit, discover your style." />
        <meta property="og:title" content="SoleMate" />
        <meta property="og:description" content="Find your perfect shoe." />
        <meta property="og:image" content="/logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
