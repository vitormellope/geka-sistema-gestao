export function Spinner({ className = 'w-8 h-8' }: { className?: string }) {
  return <span className={`spinner ${className}`} />
}

export function PageSpinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <Spinner className="w-10 h-10" />
    </div>
  )
}
