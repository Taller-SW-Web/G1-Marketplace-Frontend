"use client";

// Called only after a failed submission, never while the person is editing.
export function focusFirstInvalid(form: HTMLFormElement) {
  window.requestAnimationFrame(() => {
    if (form.isConnected) form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}
