"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "../brand-logo";
import { useAppAuth } from "../providers";

const BRAZIL_STATES = [
  { uf: "AC", name: "Acre" },
  { uf: "AL", name: "Alagoas" },
  { uf: "AP", name: "Amapá" },
  { uf: "AM", name: "Amazonas" },
  { uf: "BA", name: "Bahia" },
  { uf: "CE", name: "Ceará" },
  { uf: "DF", name: "Distrito Federal" },
  { uf: "ES", name: "Espírito Santo" },
  { uf: "GO", name: "Goiás" },
  { uf: "MA", name: "Maranhão" },
  { uf: "MT", name: "Mato Grosso" },
  { uf: "MS", name: "Mato Grosso do Sul" },
  { uf: "MG", name: "Minas Gerais" },
  { uf: "PA", name: "Pará" },
  { uf: "PB", name: "Paraíba" },
  { uf: "PR", name: "Paraná" },
  { uf: "PE", name: "Pernambuco" },
  { uf: "PI", name: "Piauí" },
  { uf: "RJ", name: "Rio de Janeiro" },
  { uf: "RN", name: "Rio Grande do Norte" },
  { uf: "RS", name: "Rio Grande do Sul" },
  { uf: "RO", name: "Rondônia" },
  { uf: "RR", name: "Roraima" },
  { uf: "SC", name: "Santa Catarina" },
  { uf: "SP", name: "São Paulo" },
  { uf: "SE", name: "Sergipe" },
  { uf: "TO", name: "Tocantins" },
];

// Cidades por estado (base compacta — estados com mais igrejas primeiro)
const CITIES_BY_STATE: Record<string, string[]> = {
  SP: [
    "São Paulo",
    "Campinas",
    "Santos",
    "São Bernardo do Campo",
    "Osasco",
    "Ribeirão Preto",
    "Sorocaba",
    "São José dos Campos",
    "Curitiba",
    "Barueri",
    "Campina Grande",
  ],
  MG: [
    "Belo Horizonte",
    "Uberlândia",
    "Juiz de Fora",
    "Betim",
    "Montes Claros",
    "Ribeirão das Neves",
    "Uberaba",
    "Governador Valadares",
    "Contagem",
    "Lagoa Santa",
  ],
  RJ: [
    "Rio de Janeiro",
    "São João de Meriti",
    "Nova Iguaçu",
    "Niterói",
    "Duque de Caxias",
    "Belford Roxo",
    "São Gonçalo",
    "Magé",
    "Itaboraí",
    "Mesquita",
  ],
  RS: [
    "Porto Alegre",
    "Caxias do Sul",
    "Pelotas",
    "Canoas",
    "Santa Maria",
    "Gravataí",
    "Viamão",
    "Novo Hamburgo",
    "São Leopoldo",
    "Rio Grande",
  ],
  BA: [
    "Salvador",
    "Feira de Santana",
    "Vitória da Conquista",
    "Camaçari",
    "Itabuna",
    "Jequié",
    "Teixeira de Freitas",
    "Lençóis",
    "Valença",
    "Salinas da Margarida",
  ],
  PR: [
    "Curitiba",
    "Londrina",
    "Maringá",
    "Ponta Grossa",
    "Cascavel",
    "São José dos Pinhais",
    "Foz do Iguaçu",
    "Colombo",
    "Guarapuava",
    "Paranaguá",
  ],
  CE: [
    "Fortaleza",
    "Caucaia",
    "Juazeiro do Norte",
    "Maracanaú",
    "Sobral",
    "Crato",
    "Itapipoca",
    "Macapá",
    "Tabatinga",
    "Irakema",
  ],
  PE: [
    "Recife",
    "Jaboatão dos Guararapes",
    "Olinda",
    "Caruaru",
    "Petrolina",
    "Paulista",
    "Camaragibe",
    "Garanhuns",
    "Vitória de Santo Antão",
    "Igarassu",
  ],
  SC: [
    "Florianópolis",
    "Joinville",
    "Blumenau",
    "São José",
    "Chapecó",
    "Criciúma",
    "Itajaí",
    "Jaraguá do Sul",
    "Tubarão",
    "Lages",
  ],
  GO: [
    "Goiânia",
    "Anápolis",
    "Senador Canedo",
    "Abadia de Goiás",
    "Aparecida de Goiânia",
    "Goianésia",
    "Goianira",
    "Nova Veneza",
    "Sírio",
    "Trindade",
  ],
  AM: [
    "Manaus",
    "Parintins",
    "Itacoatiara",
    "Manicoré",
    "Mauá",
    "Novo Airão",
    "Tefé",
    "Tabatinga",
    "Lábrea",
    "Autazes",
  ],
  PA: [
    "Belém",
    "Ananindeua",
    "Santarém",
    "Marabá",
    "Parauapebas",
    "Castanhal",
    "Altamira",
    "Cametá",
    "Bragança",
    "Baião",
  ],
  MA: [
    "São Luís",
    "Imperatriz",
    "São José de Ribamar",
    "Timon",
    "Caxias",
    "Codó",
    "Paço do Lumiar",
    "Açailândia",
    "Bacabal",
    "Balsas",
  ],
  PB: [
    "João Pessoa",
    "Campina Grande",
    "Santa Rita",
    "Bayeux",
    "Soluânia",
    "Cabedelo",
    "Guarabira",
    "Mamanguape",
    "Patos",
    "Itaporanga",
  ],
  RN: [
    "Natal",
    "Mossoró",
    "Parnamirim",
    "São Gonçalo do Amarante",
    "Ceará-Mirim",
    "Currais Novos",
    "Doutor Severiano",
    "Assu",
    "Caicó",
    "Pendências",
  ],
  PI: [
    "Teresina",
    "Parnaíba",
    "Picos",
    "Piripiri",
    "Floriano",
    "Baliza",
    "Altos",
    "Campo Maior",
    "Oeiras",
    "Luís Corrêa",
  ],
  MS: [
    "Campo Grande",
    "Dourados",
    "Três Lagoas",
    "Corumbá",
    "Ponta Porã",
    "Naviraí",
    "Nova Andradina",
    "Paranaíba",
    "Sidrolândia",
    "Coxim",
  ],
  MT: [
    "Cuiabá",
    "Várzea Grande",
    "Rondonópolis",
    "Sinop",
    "Tangará da Serra",
    "Cáceres",
    "Sorriso",
    "Luciara",
    "Nova Mutum",
    "Barra do Garças",
  ],
  DF: [
    "Brasília",
    "Ceilândia",
    "Samambaia",
    "Planaltina",
    "Taguatinga",
    "Recanto das Emas",
    "Lago Norte",
    "Lago Sul",
    "Núcleo Bandeirante",
    "Santa Maria",
  ],
  SE: [
    "Aracaju",
    "Lagarto",
    "Itabaiana",
    "Estância",
    "São Cristóvão",
    "Nossa Senhora do Socorro",
    "Tobias Barreto",
    "Simão Dias",
    "Boquim",
    "Canindé de São Francisco",
  ],
  AL: [
    "Maceió",
    "Arapiraca",
    "Rio Largo",
    "Penedo",
    "União dos Palmares",
    "Palmeira dos Índios",
    "São Miguel dos Campos",
    "Matriz de Camaragibe",
    "Murici",
    "Porto de Pedras",
  ],
  ES: [
    "Vitória",
    "Vila Velha",
    "Serra",
    "Cariacica",
    "Domingos Martins",
    "Linhares",
    "São Mateus",
    "Guarapari",
    "Aracruz",
    "Capanema",
  ],
  AP: [
    "Macapá",
    "Santana",
    "Laranjal do Jari",
    "Oiapoque",
    "Mazagão",
    "Porto Grande",
    "Pedra Branca do Amapari",
    "Itaubal",
    "Vitória do Jari",
    "Tartarugalzinho",
  ],
  RO: [
    "Porto Velho",
    "Ji-Paraná",
    "Ariquemes",
    "Vilhena",
    "Cacoal",
    "Rolim de Moura",
    "Jaru",
    "Machadinho d'Oeste",
    "Buritis",
    "Guajará-Mirim",
  ],
  RR: [
    "Boa Vista",
    "Rorainópolis",
    "Caracaraí",
    "Mucajaí",
    "Bonfim",
    "Cantá",
    "Alto Alegre",
    "Pacaraima",
    "Normandia",
    "São João da Baliza",
  ],
  TO: [
    "Palmas",
    "Araguaína",
    "Gurupi",
    "Porto Nacional",
    "Paraíso do Tocantins",
    "Colinas do Tocantins",
    "Guaraí",
    "Dianópolis",
    "Miracema do Tocantins",
    "Aguiarnópolis",
  ],
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * (len + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

function isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(digits[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

function isValidTaxId(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

// Regras mínimas: 8+ caracteres, letra e número, sem tudo igual e sem
// sequência óbvia (12345678, abcdefgh) — não é força bruta-proof, mas
// barra as senhas mais comuns/fracas sem irritar demais o usuário.
function passwordIssue(password: string): string | null {
  if (password.length < 8)
    return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password))
    return "A senha precisa ter letras e números.";
  if (/^(.)\1+$/.test(password))
    return "A senha não pode ser um caractere repetido.";
  const lower = password.toLowerCase();
  const sequences = [
    "01234567",
    "12345678",
    "23456789",
    "abcdefgh",
    "bcdefghi",
    "qwertyui",
    "senha123",
    "12345678",
  ];
  if (sequences.some((seq) => lower.includes(seq)))
    return "Essa senha é fácil demais de adivinhar. Escolha outra.";
  return null;
}

// Lookup CEP na ViaCEP (gratuito, sem key)
async function fetchAddressByCep(cep: string) {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      erro?: boolean;
    };
    if (data.erro) return null;
    return {
      address: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}

export default function SignupPage() {
  const { configured, firebaseConfig, switchOrganization } = useAppAuth();
  const router = useRouter();

  const [churchName, setChurchName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [taxId, setTaxId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [taxIdType, setTaxIdType] = useState<"cpf" | "cnpj" | null>(null);

  // Quando estado muda, carrega cidades disponíveis
  useEffect(() => {
    if (state) {
      setAvailableCities(CITIES_BY_STATE[state] || []);
      if (!CITIES_BY_STATE[state]?.includes(city)) {
        setCity("");
      }
    } else {
      setAvailableCities([]);
      setCity("");
    }
  }, [state]);

  // CEP auto-complete
  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    fetchAddressByCep(cep)
      .then((data) => {
        setCepLoading(false);
        if (data) {
          setAddress(data.address);
          setNeighborhood(data.neighborhood);
          if (data.city && data.state) {
            setCity(data.city);
            setState(data.state);
          }
        }
      })
      .catch(() => {
        setCepLoading(false);
      });
  }, [cep]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setError("Firebase não configurado.");
      return;
    }
    if (
      !churchName.trim() ||
      !adminName.trim() ||
      !email.trim() ||
      !city.trim() ||
      !state
    ) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!cep || cep.replace(/\D/g, "").length !== 8) {
      setError("Digite um CEP válido (8 dígitos).");
      return;
    }
    if (!isValidTaxId(taxId)) {
      const type = taxIdType === "cpf" ? "CPF" : "CNPJ";
      setError(
        `Digite um ${type} válido (do responsável, se a igreja ainda não tiver CNPJ).`,
      );
      return;
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) {
      setError(pwIssue);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const sdk = await import("@alvo/firebase");
      const credential = await sdk.registerWithFirebaseEmailPassword({
        config: firebaseConfig,
        email: email.trim(),
        password,
        displayName: adminName.trim(),
      });

      const baseSlug = slugify(churchName) || "igreja";
      const organizationId = `org_${baseSlug}_${credential.user.uid.slice(0, 6)}`;

      await sdk.provisionSelfServeOrganization(firebaseConfig, {
        organizationId,
        churchName: churchName.trim(),
        ownerUid: credential.user.uid,
        ownerEmail: email.trim(),
        taxId: taxId.replace(/\D/g, ""),
        addressCity: city.trim(),
        addressState: state,
      });

      sdk
        .claimOrganizationSlug(firebaseConfig, {
          slug: baseSlug,
          organizationId,
          displayName: churchName.trim(),
        })
        .catch(() => {
          // Best-effort: se o slug já estiver em uso por outra igreja, o
          // formulário público simplesmente não fica disponível ainda —
          // não deve travar o cadastro.
        });

      switchOrganization(organizationId);
      router.replace("/");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? translateFirebaseError(nextError.message)
          : "Não foi possível criar sua conta. Tente novamente.",
      );
      setIsSubmitting(false);
    }
  }

  const isCnpj = taxId.replace(/\D/g, "").length === 14;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <BrandLogo size={56} iconOnly />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Criar sua conta
          </h1>
          <p style={{ color: "#6b7280", marginTop: 6, fontSize: 14 }}>
            Grátis até 100 membros. Sem cartão de crédito.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gap: 12,
            padding: 20,
            borderRadius: 20,
            background: "#fffdf8",
            border: "1px solid rgba(31, 41, 55, 0.12)",
          }}
        >
          <label style={labelStyle}>
            Nome da igreja
            <input
              type="text"
              value={churchName}
              onChange={(e) => setChurchName(e.target.value)}
              style={inputStyle}
              placeholder="Ex: Assembleia de Deus Central"
              autoComplete="organization"
              required
            />
          </label>

          <label style={labelStyle}>
            CEP
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(maskCep(e.target.value))}
                style={{ ...inputStyle, flex: 1 }}
                placeholder="00000-000"
                autoComplete="postal-code"
                maxLength={9}
                required
              />
              {cepLoading && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: 12,
                    color: "#f97316",
                  }}
                >
                  Buscando...
                </span>
              )}
            </div>
            {address && (
              <span style={{ fontSize: 11, color: "#16a34a" }}>
                ✓ {address}
                {neighborhood ? `, ${neighborhood}` : ""}
              </span>
            )}
          </label>

          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <label style={labelStyle}>
              Cidade
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={inputStyle}
                required
                disabled={availableCities.length === 0}
              >
                <option value="">UF primeiro</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              Estado
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">UF</option>
                {BRAZIL_STATES.map((uf) => (
                  <option key={uf.uf} value={uf.uf}>
                    {uf.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={labelStyle}>
            CNPJ da igreja (se tiver) ou CPF do responsável
            <input
              type="text"
              value={taxId}
              onChange={(e) => {
                const val = e.target.value;
                setTaxId(isCnpj ? maskCnpj(val) : maskCpf(val));
                setTaxIdType(
                  val.replace(/\D/g, "").length >= 14 ? "cnpj" : "cpf",
                );
              }}
              style={inputStyle}
              placeholder={isCnpj ? "00.000.000/0000-00" : "000.000.000-00"}
              required
            />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {isCnpj ? "CNPJ" : "CPF"} do responsável pela igreja
            </span>
          </label>

          <label style={labelStyle}>
            Seu nome
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              style={inputStyle}
              autoComplete="name"
              required
            />
          </label>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              autoComplete="email"
              required
            />
          </label>
          <label style={labelStyle}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Mínimo 8 caracteres, com letras e números.
            </span>
          </label>

          <button
            type="submit"
            style={buttonStyle}
            disabled={isSubmitting || !configured}
          >
            {isSubmitting ? "Criando conta..." : "Criar conta gratuita"}
          </button>

          {error && <p style={errorStyle}>{error}</p>}
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "#6b7280",
            marginTop: 16,
          }}
        >
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "#f97316", fontWeight: 600 }}>
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}

function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function translateFirebaseError(message: string): string {
  if (message.includes("email-already-in-use"))
    return "Este email já está cadastrado. Tente entrar.";
  if (message.includes("weak-password"))
    return "Senha muito fraca. Use letras e números, mínimo 8 caracteres.";
  if (message.includes("invalid-email")) return "Email inválido.";
  return "Não foi possível criar sua conta. Tente novamente.";
}

const labelStyle = {
  display: "grid",
  gap: 8,
  fontSize: 14,
  color: "#1f2937",
} as const;

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(31, 41, 55, 0.16)",
  background: "#fffdf8",
  color: "#1f2937",
} as const;

const buttonStyle = {
  border: 0,
  borderRadius: 14,
  padding: "12px 16px",
  background: "#f97316",
  color: "#fffaf1",
  fontWeight: 700,
  cursor: "pointer",
  marginTop: 4,
} as const;

const errorStyle = {
  margin: "4px 0 0",
  color: "#b42318",
  fontSize: 13,
  lineHeight: 1.5,
} as const;
