// V-010 §9: local, immediate help only. Seguridad/BFF remain the authority (V-010-OPEN-01
// keeps exact limits open), so these rules never replace the server's 400 response.
export type DeliveryAddressField = "label" | "street" | "district" | "province" | "department" | "reference" | "phone";
export type DeliveryAddressFieldErrors = Partial<Record<DeliveryAddressField, string>>;
export type DeliveryAddressDraft = Record<DeliveryAddressField, string>;

export const emptyAddressDraft: DeliveryAddressDraft = {
  label: "", street: "", department: "", province: "", district: "", reference: "", phone: "",
};

export const addressFieldOrder: DeliveryAddressField[] = [
  "label", "street", "department", "province", "district", "reference", "phone",
];

export const addressFieldLimits: Record<DeliveryAddressField, number> = {
  label: 40, street: 180, department: 60, province: 60, district: 60, reference: 120, phone: 15,
};

const requiredMessages: Partial<Record<DeliveryAddressField, string>> = {
  street: "Ingresa la dirección.",
  department: "Ingresa el departamento.",
  province: "Ingresa la provincia.",
  district: "Ingresa el distrito.",
  phone: "Ingresa un teléfono de contacto.",
};

export function validateAddressField(field: DeliveryAddressField, value: string): string | undefined {
  const trimmed = value.trim();
  const required = requiredMessages[field];
  if (!trimmed) return required;
  if (trimmed.length > addressFieldLimits[field]) return `Usa como máximo ${addressFieldLimits[field]} caracteres.`;
  if (field === "phone") {
    const digits = trimmed.replace(/[\s-]/g, "");
    if (!/^\+?\d{6,15}$/.test(digits)) return "Usa solo números, entre 6 y 15 dígitos. Ejemplo: 987654321.";
  }
  if (["department", "province", "district"].includes(field) && /\d/.test(trimmed)) {
    return "Usa solo letras para la ubicación.";
  }
  return undefined;
}

export function validateAddressDraft(draft: DeliveryAddressDraft): DeliveryAddressFieldErrors {
  const errors: DeliveryAddressFieldErrors = {};
  for (const field of addressFieldOrder) {
    const error = validateAddressField(field, draft[field]);
    if (error) errors[field] = error;
  }
  return errors;
}

export function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length <= 3 ? "•••" : `••• ••• ${digits.slice(-3)}`;
}
