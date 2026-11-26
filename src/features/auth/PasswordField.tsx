"use client";
import { useState, type ComponentProps, type KeyboardEvent } from "react";
import { TextField } from "@/shared/ui/TextField";
export function PasswordField(props: Omit<ComponentProps<typeof TextField>, "type" | "endAdornment">) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const detectCapsLock = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState("CapsLock"));
  return <TextField {...props} type={visible ? "text" : "password"} maxLength={256}
    hint={capsLock ? <span className="field-caps-lock" role="status">Bloq Mayús está activado.</span> : props.hint}
    onKeyDown={event => { detectCapsLock(event); props.onKeyDown?.(event); }}
    onKeyUp={event => { detectCapsLock(event); props.onKeyUp?.(event); }}
    onBlur={event => { setCapsLock(false); props.onBlur?.(event); }}
    endAdornment={<button className="auth-toggle" type="button" disabled={props.disabled} onClick={() => setVisible(value => !value)}
      aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.label.toLowerCase()}`}>{visible ? "Ocultar" : "Mostrar"}</button>} />;
}
