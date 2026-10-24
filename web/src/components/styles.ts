// Class lists for the concept's pill buttons, shared by <button> and <a>.
const buttonBase =
  'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-full border px-4 text-[13.5px] font-medium ' +
  'whitespace-nowrap transition-colors duration-300 ease-io disabled:cursor-not-allowed disabled:opacity-40'

export const buttonStyles = {
  primary: `${buttonBase} border-blue bg-blue text-blue-ink hover:enabled:border-blue-pale hover:enabled:bg-blue-pale`,
  ghost: `${buttonBase} border-line-strong bg-transparent hover:enabled:border-fg`,
  danger: `${buttonBase} border-line-strong bg-transparent hover:enabled:border-error hover:enabled:text-error`,
}
