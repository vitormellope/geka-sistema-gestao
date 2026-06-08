/**
 * Status transition logic ported from the FastAPI prototype.
 * Controls which role can move a demand between statuses.
 */

export const TRANSITIONS: Record<string, Record<string, Set<string>>> = {
  nova: {
    em_triagem: new Set(['orcamentista', 'gerente']),
    pendencia_informacao: new Set(['orcamentista', 'gerente']),
    orcamento_direto: new Set(['orcamentista', 'gerente']),
    projeto_decupagem: new Set(['orcamentista', 'gerente']),
  },
  em_triagem: {
    pendencia_informacao: new Set(['orcamentista', 'gerente']),
    orcamento_direto: new Set(['orcamentista', 'gerente']),
    projeto_decupagem: new Set(['orcamentista', 'gerente']),
  },
  pendencia_informacao: {
    nova: new Set(['vendedor', 'assistente']),
  },
  orcamento_direto: {
    orcado: new Set(['orcamentista', 'gerente']),
    cancelada: new Set(['orcamentista', 'gerente']),
    pendencia_informacao: new Set(['orcamentista', 'gerente']),
  },
  projeto_decupagem: {
    orcamento_direto: new Set(['projetista', 'orcamentista', 'gerente']),
    cancelada: new Set(['projetista', 'orcamentista', 'gerente']),
    pendencia_informacao: new Set(['projetista', 'orcamentista', 'gerente']),
  },
  orcado: {
    proposta_enviada: new Set(['vendedor', 'assistente', 'gerente']),
  },
  proposta_enviada: {
    fechado: new Set(['vendedor', 'assistente', 'gerente']),
    orcamento_direto: new Set(['orcamentista', 'gerente']),
  },
}

/**
 * Transition pairs that require an observation/justification text.
 */
export const REQUIRES_OBSERVATION = new Set([
  'em_triagem->pendencia_informacao',
  'projeto_decupagem->pendencia_informacao',
  'orcamento_direto->pendencia_informacao',
])

/**
 * Human-readable labels in Brazilian Portuguese for each status.
 */
export const STATUS_LABELS: Record<string, string> = {
  nova: 'Nova',
  em_triagem: 'Em Triagem',
  pendencia_informacao: 'Pendência de Informação',
  orcamento_direto: 'Orçamento Direto',
  projeto_decupagem: 'Projeto / Decupagem',
  orcado: 'Orçado',
  proposta_enviada: 'Proposta Enviada',
  fechado: 'Fechado',
  cancelada: 'Cancelada',
}

/**
 * Check if a transition from currentStatus to newStatus is allowed for the given role.
 */
export function canTransition(currentStatus: string, newStatus: string, role: string): boolean {
  const targets = TRANSITIONS[currentStatus]
  if (!targets) return false
  const allowedRoles = targets[newStatus]
  if (!allowedRoles) return false
  return allowedRoles.has(role)
}

/**
 * Return all statuses the given role can transition to from currentStatus.
 */
export function getAvailableTransitions(currentStatus: string, role: string): string[] {
  const targets = TRANSITIONS[currentStatus]
  if (!targets) return []
  return Object.entries(targets)
    .filter(([, allowedRoles]) => allowedRoles.has(role))
    .map(([status]) => status)
}

/**
 * Check if a transition requires an observation/justification.
 */
export function requiresObservation(currentStatus: string, newStatus: string): boolean {
  return REQUIRES_OBSERVATION.has(`${currentStatus}->${newStatus}`)
}
