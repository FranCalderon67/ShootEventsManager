// Shared utility — calculates shooter category based on genero, age and event date
const calcCategoria = (genero, fechaNacimiento, eventDate = new Date()) => {
  if (!genero || !fechaNacimiento) return 'General';
  if (genero === 'Femenino') return 'Lady';
  const birth = new Date(fechaNacimiento);
  const ref = new Date(eventDate);
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  if (age < 21) return 'Junior';
  if (age >= 70) return 'Grand Senior';
  if (age >= 65) return 'Super Senior';
  if (age >= 55) return 'Senior';
  return 'General';
};

module.exports = { calcCategoria };
