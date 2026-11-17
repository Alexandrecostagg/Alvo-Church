export const PROFILE_INTERESTS = {
  louvor: "Louvor e adoração",
  ensino: "Ensino e discipulado",
  recepcao: "Recepção e acolhimento",
  kids: "Ministério infantil",
  midia: "Mídia e comunicação",
  administracao: "Administração",
  intercessao: "Intercessão e oração",
  missoes: "Missões e evangelismo",
  cuidado: "Cuidado pastoral",
  jovens: "Ministério de jovens",
};
export const PROFILE_SERVING = {
  leading: "Liderando pessoas",
  teaching: "Ensinando",
  creating: "Criando",
  caring: "Cuidando",
  organizing: "Organizando",
  interceding: "Orando",
};
export const PROFILE_DAYS = {
  seg: "Segunda",
  ter: "Terça",
  qua: "Quarta",
  qui: "Quinta",
  sex: "Sexta",
  sab: "Sábado",
  dom: "Domingo",
};
export const PROFILE_EDUCATION = {
  not_informed: "Prefiro não informar",
  elementary: "Fundamental",
  high_school: "Médio",
  technical: "Técnico",
  undergraduate: "Superior",
  postgraduate: "Pós-graduação",
};
export const PROFILE_INCOME = {
  not_informed: "Prefiro não informar",
  up_to_1_minimum_wage: "Até 1 salário mínimo",
  one_to_3_minimum_wages: "1 a 3 salários mínimos",
  three_to_5_minimum_wages: "3 a 5 salários mínimos",
  five_to_10_minimum_wages: "5 a 10 salários mínimos",
  above_10_minimum_wages: "Acima de 10 salários mínimos",
};
export const ACCOUNT_ROLE_LABELS: Record<string, string> = {
  super_admin: "Superadministrador",
  church_admin: "Administrador",
  pastor: "Pastor",
  secretary: "Secretaria",
  group_leader: "Líder de célula",
  ministry_leader: "Líder de ministério",
  member: "Membro",
  volunteer: "Voluntário",
  network_admin: "Administrador de rede",
};
export type OwnProfileFields = {
  occupation: string;
  educationLevel: string;
  householdIncomeRange: string;
  ministerialInterests: string[];
  servingProfile: string;
  availability: string[];
};
export function validateOwnProfile(raw: unknown): OwnProfileFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Perfil inválido.");
  const p = raw as Record<string, unknown>;
  if (
    Object.keys(p).some(
      (k) =>
        ![
          "occupation",
          "educationLevel",
          "householdIncomeRange",
          "ministerialInterests",
          "servingProfile",
          "availability",
        ].includes(k),
    )
  )
    throw Error("O perfil contém campos que não podem ser alterados.");
  const choice = (v: unknown, options: object, fallback: string) => {
    if (v === undefined || v === "") return fallback;
    if (typeof v !== "string" || !Object.hasOwn(options, v))
      throw Error("Confira as opções do perfil.");
    return v;
  };
  const list = (v: unknown, options: object) => {
    if (
      !Array.isArray(v) ||
      v.length > Object.keys(options).length ||
      v.some((i) => typeof i !== "string" || !Object.hasOwn(options, i))
    )
      throw Error("Confira os interesses e dias selecionados.");
    return [...new Set(v)] as string[];
  };
  if (typeof p.occupation !== "string" || p.occupation.trim().length > 120)
    throw Error("Profissão deve ter até 120 caracteres.");
  return {
    occupation: p.occupation.trim(),
    educationLevel: choice(p.educationLevel, PROFILE_EDUCATION, "not_informed"),
    householdIncomeRange: choice(
      p.householdIncomeRange,
      PROFILE_INCOME,
      "not_informed",
    ),
    servingProfile: choice(p.servingProfile, PROFILE_SERVING, ""),
    ministerialInterests: list(p.ministerialInterests, PROFILE_INTERESTS),
    availability: list(p.availability, PROFILE_DAYS),
  };
}

/** Read old optional answers defensively; write validation remains strict. */
export function normalizeOwnProfile(
  raw: Record<string, unknown>,
): OwnProfileFields {
  const choice = (value: unknown, choices: object, fallback: string) =>
    typeof value === "string" && Object.hasOwn(choices, value)
      ? value
      : fallback;
  const list = (value: unknown, choices: object) =>
    Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (v): v is string =>
                typeof v === "string" && Object.hasOwn(choices, v),
            ),
          ),
        ]
      : [];
  return {
    occupation:
      typeof raw.occupation === "string" ? raw.occupation.slice(0, 120) : "",
    educationLevel: choice(
      raw.educationLevel,
      PROFILE_EDUCATION,
      "not_informed",
    ),
    householdIncomeRange: choice(
      raw.householdIncomeRange,
      PROFILE_INCOME,
      "not_informed",
    ),
    ministerialInterests: list(raw.ministerialInterests, PROFILE_INTERESTS),
    servingProfile: choice(raw.servingProfile, PROFILE_SERVING, ""),
    availability: list(raw.availability, PROFILE_DAYS),
  };
}
