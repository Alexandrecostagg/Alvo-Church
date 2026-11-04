export const COMPANY_FIELDS = [
  ["legalName", "Razão social", 180],
  ["taxId", "CPF/CNPJ do responsável ou da instituição", 20],
  ["contactEmail", "E-mail de contato", 254],
  ["contactPhone", "Telefone / WhatsApp", 40],
  ["website", "Site", 250],
  ["addressPostalCode", "CEP", 12],
  ["addressLine", "Logradouro", 180],
  ["addressNumber", "Número", 30],
  ["addressComplement", "Complemento", 120],
  ["addressNeighborhood", "Bairro", 100],
  ["addressCity", "Cidade", 100],
  ["addressState", "Estado (UF)", 2],
  ["addressSector", "Setor", 100],
  ["addressQuadra", "Quadra", 50],
  ["addressLote", "Lote", 50],
  ["addressReference", "Referência", 180],
] as const;

export type CompanyProfile = Record<(typeof COMPANY_FIELDS)[number][0], string>;
export const emptyCompanyProfile = () =>
  Object.fromEntries(
    COMPANY_FIELDS.map(([key]) => [key, ""]),
  ) as CompanyProfile;
