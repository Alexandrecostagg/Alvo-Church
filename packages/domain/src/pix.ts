/**
 * Generates a PIX BR Code payload (EMV QR Code Iniciador de Pagamento v2.6.1)
 * for static QR Codes (no payment provider required).
 */

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixPayload {
  key: string;
  receiverName: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

export function buildPixPayload({
  key,
  receiverName,
  city = "SAO PAULO",
  amount,
  txId = "***",
  description = "",
}: PixPayload): string {
  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const keyField = tlv("01", key);
  const descField = description ? tlv("02", description.slice(0, 72)) : "";
  const merchantAccountInfo = tlv("26", gui + keyField + descField);

  const amountField = amount != null
    ? tlv("54", amount.toFixed(2))
    : "";

  const nameClean = receiverName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 25);

  const cityClean = city
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 15);

  const addDataField = tlv("62", tlv("05", txId.slice(0, 25)));

  const payload =
    tlv("00", "01") +          // Payload format indicator
    tlv("01", "12") +          // Point of initiation: static (12) or dynamic (11)
    merchantAccountInfo +
    tlv("52", "0000") +        // Merchant category code
    tlv("53", "986") +         // Currency: BRL
    amountField +
    tlv("58", "BR") +          // Country
    tlv("59", nameClean) +     // Merchant name
    tlv("60", cityClean) +     // Merchant city
    addDataField +
    "6304";                    // CRC placeholder

  return payload + crc16(payload);
}
