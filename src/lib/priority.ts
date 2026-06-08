export function calcPriority(deadline: Date | null): string {
  if (!deadline) return 'normal'
  const now = new Date()
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 2) return 'urgente'
  if (diffDays <= 5) return 'alta'
  return 'normal'
}
