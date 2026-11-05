"use client";
import { useState, type ComponentProps } from "react";
import { TextField } from "@/shared/ui/TextField";
export function PasswordField(props: Omit<ComponentProps<typeof TextField>, "type" | "endAdornment">) {
  const [visible, setVisible] = useState(false);
  return <TextField {...props} type={visible ? "text" : "password"} maxLength={256}
    endAdornment={<button className="auth-toggle" type="button" disabled={props.disabled} onClick={() => setVisible(value => !value)}
      aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.label.toLowerCase()}`}>{visible ? "Ocultar" : "Mostrar"}</button>} />;
}
