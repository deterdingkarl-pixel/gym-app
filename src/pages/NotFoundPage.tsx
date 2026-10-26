import { Link } from 'react-router'

export function NotFoundPage({ text = 'Diese Seite gibt es nicht.' }: { text?: string }) {
  return (
    <div className="card mt-4 text-center">
      <p className="mb-3 text-zinc-500">{text}</p>
      <Link to="/" className="btn btn-primary">
        Zum Training
      </Link>
    </div>
  )
}
