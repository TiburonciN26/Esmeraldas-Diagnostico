// Botón reutilizable. variant: 'primary' | 'ghost' | 'danger'.
export default function Button({
  variant = 'primary',
  size,
  icon = false,
  className = '',
  children,
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' ? 'btn--sm' : '',
    icon ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
