"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  createFirebaseWebRuntimeConfigFromEnv,
  isFirebaseWebRuntimeConfigured,
  saveFamilyMemberProfile,
  saveFamilyProfile,
  savePersonProfile
} from "@alvo/firebase";
import type { Family, FamilyMember, Person } from "@alvo/types";
import { useAppAuth } from "../../providers";

const organizationId = "org_alvo_demo";

interface SavedMemberSummary {
  familyId?: string;
  fullName: string;
  memberCardCode?: string;
  personId: string;
}

export default function NewMemberPage() {
  const { configured, user } = useAppAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [lastSavedMember, setLastSavedMember] = useState<SavedMemberSummary | null>(null);

  const firebaseConfig = useMemo(
    () =>
      createFirebaseWebRuntimeConfigFromEnv({
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
          process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
          process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      }),
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const firstName = getFormValue(form, "firstName");
    const lastName = getFormValue(form, "lastName");
    const fullName = `${firstName} ${lastName}`.trim();

    if (!firstName || !lastName) {
      setStatus("Informe nome e sobrenome para criar o cadastro.");
      setLastSavedMember(null);
      return;
    }

    if (!configured || !user || !isFirebaseWebRuntimeConfigured(firebaseConfig)) {
      setStatus("Formulario pronto. Entre no Firebase para salvar este membro no Firestore.");
      setLastSavedMember(null);
      return;
    }

    const familyName = getFormValue(form, "familyName");
    const familyId = familyName ? createId("family") : undefined;
    const personId = createId("person");
    const address = {
      postalCode: getFormValue(form, "postalCode") || undefined,
      street: getFormValue(form, "street") || undefined,
      number: getFormValue(form, "number") || undefined,
      complement: getFormValue(form, "complement") || undefined,
      district: getFormValue(form, "district") || undefined,
      city: getFormValue(form, "city") || undefined,
      state: getFormValue(form, "state") || undefined,
      countryCode: "BR"
    };

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
      birthDate: getFormValue(form, "birthDate") || undefined,
      cpf: getFormValue(form, "cpf") || undefined,
      address,
      occupation: getFormValue(form, "occupation") || undefined,
      educationLevel: getFormValue(form, "educationLevel") as Person["educationLevel"],
      householdIncomeRange: getFormValue(
        form,
        "householdIncomeRange"
      ) as Person["householdIncomeRange"],
      consentLgpdAt: form.get("lgpdConsent") ? new Date().toISOString() : undefined,
      memberCardCode: form.get("partnerBenefitsEnabled")
        ? `GETRO-${firstName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`
        : undefined,
      partnerBenefitsEnabled: Boolean(form.get("partnerBenefitsEnabled")),
      personType: getFormValue(form, "personType") as Person["personType"],
      memberStatus: getFormValue(form, "memberStatus") as Person["memberStatus"],
      status: "active"
    };

    try {
      if (familyId && familyName) {
        const family: Family = {
          id: familyId,
          organizationId,
          familyName,
          displayName: familyName,
          status: "active",
          address,
          incomeRange: person.householdIncomeRange,
          notes: getFormValue(form, "familyNotes") || undefined
        };
        const familyMember: FamilyMember = {
          id: createId("family_member"),
          organizationId,
          familyId,
          personId,
          relationshipType: getFormValue(form, "relationshipType") as FamilyMember["relationshipType"],
          isPrimaryContact: Boolean(form.get("isPrimaryContact")),
          isFinancialResponsible: Boolean(form.get("isFinancialResponsible")),
          isLegalGuardian: Boolean(form.get("isLegalGuardian"))
        };

        await saveFamilyProfile(firebaseConfig, { organizationId }, family);
        await saveFamilyMemberProfile(firebaseConfig, { organizationId }, familyMember);
      }

      await savePersonProfile(firebaseConfig, { organizationId }, person);
      setStatus(
        familyId
          ? `${fullName} salvo em people/${personId} e vinculado a families/${familyId}.`
          : `${fullName} salvo em people/${personId}.`
      );
      setLastSavedMember({
        familyId,
        fullName,
        memberCardCode: person.memberCardCode,
        personId
      });
      formElement.reset();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Nao foi possivel salvar o membro.");
      setLastSavedMember(null);
    }
  }

  return (
    <main className="form-page">
      <section className="form-hero">
        <Link className="back-link" href="/">
          Voltar ao painel
        </Link>
        <p className="eyebrow">Cadastro operacional</p>
        <h1>Novo membro ou aspirante</h1>
        <p>
          Uma tela unica para secretaria, lideranca e portaria criarem o perfil completo
          da pessoa, vinculo familiar, consentimento LGPD e elegibilidade do Getro Pass.
        </p>
      </section>

      <form className="form-card form-grid" onSubmit={handleSubmit}>
        <fieldset>
          <legend>Identificacao</legend>
          <label>
            Nome
            <input name="firstName" required />
          </label>
          <label>
            Sobrenome
            <input name="lastName" required />
          </label>
          <label>
            Nome preferido
            <input name="preferredName" />
          </label>
          <label>
            Data de nascimento
            <input name="birthDate" type="date" />
          </label>
          <label>
            CPF
            <input name="cpf" placeholder="000.000.000-00" />
          </label>
          <label>
            Tipo de pessoa
            <select name="personType" defaultValue="adult">
              <option value="adult">Adulto</option>
              <option value="young_adult">Jovem adulto</option>
              <option value="teen">Adolescente</option>
              <option value="child">Crianca</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>Contato e endereco</legend>
          <label>
            E-mail
            <input name="email" type="email" />
          </label>
          <label>
            Celular
            <input name="mobilePhone" />
          </label>
          <label>
            WhatsApp
            <input name="whatsappPhone" />
          </label>
          <label>
            CEP
            <input name="postalCode" />
          </label>
          <label>
            Rua
            <input name="street" />
          </label>
          <label>
            Numero
            <input name="number" />
          </label>
          <label>
            Complemento
            <input name="complement" />
          </label>
          <label>
            Bairro
            <input name="district" />
          </label>
          <label>
            Cidade
            <input name="city" defaultValue="Belem" />
          </label>
          <label>
            Estado
            <input name="state" defaultValue="PA" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Contexto pastoral e familiar</legend>
          <label>
            Status
            <select name="memberStatus" defaultValue="member">
              <option value="visitor">Visitante</option>
              <option value="congregant">Congregado</option>
              <option value="new_believer">Novo convertido</option>
              <option value="member">Membro</option>
              <option value="leader">Lider</option>
              <option value="volunteer">Voluntario</option>
            </select>
          </label>
          <label>
            Profissao
            <input name="occupation" />
          </label>
          <label>
            Escolaridade
            <select name="educationLevel" defaultValue="not_informed">
              <option value="not_informed">Nao informado</option>
              <option value="elementary">Fundamental</option>
              <option value="high_school">Medio</option>
              <option value="technical">Tecnico</option>
              <option value="undergraduate">Superior</option>
              <option value="postgraduate">Pos-graduacao</option>
            </select>
          </label>
          <label>
            Faixa de renda familiar
            <select name="householdIncomeRange" defaultValue="not_informed">
              <option value="not_informed">Nao informado</option>
              <option value="up_to_1_minimum_wage">Ate 1 salario minimo</option>
              <option value="one_to_3_minimum_wages">1 a 3 salarios minimos</option>
              <option value="three_to_5_minimum_wages">3 a 5 salarios minimos</option>
              <option value="five_to_10_minimum_wages">5 a 10 salarios minimos</option>
              <option value="above_10_minimum_wages">Acima de 10 salarios minimos</option>
            </select>
          </label>
          <label>
            Grupo familiar
            <input name="familyName" placeholder="Familia Silva" />
          </label>
          <label>
            Relacao na familia
            <select name="relationshipType" defaultValue="self">
              <option value="self">Propria pessoa</option>
              <option value="spouse">Conjuge</option>
              <option value="child">Filho(a)</option>
              <option value="parent">Responsavel/pai/mae</option>
              <option value="sibling">Irmao(a)</option>
              <option value="other">Outro vinculo</option>
            </select>
          </label>
          <label className="check-row">
            <input name="isPrimaryContact" type="checkbox" defaultChecked />
            Contato principal da familia
          </label>
          <label className="check-row">
            <input name="isFinancialResponsible" type="checkbox" />
            Responsavel financeiro
          </label>
          <label className="check-row">
            <input name="isLegalGuardian" type="checkbox" />
            Responsavel legal por menor
          </label>
          <label className="wide">
            Observacoes da familia
            <textarea name="familyNotes" rows={4} />
          </label>
        </fieldset>

        <fieldset>
          <legend>Privacidade e Getro Pass</legend>
          <label className="check-row">
            <input name="lgpdConsent" type="checkbox" />
            Consentimento LGPD registrado
          </label>
          <label className="check-row">
            <input name="partnerBenefitsEnabled" type="checkbox" />
            Habilitar identificacao externa Getro Pass
          </label>
          <div className="form-note">
            O parceiro deve validar apenas o status do beneficio. CPF, renda, endereco e
            historico pastoral nao devem sair do ambiente da igreja.
          </div>
        </fieldset>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            Salvar membro
          </button>
          {status ? <p className="form-status">{status}</p> : null}
        </div>

        {lastSavedMember ? (
          <div className="save-confirmation">
            <div>
              <p className="eyebrow">Cadastro salvo</p>
              <h2>{lastSavedMember.fullName}</h2>
              <p>
                Perfil criado no Firestore e pronto para aparecer na base pastoral,
                nos filtros de familia e nas validacoes do Getro Pass.
              </p>
            </div>
            <dl>
              <div>
                <dt>Pessoa</dt>
                <dd>{lastSavedMember.personId}</dd>
              </div>
              <div>
                <dt>Familia</dt>
                <dd>{lastSavedMember.familyId ?? "sem familia vinculada"}</dd>
              </div>
              <div>
                <dt>Getro Pass</dt>
                <dd>{lastSavedMember.memberCardCode ?? "nao habilitado"}</dd>
              </div>
            </dl>
            <div className="confirmation-actions">
              <Link
                className="primary-button"
                href={`/members/${lastSavedMember.personId}`}
              >
                Abrir ficha completa
              </Link>
              <Link
                className="ghost-button"
                href={`/members?q=${encodeURIComponent(lastSavedMember.fullName)}`}
              >
                Ver na base
              </Link>
              <button
                className="ghost-button"
                onClick={() => {
                  setLastSavedMember(null);
                  setStatus("Pronto para cadastrar outra pessoa.");
                }}
                type="button"
              >
                Cadastrar outra pessoa
              </button>
            </div>
          </div>
        ) : null}
      </form>
    </main>
  );
}

function getFormValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function createId(prefix: string) {
  return `${prefix}_${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;
}
