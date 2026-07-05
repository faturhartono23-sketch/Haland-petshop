export function buildInvoicePrefillFromSearchParams(searchParams: URLSearchParams) {
  return {
    customerId: searchParams.get('customerId') ?? '',
    appointmentId: searchParams.get('appointmentId') ?? '',
    medicalRecordId: searchParams.get('medicalRecordId') ?? '',
    petId: searchParams.get('petId') ?? '',
  };
}

export function buildMedicalRecordPrefillFromSearchParams(searchParams: URLSearchParams) {
  return {
    appointmentId: searchParams.get('appointmentId') ?? '',
  };
}
