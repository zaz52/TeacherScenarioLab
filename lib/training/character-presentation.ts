export interface PresentableCharacter {
  id: string;
  name: string;
  role: string;
}
export function characterRole(character: PresentableCharacter): string {
  return character.id.startsWith('doctor-')
    ? 'doctor'
    : ['student', 'parent', 'teacher', 'principal'].includes(character.role)
      ? character.role
      : 'other';
}
export function characterLabel(
  character: PresentableCharacter,
  t: (key: string) => string,
  customNames: Readonly<Record<string, string>> = {},
): string {
  const role = t(`teacherlab.simulation.roles.${characterRole(character)}`);
  const name = customNames[character.id]?.trim();
  return name ? `${role} · ${name}` : role;
}
export function characterAvatar(character: PresentableCharacter): string {
  return (
    {
      student: '/avatars/curious.png',
      parent: '/avatars/user.png',
      teacher: '/avatars/teacher.png',
      doctor: '/avatars/instructor.png',
      principal: '/avatars/scholar.svg',
      other: '/avatars/assist.png',
    } as Record<string, string>
  )[characterRole(character)];
}
