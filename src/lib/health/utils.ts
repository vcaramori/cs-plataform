export function getHealthClassification(score: number): string {
  if (score >= 80) return 'Saudável / Engajado';
  if (score >= 60) return 'Estável com pontos de atenção';
  if (score >= 40) return 'Risco moderado';
  return 'Alto risco / churn iminente';
}

export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff >= 5) return 'up';
  if (diff <= -5) return 'down';
  return 'stable';
}
