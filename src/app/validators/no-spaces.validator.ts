import { AbstractControl, ValidationErrors } from '@angular/forms';

export function noSpaces(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '') as string;
  if (v.includes(' ')) return { noSpaces: true };
  return null;
}
