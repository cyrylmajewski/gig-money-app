import type { CreditorKind } from '@/types/models';

export interface CreditorTemplate {
  kind: CreditorKind;
  subjectKey: string;
  bodyKey: string;
}

const CREDITOR_KINDS: CreditorKind[] = [
  'bank',
  'payday_lender',
  'landlord',
  'private_person',
  'employer',
  'other',
];

const templates: CreditorTemplate[] = CREDITOR_KINDS.map((kind) => ({
  kind,
  subjectKey: `creditorTemplates.${kind}.subject`,
  bodyKey: `creditorTemplates.${kind}.body`,
}));

export function getCreditorTemplates(): CreditorTemplate[] {
  return templates;
}

export function getTemplateForKind(kind: CreditorKind): CreditorTemplate {
  const template = templates.find((t) => t.kind === kind);
  if (!template) {
    throw new Error(`No creditor template found for kind: ${kind}`);
  }
  return template;
}
