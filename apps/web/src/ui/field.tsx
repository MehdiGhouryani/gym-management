import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type FieldState = 'default' | 'error' | 'success';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  state?: FieldState;
  htmlFor?: string;
  children: ReactNode;
}

/** قاب فیلد: برچسب، ورودی، و راهنما/خطا/موفقیت */
export function Field({ label, hint, state = 'default', htmlFor, children }: FieldProps) {
  const hintCls = state === 'error' ? 'u-hint u-hint--error' : state === 'success' ? 'u-hint u-hint--success' : 'u-hint';
  return (
    <div className="u-field">
      <label className="u-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? <div className={hintCls}>{hint}</div> : null}
    </div>
  );
}

function stateClass(state: FieldState) {
  return state === 'error' ? ' u-input--error' : state === 'success' ? ' u-input--success' : '';
}

export function Input({ state = 'default', ...rest }: InputHTMLAttributes<HTMLInputElement> & { state?: FieldState }) {
  return <input {...rest} className={`u-input${stateClass(state)} ${rest.className ?? ''}`.trim()} />;
}

export function Textarea({ state = 'default', ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { state?: FieldState }) {
  return <textarea {...rest} className={`u-input${stateClass(state)} ${rest.className ?? ''}`.trim()} />;
}

export function Select({ state = 'default', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { state?: FieldState }) {
  return (
    <select {...rest} className={`u-input${stateClass(state)} ${rest.className ?? ''}`.trim()}>
      {children}
    </select>
  );
}
