import { AbstractControl, ValidationErrors } from '@angular/forms';

export function noSpaces(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').toString();

  const idx = v.indexOf(' ');
  if (idx !== -1) {
    return { noSpaces: true, spaceIndex: idx };
  }

  return null;
}
