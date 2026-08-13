export const MIN_PASSWORD_LENGTH = 8

export type PasswordErrors = {
  password?: string
  confirmation?: string
}

export function validateNewPassword(
  password: string,
  confirmation: string,
): PasswordErrors {
  const errors: PasswordErrors = {}
  if (!password) errors.password = "La nueva contraseña es obligatoria."
  else if (password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Usa al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (!confirmation) errors.confirmation = "Confirma tu nueva contraseña."
  else if (password !== confirmation)
    errors.confirmation = "Las contraseñas no coinciden."
  return errors
}
