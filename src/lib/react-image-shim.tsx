// Replaces `react-image` (used by react-notion-x's GracefulImage). Its <Img> renders nothing until the image loads,
// while the server renders a plain <img>, so hydration mismatched whenever the load raced ahead of React (#418).
// A plain <img> is enough: react-notion-x only used it to hide broken images.
import type { ImgHTMLAttributes } from 'react'

export function Img(props: ImgHTMLAttributes<HTMLImageElement> & { loader?: unknown; unloader?: unknown }) {
  const { loader: _l, unloader: _u, ...rest } = props
  return <img {...rest} />
}
