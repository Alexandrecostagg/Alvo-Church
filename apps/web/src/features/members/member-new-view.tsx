"use client";

import Link from "next/link";
import { friendlyError } from "../../lib/friendly-error";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  isFirebaseWebRuntimeConfigured,
  saveFamilyMemberProfile,
  saveFamilyProfile,
  savePersonProfile,
  countOrgMembers,
  fetchPeople,
} from "@alvo/firebase";
import type { Family, FamilyMember, Person } from "@alvo/types";
import { useAppAuth } from "../../../app/providers";
import { usePlan } from "../../../contexts/PlanContext";
import { PLAN_LIMITS } from "@alvo/firebase";
import { birthDateError, daysInMonth, lookupCep } from "../../lib/member-form";
import { invalidateOrgDataCache } from "../../lib/org-data-cache";
import { saveLocalMemberProfile } from "../../lib/local-member-store";
import {
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  QrCode,
  Sparkles,
  Check,
  Loader2,
  Building,
  ArrowLeft,
  User,
  MapPin,
  HeartHandshake,
} from "lucide-react";

interface SavedMemberSummary {
  familyId?: string;
  fullName: string;
  memberCardCode?: string;
  personId: string;
}

const BRAZILIAN_STATES = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"],
  ["CE", "Ceará"], ["DF", "Distrito Federal"], ["ES", "Espírito Santo"], ["GO", "Goiás"],
  ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"], ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"],
  ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCep(value: string) {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function formatCpf(value: string) {
  const digits = digitsOnly(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (slice: string, factor: number) => {
    const total = [...slice].reduce((sum, digit, index) => sum + Number(digit) * (factor - index), 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(cpf.slice(0, 9), 10) === Number(cpf[9]) &&
    calculateDigit(cpf.slice(0, 10), 11) === Number(cpf[10])
  );
}


export function MemberNewView() {
  const { configured, user, organizationId, firebaseConfig } = useAppAuth();
  const { plan } = usePlan();
  const [status, setStatus] = useState<string | null>(null);
  const [lastSavedMember, setLastSavedMember] = useState<SavedMemberSummary | null>(null);

  // Uncontrolled to Controlled input states for dynamic Esdras Passe & address prefill
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [memberStatus, setMemberStatus] = useState("member");
  const [partnerBenefitsEnabled, setPartnerBenefitsEnabled] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const cepRequest = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => () => cepRequest.current?.abort(), []);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [cpf, setCpf] = useState("");

  const [address, setAddress] = useState({
    postalCode: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "",
    state: ""
  });

  function resetFormState(formElement: HTMLFormElement) {
    formElement.reset();
    setFirstName("");
    setLastName("");
    setMemberStatus("member");
    setPartnerBenefitsEnabled(false);
    setLgpdConsent(false);
    setBirthDay("");
    setBirthMonth("");
    setBirthYear("");
    setCpf("");
    setAddress({
      postalCode: "",
      street: "",
      number: "",
      complement: "",
      district: "",
      city: "",
      state: ""
    });
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanCep = digitsOnly(e.target.value).slice(0, 8);
    setAddress(prev => ({ ...prev, postalCode: formatCep(cleanCep) }));

    cepRequest.current?.abort();
    const request = new AbortController();
    cepRequest.current = request;
    setLoadingCep(false);
    setStatus(null);
    if (cleanCep.length === 8) {
      try {
        setLoadingCep(true);
        setStatus(null);
        const foundAddress = await lookupCep(cleanCep, request.signal);
        if (request.signal.aborted) return;
        setAddress(prev => ({ ...prev, ...foundAddress }));
        setStatus("✓ Endereço preenchido. Confira o número e o complemento.");
      } catch (error) {
        if (request.signal.aborted) return;
        setStatus("Não encontramos esse CEP. Você pode preencher o endereço manualmente.");
      } finally {
        if (!request.signal.aborted) setLoadingCep(false);
      }
    }
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    try {
      await saveMember(event);
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível salvar o membro. Tente novamente."));
      setLastSavedMember(null);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  async function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const fullName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName) {
      setStatus("Informe nome e sobrenome para criar o cadastro.");
      setLastSavedMember(null);
      return;
    }

    const birthError = birthDateError(birthDay, birthMonth, birthYear);
    if (birthError) {
      setStatus(birthError);
      setLastSavedMember(null);
      return;
    }

    const birthDate = birthYear
      ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
      : undefined;
    const normalizedCpf = digitsOnly(cpf);
    if (normalizedCpf && !isValidCpf(normalizedCpf)) {
      setStatus("O CPF informado parece inválido. Confira os números e tente novamente.");
      setLastSavedMember(null);
      return;
    }

    if (normalizedCpf && configured && user && isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      try {
        const people = await fetchPeople(firebaseConfig, { organizationId }, 1000);
        const existingPerson = people.find((item) => digitsOnly(item.cpf ?? "") === normalizedCpf);
        if (existingPerson) {
          setStatus(`Já existe um cadastro para este CPF: ${existingPerson.firstName} ${existingPerson.lastName}.`);
          setLastSavedMember(null);
          return;
        }
      } catch (error) {
        setStatus(friendlyError(error, "Não foi possível conferir o CPF agora. Tente novamente."));
        setLastSavedMember(null);
        return;
      }
    }

    // Verificação de limite de membros por plano
    const maxMembers = PLAN_LIMITS[plan].maxMembers;
    if (isFinite(maxMembers) && configured) {
      const currentCount = await countOrgMembers(firebaseConfig, { organizationId });
      if (currentCount >= maxMembers) {
        setStatus(
          `⚠️ Limite de ${maxMembers} membros do plano ${plan === "free" ? "Gratuito" : "Comunidade"} atingido. Faça upgrade em Configurações → Plano.`
        );
        setLastSavedMember(null);
        return;
      }
    }

    const familyName = getFormValue(form, "familyName");
    const familyId = familyName ? createId("family") : undefined;
    const personId = createId("person");

    const person: Person = {
      id: personId,
      organizationId,
      primaryFamilyId: familyId,
      firstName,
      lastName,
      preferredName: getFormValue(form, "preferredName") || undefined,
      email: getFormValue(form, "email") || undefined,
      mobilePhone: getFormValue(form, "mobilePhone") || undefined,
      whatsappPhone: getFormValue(form, "whatsappPhone") || undefined,
      birthDate,
      cpf: normalizedCpf || undefined,
      address,
      consentLgpdAt: lgpdConsent ? new Date().toISOString() : undefined,
      memberCardCode: partnerBenefitsEnabled
        ? `ESDRAS-${firstName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
        : undefined,
      partnerBenefitsEnabled,
      personType: getFormValue(form, "personType") as Person["personType"],
      memberStatus: memberStatus as Person["memberStatus"],
      status: "active",
    };
    const family: Family | undefined =
      familyId && familyName
        ? {
            id: familyId,
            organizationId,
            familyName,
            displayName: familyName,
            status: "active",
            address,
            notes: getFormValue(form, "familyNotes") || undefined
          }
        : undefined;
    const familyMember: FamilyMember | undefined =
      familyId && familyName
        ? {
            id: createId("family_member"),
            organizationId,
            familyId,
            personId,
            relationshipType: getFormValue(form, "relationshipType") as FamilyMember["relationshipType"],
            isPrimaryContact: Boolean(form.get("isPrimaryContact")),
            isFinancialResponsible: Boolean(form.get("isFinancialResponsible")),
            isLegalGuardian: Boolean(form.get("isLegalGuardian"))
          }
        : undefined;

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      saveLocalMemberProfile({ family, familyMember, person });
      setStatus(
        `✓ ${fullName} foi cadastrado neste dispositivo.`
      );
      setLastSavedMember({
        familyId,
        fullName,
        memberCardCode: person.memberCardCode,
        personId
      });
      resetFormState(formElement);
      return;
    }

    try {
      if (family && familyMember) {
        await saveFamilyProfile(firebaseConfig, { organizationId }, family);
        await saveFamilyMemberProfile(firebaseConfig, { organizationId }, familyMember);
      }

      await savePersonProfile(firebaseConfig, { organizationId }, person);
      invalidateOrgDataCache(organizationId);
      setStatus(
        familyId
          ? `✓ ${fullName} salvo com sucesso e vinculado à família ${familyName}.`
          : `✓ ${fullName} salvo com sucesso.`
      );
      setLastSavedMember({
        familyId,
        fullName,
        memberCardCode: person.memberCardCode,
        personId
      });
      
      resetFormState(formElement);
    } catch (error) {
      setStatus(friendlyError(error, "Não foi possível salvar o membro."));
      setLastSavedMember(null);
    }
  }

  // Provisional card code for real-time card visual preview
  const provisionalCardCode = useMemo(() => {
    if (!firstName) return "ESDRAS-XXX-0000";
    return `ESDRAS-${firstName.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}`;
  }, [firstName]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "member":
      case "leader":
        return "#10b981"; // Emerald
      case "visitor":
        return "#f59e0b"; // Amber
      case "new_believer":
        return "#3b82f6"; // Blue
      default:
        return "#8b5cf6"; // Purple
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "visitor": return "Visitante";
      case "congregant": return "Congregado";
      case "new_believer": return "Novo Convertido";
      case "member": return "Membro Ativo";
      case "leader": return "Líder / Pastor";
      case "volunteer": return "Voluntário";
      default: return "Membro";
    }
  };

  return (
    <main className="form-page member-new-page">
      <section className="form-hero">
        <Link className="back-link" href="/members">
          <ArrowLeft size={16} /> Voltar à base pastoral
        </Link>
        <p className="eyebrow">Secretaria & Cuidado Pastoral</p>
        <h1>Cadastro de Novo Membro</h1>
        <p>
          Preencha os dados administrativos do membro. Informações pessoais como
          dons ministeriais e disponibilidade serão completadas pelo próprio membro no app.
        </p>
      </section>

      <div className="form-page-layout">
        {/* Left: Input Form */}
        <form className="form-card" onSubmit={handleSubmit}>
          {/* Identificação */}
          <fieldset>
            <legend><User size={18} /> Identificação Básica</legend>
            <div className="input-group">
              <label>
                Nome *
                <input 
                  name="firstName" 
                  required 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ex: Alexandre"
                />
              </label>
              <label>
                Sobrenome *
                <input 
                  name="lastName" 
                  required 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ex: Costa"
                />
              </label>
            </div>
            <div className="input-group">
              <label>
                Nome preferido
                <input name="preferredName" placeholder="Como gosta de ser chamado" />
              </label>
              <label>
                Data de nascimento
                <div className="birth-date-selects">
                  <select aria-label="Dia de nascimento" value={birthDay} onChange={(e) => setBirthDay(e.target.value)}>
                    <option value="">Dia</option>
                    {Array.from({ length: daysInMonth(birthYear, birthMonth) }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={String(day)}>{day}</option>
                    ))}
                  </select>
                  <select aria-label="Mês de nascimento" value={birthMonth} onChange={(e) => { const month = e.target.value; setBirthMonth(month); if (Number(birthDay) > daysInMonth(birthYear, month)) setBirthDay(""); }}>
                    <option value="">Mês</option>
                    {MONTHS.map((month, index) => (
                      <option key={month} value={String(index + 1)}>{month}</option>
                    ))}
                  </select>
                  <select aria-label="Ano de nascimento" value={birthYear} onChange={(e) => { const year = e.target.value; setBirthYear(year); if (Number(birthDay) > daysInMonth(year, birthMonth)) setBirthDay(""); }}>
                    <option value="">Ano</option>
                    {Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index).map((year) => (
                      <option key={year} value={String(year)}>{year}</option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            <div className="input-group">
              <label>
                CPF
                <input
                  name="cpf"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </label>
              <label>
                Tipo de pessoa
                <select name="personType" defaultValue="adult">
                  <option value="adult">Adulto</option>
                  <option value="young_adult">Jovem Adulto</option>
                  <option value="teen">Adolescente</option>
                  <option value="child">Criança</option>
                </select>
              </label>
            </div>
          </fieldset>

          {/* Endereço & CEP API */}
          <fieldset>
            <legend><MapPin size={18} /> Endereço & Contato</legend>
            <div className="input-group">
              <label>
                E-mail
                <input name="email" type="email" placeholder="email@exemplo.com" />
              </label>
              <label>
                Celular
                <input name="mobilePhone" placeholder="(00) 00000-0000" />
              </label>
            </div>
            <div className="input-group">
              <label>
                WhatsApp
                <input name="whatsappPhone" placeholder="(00) 00000-0000" />
              </label>
              <label className="cep-label-wrapper">
                CEP
                <div className="cep-input-container">
                  <input 
                    name="postalCode" 
                    placeholder="00000-000" 
                    value={address.postalCode}
                    onChange={handleCepChange}
                  />
                  {loadingCep && <Loader2 size={16} className="spinner cep-spinner" />}
                </div>
              </label>
            </div>
            <div className="input-group-triple">
              <label className="span-2">
                Rua
                <input 
                  name="street" 
                  value={address.street}
                  onChange={(e) => setAddress(prev => ({ ...prev, street: e.target.value }))}
                />
              </label>
              <label>
                Número
                <input 
                  name="number" 
                  value={address.number}
                  onChange={(e) => setAddress(prev => ({ ...prev, number: e.target.value }))}
                />
              </label>
            </div>
            <div className="input-group-triple">
              <label>
                Complemento
                <input 
                  name="complement" 
                  value={address.complement}
                  onChange={(e) => setAddress(prev => ({ ...prev, complement: e.target.value }))}
                />
              </label>
              <label>
                Bairro
                <input 
                  name="district" 
                  value={address.district}
                  onChange={(e) => setAddress(prev => ({ ...prev, district: e.target.value }))}
                />
              </label>
              <label>
                Cidade
                <input 
                  name="city" 
                  value={address.city}
                  onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                />
              </label>
            </div>
            <label className="half-width">
              Estado
              <select
                name="state"
                value={address.state}
                onChange={(e) => setAddress(prev => ({ ...prev, state: e.target.value }))}
              >
                <option value="">Selecione o estado</option>
                {BRAZILIAN_STATES.map(([uf, name]) => (
                  <option key={uf} value={uf}>{uf} — {name}</option>
                ))}
              </select>
            </label>
          </fieldset>

          {/* Contexto Pastoral */}
          <fieldset>
            <legend><Building size={18} /> Contexto Pastoral & Família</legend>
            <div className="input-group">
              <label>
                Status Eclesiástico
                <select
                  name="memberStatus"
                  value={memberStatus}
                  onChange={(e) => setMemberStatus(e.target.value)}
                >
                  <option value="visitor">Visitante</option>
                  <option value="congregant">Congregado</option>
                  <option value="new_believer">Novo Convertido</option>
                  <option value="member">Membro Ativo</option>
                  <option value="leader">Líder / Pastor</option>
                  <option value="volunteer">Voluntário</option>
                </select>
              </label>
            </div>
            <div className="input-group">
              <label>
                Grupo Familiar (Nome da Família)
                <input name="familyName" placeholder="Ex: Família Costa" />
              </label>
              <label>
                Relação na Família
                <select name="relationshipType" defaultValue="self">
                  <option value="self">Própria pessoa</option>
                  <option value="spouse">Cônjuge</option>
                  <option value="child">Filho(a)</option>
                  <option value="parent">Responsável / Pai / Mãe</option>
                  <option value="sibling">Irmão(a)</option>
                  <option value="other">Outro vínculo</option>
                </select>
              </label>
            </div>
            <div className="checkbox-block">
              <label className="check-row">
                <input name="isPrimaryContact" type="checkbox" defaultChecked />
                Contato principal da família
              </label>
              <label className="check-row">
                <input name="isFinancialResponsible" type="checkbox" />
                Responsável financeiro da casa
              </label>
              <label className="check-row">
                <input name="isLegalGuardian" type="checkbox" />
                Responsável legal por menor
              </label>
            </div>
            <label className="wide">
              Observações da Família
              <textarea name="familyNotes" rows={3} placeholder="Notas adicionais sobre a dinâmica familiar..." />
            </label>
          </fieldset>

          {/* Privacidade & Esdras Passe */}
          <fieldset>
            <legend><HeartHandshake size={18} /> Privacidade & Esdras Passe</legend>
            <label className="check-row highlight-checkbox">
              <input 
                name="lgpdConsent" 
                type="checkbox" 
                checked={lgpdConsent}
                onChange={(e) => setLgpdConsent(e.target.checked)}
              />
              <span className="checkbox-text">Registrar Consentimento LGPD ativo</span>
            </label>
            <label className="check-row highlight-checkbox">
              <input 
                name="partnerBenefitsEnabled" 
                type="checkbox" 
                checked={partnerBenefitsEnabled}
                onChange={(e) => setPartnerBenefitsEnabled(e.target.checked)}
              />
              <span className="checkbox-text">Habilitar identificação Esdras Passe externa</span>
            </label>
          </fieldset>

          <div className="form-actions">
            <button className="primary-button submit-btn" type="submit" disabled={isSaving}>
              <Sparkles size={16} /> {isSaving ? "Salvando membro..." : "Salvar Membro na Base"}
            </button>
            {status && <p className="form-status">{status}</p>}
          </div>
        </form>

        {/* Right: Real-time Esdras Passe Preview & LGPD Terms */}
        <div className="preview-panel">
          {/* Card Preview Container */}
          <div className="pass-preview-wrapper">
            <h3 className="preview-title">Visualização do Esdras Passe</h3>
            <div className="digital-card" style={{ '--card-glow': getStatusColor(memberStatus) } as any}>
              <div className="card-mesh"></div>
              <div className="card-header">
                <span className="card-logo">⚡ ESDRAS</span>
                <span className="chip-badge">PASS</span>
              </div>
              
              <div className="card-body">
                <div className="avatar-preview">
                  {firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : <User size={24} />}
                </div>
                <div className="member-details">
                  <span className="member-name">
                    {firstName || lastName ? `${firstName} ${lastName}` : "Nome do Portador"}
                  </span>
                  <span className="member-status-badge" style={{ background: `${getStatusColor(memberStatus)}20`, color: getStatusColor(memberStatus), border: `1px solid ${getStatusColor(memberStatus)}40` }}>
                    {getStatusLabel(memberStatus)}
                  </span>
                </div>
              </div>

              <div className="card-footer">
                <div className="card-code-section">
                  <span className="code-label">CÓDIGO DE BENEFÍCIO</span>
                  <span className="code-value">{partnerBenefitsEnabled ? provisionalCardCode : "BENEFÍCIO DESATIVADO"}</span>
                </div>
                <div className="card-qr">
                  {partnerBenefitsEnabled ? (
                    <QrCode size={40} className="qr-active" />
                  ) : (
                    <QrCode size={40} className="qr-disabled" />
                  )}
                </div>
              </div>

              {partnerBenefitsEnabled && (
                <div className="verified-banner">
                  <Check size={12} /> ELEGÍVEL A DESCONTOS
                </div>
              )}
            </div>
          </div>

          {/* LGPD Panel */}
          <div className="lgpd-info-card">
            <div className="lgpd-header">
              {lgpdConsent ? (
                <div className="compliance-badge compliant">
                  <ShieldCheck size={18} />
                  <span>CONFORME LGPD</span>
                </div>
              ) : (
                <div className="compliance-badge non-compliant">
                  <ShieldAlert size={18} />
                  <span>AGUARDANDO CONSENTIMENTO</span>
                </div>
              )}
            </div>
            <h4>Garantia de Privacidade Plataforma Esdras</h4>
            <div className="lgpd-terms-box">
              <p>
                <strong>Dados Protegidos:</strong> Os dados residenciais, financeiros (faixa de renda), de identificação civil (CPF) e históricos pastorais do membro permanecem estritamente blindados em nossos servidores internos sob conformidade legal.
              </p>
              <p>
                <strong>Identificação Esdras Passe:</strong> Lojas parceiras parceiras da comunidade têm autorização apenas para verificar a elegibilidade de desconto usando o código de benefício digital do Esdras Passe, sem qualquer visibilidade sobre informações pessoais ou pastorais.
              </p>
            </div>
          </div>

          {/* Confirmation Box (when saved) */}
          {lastSavedMember && (
            <div className="save-confirmation-glass">
              <div className="confirmation-header">
                <Sparkles size={20} className="gold-glow" />
                <div>
                  <p className="eyebrow">Salvo com Sucesso!</p>
                  <h2>{lastSavedMember.fullName}</h2>
                </div>
              </div>
              <p className="confirmation-summary">
                Cadastro concluído. A ficha já está disponível para a equipe da igreja.
              </p>
              <dl className="info-dl">
                <div>
                  <dt>Família vinculada</dt>
                  <dd>{lastSavedMember.familyId ? "Cadastro vinculado a uma família" : "Nenhum vínculo familiar"}</dd>
                </div>
                <div>
                  <dt>Esdras Passe</dt>
                  <dd className="esdras-pass-pill">
                    {lastSavedMember.memberCardCode ?? "Identificação externa inativa"}
                  </dd>
                </div>
              </dl>
              <div className="confirmation-actions">
                <Link
                  className="primary-button"
                  href={`/members/${lastSavedMember.personId}`}
                >
                  Abrir ficha completa
                </Link>
                <button
                  className="ghost-button"
                  onClick={() => {
                    setLastSavedMember(null);
                    setStatus("Pronto para cadastrar outra pessoa.");
                  }}
                  type="button"
                >
                  Cadastrar outro membro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .form-page {
          max-width: 1300px;
          margin: 0 auto;
          padding: 2.5rem;
          background: #0b0f19;
          color: #f8fafc;
          min-height: 100vh;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          margin-bottom: 2rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.875rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .back-link:hover {
          border-color: #f97316;
          color: white;
          background: rgba(249, 115, 22, 0.08);
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
        }

        .form-hero {
          margin-bottom: 3.5rem;
        }

        .eyebrow {
          font-size: 0.85rem;
          font-weight: 800;
          color: #f97316;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        h1 {
          font-size: 3rem;
          font-weight: 950;
          color: white;
          letter-spacing: -0.04em;
          margin-bottom: 1rem;
        }

        .form-hero p {
          font-size: 1.15rem;
          color: #94a3b8;
          max-width: 750px;
          line-height: 1.6;
        }

        .form-page-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 3rem;
          align-items: start;
        }

        .form-card {
          background: rgba(30, 41, 59, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          padding: 2.5rem;
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        fieldset {
          border: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        legend {
          font-size: 1.25rem;
          font-weight: 850;
          color: white;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          letter-spacing: -0.02em;
        }

        .input-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .input-group-triple {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          gap: 1.5rem;
        }

        .span-2 {
          grid-column: span 2;
        }

        label {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 700;
          color: #94a3b8;
        }

        input, select, textarea {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #0f172a;
          color: white;
          font-size: 0.95rem;
          outline: none;
          font-family: inherit;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        input:focus, select:focus, textarea:focus {
          border-color: #f97316;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.15);
        }

        .birth-date-selects {
          display: grid;
          grid-template-columns: 0.8fr 1.5fr 1fr;
          gap: 0.5rem;
        }

        .birth-date-selects select {
          min-width: 0;
        }

        .cep-label-wrapper {
          position: relative;
        }

        .cep-input-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cep-spinner {
          position: absolute;
          right: 1rem;
          color: #f97316;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .checkbox-block {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .check-row {
          flex-direction: row;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.9rem;
          color: #cbd5e1;
          cursor: pointer;
        }

        .check-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #f97316;
          cursor: pointer;
        }

        .highlight-checkbox {
          padding: 1rem 1.25rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1rem;
          transition: all 0.2s;
        }

        .highlight-checkbox:hover {
          border-color: rgba(249, 115, 22, 0.3);
          background: rgba(249, 115, 22, 0.02);
        }

        .checkbox-text {
          font-weight: 700;
        }

        .form-actions {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .submit-btn {
          padding: 1rem;
          font-size: 1.05rem;
          border-radius: 1rem;
          box-shadow: 0 4px 15px rgba(249, 115, 22, 0.2);
        }

        .primary-button {
          background: #f97316;
          color: white;
          border: none;
          font-weight: 800;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .primary-button:hover {
          background: #ea580c;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.35);
        }

        .form-status {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f97316;
          text-align: center;
        }

        /* Preview Panel Styles */
        .preview-panel {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: sticky;
          top: 2rem;
        }

        .preview-title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #cbd5e1;
          margin-bottom: 1rem;
          letter-spacing: -0.01em;
        }

        /* Digital Esdras Passe Card Design */
        .digital-card {
          position: relative;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.5rem;
          padding: 2rem;
          overflow: hidden;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3), 0 0 20px var(--card-glow);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          aspect-ratio: 1.58 / 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .digital-card::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -20%;
          width: 60%;
          height: 60%;
          background: radial-gradient(circle, var(--card-glow) 0%, transparent 70%);
          opacity: 0.15;
          pointer-events: none;
        }

        .card-mesh {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0);
          background-size: 12px 12px;
          pointer-events: none;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 2;
        }

        .card-logo {
          font-size: 1.1rem;
          font-weight: 950;
          letter-spacing: 0.05em;
          background: linear-gradient(to right, white, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .chip-badge {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 0.3rem 0.6rem;
          border-radius: 0.5rem;
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: white;
        }

        .card-body {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          z-index: 2;
        }

        .avatar-preview {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--card-glow);
          color: white;
          font-size: 1.5rem;
          font-weight: 900;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .member-details {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .member-name {
          font-size: 1.25rem;
          font-weight: 850;
          color: white;
          letter-spacing: -0.02em;
        }

        .member-status-badge {
          font-size: 0.75rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: 2rem;
          width: fit-content;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          z-index: 2;
        }

        .card-code-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .code-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.05em;
        }

        .code-value {
          font-family: monospace;
          font-size: 1.05rem;
          font-weight: 800;
          color: white;
          letter-spacing: 0.05em;
        }

        .card-qr {
          opacity: 0.8;
        }

        .qr-active {
          color: white;
          filter: drop-shadow(0 0 5px rgba(255,255,255,0.3));
        }

        .qr-disabled {
          color: #475569;
        }

        .verified-banner {
          position: absolute;
          bottom: 1rem;
          right: 5rem;
          font-size: 0.65rem;
          font-weight: 900;
          color: #10b981;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 0.2rem 0.5rem;
          border-radius: 0.375rem;
        }

        /* LGPD Card info */
        .lgpd-info-card {
          background: rgba(30, 41, 59, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 1.5rem;
          padding: 1.75rem;
        }

        .lgpd-header {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 1rem;
        }

        .compliance-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          border-radius: 2rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.03em;
        }

        .compliance-badge.compliant {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
        }

        .compliance-badge.non-compliant {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .lgpd-info-card h4 {
          font-size: 1.1rem;
          font-weight: 850;
          color: white;
          margin-bottom: 0.75rem;
        }

        .lgpd-terms-box {
          font-size: 0.875rem;
          line-height: 1.5;
          color: #94a3b8;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .lgpd-terms-box p strong {
          color: #cbd5e1;
        }

        /* Confirmation receipt styles */
        .save-confirmation-glass {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(30, 41, 59, 0.25) 100%);
          border: 1px solid rgba(249, 115, 22, 0.25);
          border-radius: 1.5rem;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 12px 30px rgba(249, 115, 22, 0.05);
          animation: float 3s ease-in-out infinite;
        }

        .confirmation-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .gold-glow {
          color: #f97316;
          filter: drop-shadow(0 0 8px rgba(249, 115, 22, 0.5));
        }

        .confirmation-header h2 {
          font-size: 1.5rem;
          font-weight: 900;
          color: white;
          letter-spacing: -0.02em;
        }

        .confirmation-summary {
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
        }

        .info-dl {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.15);
          padding: 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .info-dl div {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
        }

        .info-dl dt {
          color: #94a3b8;
          font-weight: 700;
        }

        .info-dl dd {
          color: white;
          font-weight: 800;
          font-family: monospace;
        }

        .esdras-pass-pill {
          color: #f97316 !important;
        }

        .confirmation-actions {
          display: flex;
          gap: 0.75rem;
        }

        .confirmation-actions .primary-button {
          flex: 1;
          padding: 0.75rem;
          border-radius: 0.75rem;
        }

        .ghost-button {
          flex: 1;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 0.75rem;
          color: #cbd5e1;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ghost-button:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: #cbd5e1;
          color: white;
        }

        .member-new-page {
          width: 100%;
          max-width: 1480px;
          margin: 0 auto;
          padding: 32px clamp(20px, 3vw, 44px) 56px;
          background:
            radial-gradient(circle at 8% 0%, rgba(37, 99, 235, 0.08), transparent 28%),
            radial-gradient(circle at 92% 0%, rgba(22, 163, 74, 0.10), transparent 24%),
            linear-gradient(180deg, #f8fafc 0%, #ffffff 42%, #f8fafc 100%);
          color: #111827;
        }

        .member-new-page .form-hero {
          max-width: none;
          margin: 0 0 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.10);
        }

        .member-new-page .back-link {
          min-height: 46px;
          margin-bottom: 24px;
          padding: 0 18px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 10px;
          background: #ffffff;
          color: #334155;
          box-shadow: 0 8px 22px -18px rgba(15, 23, 42, 0.50);
        }

        .member-new-page .eyebrow {
          color: #ea580c;
          font-size: 13px;
          letter-spacing: 0.16em;
        }

        .member-new-page h1 {
          max-width: 980px;
          margin: 10px 0 12px;
          color: #111827;
          font-size: clamp(44px, 4.5vw, 64px);
          line-height: 0.98;
          letter-spacing: 0;
        }

        .member-new-page .form-hero p:not(.eyebrow) {
          max-width: 980px;
          margin: 0;
          color: #1f2937;
          font-size: clamp(17px, 1.25vw, 20px);
          line-height: 1.55;
        }

        .member-new-page .form-page-layout {
          grid-template-columns: minmax(0, 1.08fr) minmax(360px, 0.92fr);
          gap: 20px;
        }

        .member-new-page .form-card,
        .member-new-page .preview-panel > div,
        .member-new-page .save-confirmation-glass {
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: rgba(255, 255, 255, 0.96);
          border-radius: 16px;
          box-shadow: 0 18px 44px -30px rgba(15, 23, 42, 0.45);
        }

        .member-new-page .form-card {
          width: 100%;
          padding: 28px;
          gap: 28px;
        }

        .member-new-page fieldset {
          gap: 16px;
          padding-bottom: 24px;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
        }

        .member-new-page fieldset:last-of-type {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .member-new-page legend {
          color: #111827;
          font-size: 22px;
          line-height: 1.15;
          letter-spacing: 0;
        }

        .member-new-page label {
          color: #1f2937;
          font-size: 15px;
          font-weight: 800;
        }

        .member-new-page input,
        .member-new-page select,
        .member-new-page textarea {
          min-height: 48px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          border-radius: 10px;
          background: #f8fafc;
          color: #111827;
          font-size: 15px;
          box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.02);
        }

        .member-new-page input:focus,
        .member-new-page select:focus,
        .member-new-page textarea:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.14);
        }

        .member-new-page .check-row {
          color: #334155;
        }

        .member-new-page .highlight-checkbox {
          border-color: rgba(15, 23, 42, 0.10);
          background: #f8fafc;
          border-radius: 14px;
        }

        .member-new-page .form-status {
          padding: 12px 14px;
          border: 1px solid rgba(37, 99, 235, 0.14);
          border-radius: 12px;
          background: #eff6ff;
          color: #1d4ed8;
          text-align: left;
          line-height: 1.45;
        }

        .member-new-page .submit-btn {
          min-height: 52px;
          border-radius: 10px;
          background: #ea580c;
          color: #ffffff;
          box-shadow: 0 12px 24px -16px rgba(234, 88, 12, 0.70);
        }

        .member-new-page .preview-panel {
          gap: 20px;
          top: 24px;
        }

        .member-new-page .pass-preview-wrapper,
        .member-new-page .lgpd-info-card,
        .member-new-page .save-confirmation-glass {
          padding: 24px;
        }

        .member-new-page .preview-title,
        .member-new-page .lgpd-info-card h4,
        .member-new-page .confirmation-header h2 {
          color: #111827;
        }

        .member-new-page .digital-card {
          border: 1px solid rgba(15, 23, 42, 0.12);
          background:
            radial-gradient(circle at 0% 0%, rgba(234, 88, 12, 0.22), transparent 32%),
            linear-gradient(135deg, #111827 0%, #243043 100%);
          box-shadow: 0 18px 44px -28px rgba(15, 23, 42, 0.75);
        }

        .member-new-page .lgpd-info-card {
          color: #475569;
        }

        .member-new-page .lgpd-terms-box {
          color: #475569;
        }

        .member-new-page .lgpd-terms-box p strong {
          color: #111827;
        }

        .member-new-page .save-confirmation-glass {
          animation: none;
        }

        .member-new-page .confirmation-summary,
        .member-new-page .info-dl dt {
          color: #475569;
        }

        .member-new-page .info-dl {
          border-color: rgba(15, 23, 42, 0.08);
          background: #f8fafc;
        }

        .member-new-page .info-dl dd {
          color: #111827;
        }

        .member-new-page .confirmation-actions .ghost-button {
          min-height: 44px;
          border: 1px solid rgba(15, 23, 42, 0.10);
          background: #ffffff;
          color: #334155;
        }

        /* Perfil Ministerial */
        .check-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .radio-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .check-grid-days {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .check-pill {
          flex-direction: row;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 10px;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
        }

        .check-pill:has(input:checked) {
          border-color: #ea580c;
          background: rgba(234,88,12,0.06);
          color: #c2410c;
          font-weight: 700;
        }

        .check-pill input {
          width: 16px;
          height: 16px;
          min-height: unset;
          padding: 0;
          accent-color: #ea580c;
          flex-shrink: 0;
        }

        .day-pill {
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border: 1px solid rgba(15,23,42,0.10);
          border-radius: 10px;
          background: #f8fafc;
          font-size: 13px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          min-width: 52px;
          text-align: center;
          transition: all 0.15s;
        }

        .day-pill:has(input:checked) {
          border-color: #ea580c;
          background: rgba(234,88,12,0.06);
          color: #c2410c;
        }

        .day-pill input {
          width: 16px;
          height: 16px;
          min-height: unset;
          padding: 0;
          accent-color: #ea580c;
        }

        @media (max-width: 1024px) {
          .member-new-page .form-page-layout {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .form-page-layout {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
          .preview-panel {
            position: relative;
            top: 0;
          }
        }

        @media (max-width: 768px) {
          .member-new-page {
            padding: 24px 16px 40px;
          }
          .member-new-page h1 {
            font-size: 42px;
          }
          .member-new-page .form-card,
          .member-new-page .pass-preview-wrapper,
          .member-new-page .lgpd-info-card,
          .member-new-page .save-confirmation-glass {
            padding: 20px;
          }
          .member-new-page .input-group,
          .member-new-page .input-group-triple {
            grid-template-columns: 1fr;
            gap: 14px;
          }
          .member-new-page .span-2 {
            grid-column: auto;
          }
          .form-page {
            padding: 1.5rem;
          }
          h1 {
            font-size: 2.25rem;
          }
          .form-card {
            padding: 1.5rem;
          }
          .input-group, .input-group-triple {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .span-2 {
            grid-column: auto;
          }
          .confirmation-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}

function getFormValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;
}
