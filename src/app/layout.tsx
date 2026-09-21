import type { ReactNode } from 'react'
import 'react-notion-x/src/styles.css'
import 'prismjs/themes/prism.css'
import 'katex/dist/katex.min.css'
import './globals.css'

// applies persisted dark mode before first paint
const themeScript = `try{if(localStorage.getItem('oopy-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
